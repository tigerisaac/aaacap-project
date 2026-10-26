import { describe, it, expect, vi } from 'vitest';
import { RevenueCatProvider, subscriptionSnapshot, type RevenueCatConfig } from '../src/cloud/revenuecat.js';
import { pilotEndDate } from '../src/cloud/service-access.js';

const now = Date.parse('2026-10-17T12:00:00Z');
const config: RevenueCatConfig = { applePublicKey: 'appl_synthetic', secretApiKey: 'synthetic-server-credential',
  webhookAuthorization: 'synthetic-webhook-authorization-only', entitlementId: 'shield_access', offeringId: 'default',
  monthlyProductId: 'shield_monthly', annualProductId: 'shield_annual', purchasesEnabled: false };
const date = (offset: number) => new Date(now + offset).toISOString();
const customer = '22fce9c6-5c0f-4c40-b600-73710aaad7a1';
function response(product = 'shield_monthly') {
  return { request_date_ms: now, subscriber: {
    entitlements: { shield_access: { product_identifier: product, expires_date: date(86400_000), grace_period_expires_date: null as string | null } },
    subscriptions: { [product]: { store: 'app_store', is_sandbox: false, expires_date: date(86400_000),
      grace_period_expires_date: null as string | null, refunded_at: null as string | null,
      unsubscribe_detected_at: null as string | null, billing_issues_detected_at: null as string | null, ownership_type: 'PURCHASED' } },
  } };
}
describe('RevenueCat authoritative subscription verification', () => {
  it.each(['shield_monthly', 'shield_annual'])('accepts an active App Store %s entitlement', product => {
    expect(subscriptionSnapshot(response(product), config, now)).toMatchObject({ active: true, productId: product, hasPurchased: true, willRenew: true });
  });
  it.each(['shield_monthly_trial', 'shield_annual_trial'])('verifies configured %s access without trusting trial claims from the client', product => {
    const trialConfig = { ...config, trialOfferingId: 'shield_week_trial',
      trialMonthlyProductId: 'shield_monthly_trial', trialAnnualProductId: 'shield_annual_trial' };
    expect(subscriptionSnapshot(response(product), config, now)).toMatchObject({ active: false, hasPurchased: false });
    expect(subscriptionSnapshot(response(product), trialConfig, now)).toMatchObject({ active: true, productId: product, hasPurchased: true });
    const body = response(product);
    body.subscriber.subscriptions[product]!.is_sandbox = true;
    expect(subscriptionSnapshot(body, trialConfig, now).active).toBe(false);
    expect(subscriptionSnapshot(body, trialConfig, now, true).active).toBe(true);
    body.subscriber.subscriptions[product]!.refunded_at = date(-1);
    expect(subscriptionSnapshot(body, trialConfig, now, true).active).toBe(false);
    expect(subscriptionSnapshot(response('unapproved_trial'), trialConfig, now).active).toBe(false);
  });
  it('preserves access after cancellation through the paid expiry, then expires without a new webhook', () => {
    const body = response(); body.subscriber.subscriptions.shield_monthly!.unsubscribe_detected_at = date(-1);
    expect(subscriptionSnapshot(body, config, now)).toMatchObject({ active: true, willRenew: false });
    body.subscriber.subscriptions.shield_monthly!.expires_date = date(-1);
    expect(subscriptionSnapshot(body, config, now).active).toBe(false);
  });
  it('requires matching grace evidence and rejects a refund even during grace', () => {
    const body = response(), entitlement = body.subscriber.entitlements.shield_access, subscription = body.subscriber.subscriptions.shield_monthly!;
    entitlement.expires_date = subscription.expires_date = date(-1000);
    subscription.grace_period_expires_date = date(5000); subscription.billing_issues_detected_at = date(-2000);
    expect(subscriptionSnapshot(body, config, now).active).toBe(false);
    entitlement.grace_period_expires_date = date(1000);
    expect(subscriptionSnapshot(body, config, now)).toMatchObject({ active: true, accessUntil: now + 1000, billingIssue: true });
    subscription.refunded_at = date(-500);
    expect(subscriptionSnapshot(body, config, now)).toMatchObject({ active: false, revoked: true });
  });
  it.each(['play_store', 'stripe', 'promotional', 'test_store'])('rejects %s store access', store => {
    const body = response(); body.subscriber.subscriptions.shield_monthly!.store = store;
    expect(subscriptionSnapshot(body, config, now)).toMatchObject({ active: false, hasPurchased: false });
  });
  it('keeps sandbox and Apple family sharing out of normal accounts', () => {
    const body = response(); body.subscriber.subscriptions.shield_monthly!.is_sandbox = true;
    expect(subscriptionSnapshot(body, config, now).active).toBe(false);
    expect(subscriptionSnapshot(body, config, now, true).active).toBe(true);
    body.subscriber.subscriptions.shield_monthly!.ownership_type = 'FAMILY_SHARED';
    expect(subscriptionSnapshot(body, config, now, true).active).toBe(false);
  });
  it('requires an allowed recurring product, entitlement and provider subscription', () => {
    expect(subscriptionSnapshot(response('other'), config, now).active).toBe(false);
    const body = response(); body.subscriber.subscriptions = {};
    expect(subscriptionSnapshot(body, config, now).active).toBe(false);
    const expiredEntitlement = response(); expiredEntitlement.subscriber.entitlements.shield_access.expires_date = date(-1);
    expect(subscriptionSnapshot(expiredEntitlement, config, now).active).toBe(false);
    expect(subscriptionSnapshot({ request_date_ms: now, subscriber: { entitlements: {}, subscriptions: {} } }, config, now).active).toBe(false);
  });
  it('fails closed for malformed or stale verification data without exposing provider data', () => {
    const body = response(); body.request_date_ms = now - 300_001;
    expect(() => subscriptionSnapshot(body, config, now)).toThrow('subscription_verification_unavailable');
    expect(() => subscriptionSnapshot({ privateData: 'sensitive' }, config, now)).toThrow('subscription_verification_unavailable');
  });
  it('uses a fixed authenticated endpoint, bounds the body, and sanitizes errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(response())));
    const provider = new RevenueCatProvider(config, () => now, fetcher);
    expect((await provider.subscriber(customer, false)).active).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(`https://api.revenuecat.com/v1/subscribers/${customer}`, expect.objectContaining({
      method: 'GET', redirect: 'error', signal: expect.any(AbortSignal), headers: expect.objectContaining({ authorization: `Bearer ${config.secretApiKey}` }),
    }));
    fetcher.mockResolvedValueOnce(new Response('x'.repeat(262_145)));
    await expect(provider.subscriber(customer, false)).rejects.toThrow('subscription_verification_unavailable');
    fetcher.mockRejectedValueOnce(new Error('private provider body'));
    await expect(provider.subscriber(customer, false)).rejects.toThrow('subscription_verification_unavailable');
    await expect(provider.subscriber('../another', false)).rejects.toThrow('subscription_verification_unavailable');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('retries failed customer erasure and accepts an already-erased profile', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValueOnce(new Response('', { status: 404 }));
    const provider = new RevenueCatProvider(config, () => now, fetcher);
    await expect(provider.deleteCustomer(customer)).rejects.toThrow('subscription_cleanup_unavailable');
    await provider.deleteCustomer(customer);
    expect(fetcher.mock.calls[1]![1]?.method).toBe('DELETE');
  });
  it('counts pilot time in calendar months and clamps month-end', () => {
    expect(new Date(pilotEndDate(Date.parse('2026-12-31T12:34:56Z'))).toISOString()).toBe('2027-02-28T12:34:56.000Z');
    expect(new Date(pilotEndDate(Date.parse('2027-12-31T12:34:56Z'))).toISOString()).toBe('2028-02-29T12:34:56.000Z');
  });
});
