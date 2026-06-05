import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_CONFIG = { N: 16384, r: 16, p: 1, dkLen: 64, maxmem: 128 * 16384 * 16 * 2 };

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const key = scryptSync(password.normalize('NFKC'), salt, SCRYPT_CONFIG.dkLen, SCRYPT_CONFIG);
	return `${salt}:${key.toString('hex')}`;
}

export function verifyPassword(hash: string, password: string): boolean {
	const [salt, key] = hash.split(':');
	if (!salt || !key) return false;
	const derivedKey = scryptSync(password.normalize('NFKC'), salt, SCRYPT_CONFIG.dkLen, SCRYPT_CONFIG);
	const keyBytes = Buffer.from(key, 'hex');
	if (derivedKey.length !== keyBytes.length) return false;
	return timingSafeEqual(derivedKey, keyBytes);
}
