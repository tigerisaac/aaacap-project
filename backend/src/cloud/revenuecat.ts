import { z } from 'zod';
import { HttpError } from '../auth.js';
import type { CloudConfig } from './config.js';

export type RevenueCatConfig = NonNullable<CloudConfig['REVENUECAT']>;
const date = z.string().datetime({ offset: true });
const nullableDate = date.nullable().optional();
const subscriberSchema = z.object({
  request_date_ms: z.number().int().positive(),
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({ product_identifier: z.string(), expires_date: nullableDate,
      grace_period_expires_date: nullableDate })),
    subscriptions: z.record(z.string(), z.object({ store: z.string(), is_sandbox: z.boolean(),
      expires_date: nullableDate, grace_period_expires_date: nullableDate, refunded_at: nullableDate,
      unsubscribe_detected_at: nullableDate, billing_issues_detected_at: nullableDate,
      ownership_type: z.string().optional() })),
  }),
});
export type SubscriptionSnapshot = {
  checkedAt: number; providerAt: number; expiresAt: number | null; accessUntil: number | null;
  productId: string | null; active: boolean; willRenew: boolean; billingIssue: boolean;
  sandbox: boolean; revoked: boolean; hasPurchased: boolean;
};
export interface SubscriptionProvider {
  subscriber(customerID: string, allowSandbox: boolean): Promise<SubscriptionSnapshot>;
  deleteCustomer(customerID: string): Promise<void>;
}

/** Only this server-to-server response can grant purchased access. SDK/webhook bodies never do. */
export function subscriptionSnapshot(value: unknown, config: RevenueCatConfig, now: number, allowSandbox = false): SubscriptionSnapshot {
  const parsed = subscriberSchema.safeParse(value);
  if (!parsed.success || Math.abs(parsed.data.request_date_ms - now) > 5 * 60_000) throw new HttpError(503, 'subscription_verification_unavailable');
  const { subscriber, request_date_ms: providerAt } = parsed.data;
  const products = [config.monthlyProductId, config.annualProductId];
  const isSupported = (s: typeof subscriber.subscriptions[string]) => s.store === 'app_store'
    && (!s.is_sandbox || allowSandbox) && s.ownership_type !== 'FAMILY_SHARED';
  const hasPurchased = products.some(id => subscriber.subscriptions[id] && isSupported(subscriber.subscriptions[id]!));
  const result: SubscriptionSnapshot = { checkedAt: now, providerAt, expiresAt: null, accessUntil: null, productId: null,
    active: false, willRenew: false, billingIssue: false, sandbox: false, revoked: false, hasPurchased };
  const entitlement = subscriber.entitlements[config.entitlementId];
  if (!entitlement || !products.includes(entitlement.product_identifier)) return result;
  const subscription = subscriber.subscriptions[entitlement.product_identifier];
  if (!subscription || !isSupported(subscription)) return result;
  // Lifetime/promotional and other-store entitlements do not unlock this recurring telephone service.
  if (!entitlement.expires_date || !subscription.expires_date) return result;
  const expiresAt = Math.min(Date.parse(entitlement.expires_date), Date.parse(subscription.expires_date));
  const grace = entitlement.grace_period_expires_date && subscription.grace_period_expires_date
    ? Math.min(Date.parse(entitlement.grace_period_expires_date), Date.parse(subscription.grace_period_expires_date)) : 0;
  const revoked = !!subscription.refunded_at;
  const accessUntil = revoked ? Math.min(expiresAt, Date.parse(subscription.refunded_at!)) : Math.max(expiresAt, grace);
  return { checkedAt: now, providerAt, expiresAt, accessUntil, productId: entitlement.product_identifier,
    active: !revoked && accessUntil > now, willRenew: !revoked && !subscription.unsubscribe_detected_at,
    billingIssue: !!subscription.billing_issues_detected_at, sandbox: subscription.is_sandbox, revoked, hasPurchased };
}

export class RevenueCatProvider implements SubscriptionProvider {
  constructor(private readonly config: RevenueCatConfig, private readonly now: () => number = Date.now,
    private readonly fetcher: typeof fetch = fetch) {}

  private async request(customerID: string, method: 'GET' | 'DELETE') {
    if (!/^[a-f0-9-]{36}$/.test(customerID)) throw new HttpError(503, 'subscription_verification_unavailable');
    try {
      return await this.fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(customerID)}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(8_000),
        headers: { authorization: `Bearer ${this.config.secretApiKey}`, 'X-Platform': 'ios', accept: 'application/json' },
      });
    } catch { throw new HttpError(503, 'subscription_verification_unavailable'); }
  }
  async subscriber(customerID: string, allowSandbox: boolean) {
    const response = await this.request(customerID, 'GET');
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new HttpError(503, 'subscription_verification_unavailable');
    }
    // Do not save/log provider bodies, subscriber attributes, receipts or raw transaction identifiers.
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 262_144) { await reader.cancel(); throw new Error('response_too_large'); }
        chunks.push(value);
      }
      return subscriptionSnapshot(JSON.parse(Buffer.concat(chunks).toString('utf8')), this.config, this.now(), allowSandbox);
    } catch { throw new HttpError(503, 'subscription_verification_unavailable'); }
  }
  async deleteCustomer(customerID: string) {
    const response = await this.request(customerID, 'DELETE');
    if (!response.ok && response.status !== 404) throw new HttpError(503, 'subscription_cleanup_unavailable');
    await response.body?.cancel();
  }
}
