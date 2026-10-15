import { describe, it, expect, vi } from 'vitest';
import { TelnyxPhoneVerifier } from '../src/cloud/phone-auth.js';
import { TelnyxTextSender } from '../src/cloud/text-alerts.js';
import type { CloudStore } from '../src/cloud/store.js';
const phone = '+12025550101', id = 'b0b7af93-72ad-431d-9708-f1d9564a2b36';
const store = { config: { TELNYX_API_KEY: 'synthetic-key', TELNYX_VERIFY_PROFILE_ID: id, SMS_ALERTS: { from: '+12025550109', messagingProfileId: id } } } as CloudStore;
describe('Phone provider boundaries', () => {
  it('uses provider-generated codes and checks both acceptance and phone without custom-code bypass', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ data: { id } }))
      .mockResolvedValueOnce(Response.json({ data: { response_code: 'accepted', phone_number: phone } }))
      .mockResolvedValueOnce(Response.json({ data: { response_code: 'accepted', phone_number: '+12025550102' } }));
    const verifier = new TelnyxPhoneVerifier(store, request);
    expect(await verifier.start(phone)).toBe(id);
    expect(await verifier.verify(id, '123456', phone)).toBe(true);
    expect(await verifier.verify(id, '123456', phone)).toBe(false);
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({ phone_number: phone, verify_profile_id: id, timeout_secs: 300 });
    expect(JSON.parse(request.mock.calls[1]![1]!.body as string)).toEqual({ code: '123456' });
    expect(request.mock.calls.every(([url, init]) => String(url).startsWith('https://api.telnyx.com/v2/') && init?.redirect === 'error' && init.signal instanceof AbortSignal)).toBe(true);
  });
  it('treats rejected verification as incorrect and hides provider failures, without retries', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ private: 'detail' }, { status: 422 }))
      .mockResolvedValueOnce(Response.json({ private: 'detail' }, { status: 500 }));
    const verifier = new TelnyxPhoneVerifier(store, request);
    expect(await verifier.verify(id, '000000', phone)).toBe(false);
    await expect(verifier.start(phone)).rejects.toMatchObject({ code: 'phone_verification_unavailable' });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([[200, 'submitted'], [400, 'failed'], [500, 'unknown']] as const)('records submission rather than delivery, and never retries (%s)', async (status, result) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status }));
    expect(await new TelnyxTextSender(store, request).send(phone, 'Synthetic alert')).toBe(result);
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toMatchObject({ to: phone, text: 'Synthetic alert', messaging_profile_id: id, use_profile_webhooks: true });
  });
  it('does not repeat an SMS whose submission outcome is unknown', async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('private network detail'));
    expect(await new TelnyxTextSender(store, request).send(phone, 'Synthetic')).toBe('unknown');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
