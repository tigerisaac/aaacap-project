import { describe, expect, it, vi } from 'vitest';
import { restoreAssignment } from '../../scripts/shared-number-maintenance.mjs';

const snapshot = { numberId: 'number-id', destination: '+12025550100', originalConnectionId: 'original', testApplicationId: 'diagnostic' };
describe('temporary number restoration', () => {
  it('changes only the connection and verifies the restored assignment', async () => {
    let connection_id = 'diagnostic';
    const request = vi.fn(async (_path, method, body) => {
      if (method === 'PATCH') connection_id = body.connection_id;
      return { data: { phone_number: snapshot.destination, connection_id } };
    });
    await restoreAssignment(request, snapshot);
    expect(request.mock.calls.filter(c => c[1] === 'PATCH')).toEqual([
      ['/phone_numbers/number-id', 'PATCH', { connection_id: 'original' }],
    ]);
    await restoreAssignment(request, snapshot);
    expect(request.mock.calls.filter(c => c[1] === 'PATCH')).toHaveLength(1);
  });
  it('does not overwrite a different operator assignment or number', async () => {
    for (const data of [
      { phone_number: snapshot.destination, connection_id: 'third-app' },
      { phone_number: '+12025550199', connection_id: 'diagnostic' },
    ]) {
      const request = vi.fn(async () => ({ data }));
      await expect(restoreAssignment(request, snapshot)).rejects.toThrow();
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
  it('reads back a timed-out PATCH instead of assuming failure or success', async () => {
    let connection_id = 'diagnostic';
    const request = vi.fn(async (_path, method, body) => {
      if (method === 'PATCH') { connection_id = body.connection_id; throw new Error('timeout'); }
      return { data: { phone_number: snapshot.destination, connection_id } };
    });
    await expect(restoreAssignment(request, snapshot)).resolves.toBeUndefined();
    const failed = vi.fn(async () => ({ data: { phone_number: snapshot.destination, connection_id: 'diagnostic' } }));
    await expect(restoreAssignment(failed, snapshot)).rejects.toThrow('restoration_not_verified');
  });
});
