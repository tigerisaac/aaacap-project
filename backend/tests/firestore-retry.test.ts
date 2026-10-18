import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Server, ServerCredentials, status, type ServiceDefinition, type ServerWritableStream,
  type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getShieldFirestore } from '../src/cloud/firestore.js';

const definition = loadSync(fileURLToPath(new URL('./fixtures/firestore-retry.proto', import.meta.url)));
const service = definition['google.firestore.v1.Firestore'] as ServiceDefinition;
const timestamp = { seconds: 1000, nanos: 0 };
type ReadRequest = { database?: string; documents?: string[]; transaction?: Buffer; newTransaction?: Buffer };
type ReadStream = ServerWritableStream<ReadRequest, Record<string, unknown>>;

// A real loopback gRPC transport, not a mocked transaction runner. The server
// closes an aborted transaction and rejects any replay of its old read.
describe('Firestore streaming and transaction retries', () => {
  let server: Server, app: App, db: Firestore;
  let failure: number, failAlways: boolean, failMethod: 'query' | 'documents';
  let begins: number, commits: number, closedReplays: number;
  let reads: string[], closed: Set<string>, didFail: boolean;

  function readFailure(call: ReadStream, method: typeof failMethod): boolean {
    const id = call.request.transaction?.toString() ?? '';
    reads.push(`${method}:${id}`);
    if (closed.has(id)) {
      closedReplays++;
      call.emit('error', { code: status.INVALID_ARGUMENT, details: 'Transaction is invalid or closed.' });
      return true;
    }
    if (method === failMethod && (!didFail || failAlways)) {
      didFail = true;
      if (failure === status.ABORTED) closed.add(id);
      call.emit('error', { code: failure, details: 'Synthetic transaction read failure' });
      return true;
    }
    return false;
  }

  beforeEach(async () => {
    failure = status.ABORTED; failAlways = false; failMethod = 'query';
    begins = 0; commits = 0; closedReplays = 0; reads = []; closed = new Set(); didFail = false;
    server = new Server();
    server.addService(service, {
      batchGetDocuments(call: ReadStream) {
        if (call.request.newTransaction) {
          const transaction = Buffer.from(`synthetic-${++begins}`);
          call.write({ transaction });
          call.request.transaction = transaction;
        } else if (readFailure(call, 'documents')) { return; }
        for (const name of call.request.documents ?? []) {
          call.write({ found: { name, fields: { count: { integerValue: '0' } },
            createTime: timestamp, updateTime: timestamp }, readTime: timestamp });
        }
        call.end();
      },
      runQuery(call: ReadStream) {
        if (readFailure(call, 'query')) return;
        call.write({ readTime: timestamp }); call.end();
      },
      commit(call: ServerUnaryCall<{ writes: Buffer[] }, unknown>, callback: sendUnaryData<unknown>) {
        commits++;
        callback(null, { commitTime: timestamp, writeResults: call.request.writes.map(() => ({ updateTime: timestamp })) });
      },
      rollback(_call: ServerUnaryCall<unknown, unknown>, callback: sendUnaryData<unknown>) { callback(null, {}); }
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, bound) => error ? reject(error) : resolve(bound));
    });
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', `127.0.0.1:${port}`);
    vi.stubEnv('METADATA_SERVER_DETECTION', 'none');
    app = initializeApp({ projectId: 'demo-shield-retry' }, `retry-${randomUUID()}`);
    db = getShieldFirestore(app);
  });

  afterEach(async () => {
    await db?.terminate();
    if (app) await deleteApp(app);
    server?.forceShutdown(); vi.unstubAllEnvs();
  });

  function increment(maxAttempts = 5) {
    return db.runTransaction(async tx => {
      const ref = db.doc('counters/test');
      const current = await tx.get(ref);
      if (failMethod === 'documents') await tx.get(db.doc('people/owner'));
      else await tx.get(db.collection('calls').limit(1));
      const next = current.get('count') + 1;
      tx.update(ref, { count: next });
      return next;
    }, { maxAttempts });
  }

  it.each(['query', 'documents'] as const)('restarts the transaction after an aborted %s without replaying a closed read', async method => {
    failMethod = method;
    await expect(increment()).resolves.toBe(1);
    expect(begins).toBe(2); expect(commits).toBe(1); expect(closedReplays).toBe(0);
    expect(reads).toEqual([`${method}:synthetic-1`, `${method}:synthetic-2`]);
    // A warm function must reuse its configured client even after the first RPC.
    expect(getShieldFirestore(app)).toBe(db);
  });

  it.each([status.PERMISSION_DENIED, status.INVALID_ARGUMENT])('propagates non-retryable status %i without replaying the read or committing', async code => {
    failure = code;
    await expect(increment()).rejects.toMatchObject({ code });
    expect(begins).toBe(1); expect(reads).toHaveLength(1); expect(commits).toBe(0);
  });

  it('preserves transient unavailable retries inside the same transaction', async () => {
    failure = status.UNAVAILABLE;
    await expect(increment()).resolves.toBe(1);
    expect(begins).toBe(1); expect(commits).toBe(1); expect(closedReplays).toBe(0);
    expect(reads).toEqual(['query:synthetic-1', 'query:synthetic-1']);
  });

  it('stops at the existing transaction attempt limit without committing', async () => {
    failAlways = true;
    await expect(increment(2)).rejects.toMatchObject({ code: status.ABORTED });
    expect(begins).toBe(2); expect(reads).toHaveLength(2); expect(closedReplays).toBe(0); expect(commits).toBe(0);
  });
});
