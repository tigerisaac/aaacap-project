import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialPresence, isExpectedRemote, openRouterEnv, writeOpenRouterEnv } from './collaborator-config.mjs';

const config = { SCREENING_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'sk-or-test-only', OPENROUTER_MODEL: 'test/model', MODEL_TIMEOUT_MS: '5000', OWNER_SECRET: 'never-export' };
test('rejects lookalike repository origins', () => {
  assert.ok(isExpectedRemote('https://github.com/tigerisaac/aaacap-project.git'));
  assert.ok(isExpectedRemote('git@github.com:tigerisaac/aaacap-project.git'));
  assert.equal(isExpectedRemote('https://github.com.evil.test/tigerisaac/aaacap-project.git'), false);
  assert.equal(isExpectedRemote('https://github.com/other/aaacap-project'), false);
});
test('status output contains only presence flags', () => {
  const result = credentialPresence(config);
  assert.equal(result.OPENROUTER_API_KEY, true);
  assert.equal(result.TWILIO_AUTH_TOKEN, false);
  assert.equal(JSON.stringify(result).includes('sk-or-test-only'), false);
});
test('exports only allowed fields and rejects env injection', () => {
  assert.equal(openRouterEnv(config).includes('OWNER_SECRET'), false);
  assert.throws(() => openRouterEnv({ ...config, OPENROUTER_MODEL: 'test/model\nEVIL=value' }));
});
test('secret file is private and existing files or symlinks cannot be overwritten', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shield-onboarding-test-'));
  try {
    const path = join(dir, '.env.openrouter');
    await writeOpenRouterEnv(path, config);
    if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o777, 0o600);
    await assert.rejects(writeOpenRouterEnv(path, { ...config, OPENROUTER_API_KEY: 'sk-or-other' }), { code: 'EEXIST' });
    assert.equal((await readFile(path, 'utf8')).includes('sk-or-test-only'), true);
    if (process.platform !== 'win32') {
      const link = join(dir, 'link'); await symlink(path, link);
      await assert.rejects(writeOpenRouterEnv(link, config), { code: 'EEXIST' });
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
