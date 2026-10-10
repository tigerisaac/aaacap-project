import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export const expectedRepo = 'tigerisaac/aaacap-project';
export const projectId = 'shield-calls-isaac';
export const secretId = 'SHIELD_COLLABORATOR_OPENROUTER';
export function isExpectedRemote(remote) {
  return /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)tigerisaac\/aaacap-project(?:\.git)?\/?$/.test(remote.trim());
}
export function assertRepository(root = process.cwd()) {
  const run = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (resolve(run('rev-parse', '--show-toplevel')) !== resolve(root) || !isExpectedRemote(run('remote', 'get-url', 'origin'))) {
    throw new Error('Run from the root of the tigerisaac/aaacap-project checkout.');
  }
  // Require ignore protection before creating any credential file.
  run('check-ignore', '--no-index', '.env.openrouter');
}
export async function readLocalEnv(file) {
  try { return parseEnv(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new Error('A local configuration file could not be read.'); }
}
export function credentialPresence(config) {
  return Object.fromEntries(['OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN', 'TRIAL_TWILIO_NUMBER', 'TRIAL_VERIFIED_CALLER', 'TRIAL_PUBLIC_BASE_URL']
    .map(key => [key, typeof config[key] === 'string' && config[key].trim().length > 0]));
}
export function openRouterEnv(config) {
  if (config.SCREENING_PROVIDER !== 'openrouter' || !/^sk-or-[A-Za-z0-9_-]+$/.test(config.OPENROUTER_API_KEY ?? '') ||
      !/^[A-Za-z0-9._:/-]+$/.test(config.OPENROUTER_MODEL ?? '') || !/^\d{1,6}$/.test(String(config.MODEL_TIMEOUT_MS ?? ''))) {
    throw new Error('Shared OpenRouter configuration is invalid; no values were printed.');
  }
  return ['SCREENING_PROVIDER', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'MODEL_TIMEOUT_MS']
    .map(key => `${key}=${config[key]}`).join('\n') + '\n';
}
export async function writeOpenRouterEnv(file, config) {
  // Exclusive creation refuses existing files and symlinks; no implicit overwrite.
  await writeFile(file, openRouterEnv(config), { mode: 0o600, flag: 'wx' });
}
