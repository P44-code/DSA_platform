import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return { salt, hash: derivedKey.toString('hex') };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionExpiry() {
  return new Date(Date.now() + sessionDurationMs);
}

export const sessionCookieName = 'verdictai_session';
export const sessionMaxAgeSeconds = sessionDurationMs / 1000;
