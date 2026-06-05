import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
	it('should hash and verify a password', () => {
		const hash = hashPassword('my-password');
		expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
		expect(verifyPassword(hash, 'my-password')).toBe(true);
	});

	it('should reject wrong password', () => {
		const hash = hashPassword('correct-password');
		expect(verifyPassword(hash, 'wrong-password')).toBe(false);
	});

	it('should produce unique salts each time', () => {
		const hash1 = hashPassword('same-password');
		const hash2 = hashPassword('same-password');
		expect(hash1.split(':')[0]).not.toBe(hash2.split(':')[0]);
	});

	it('should produce 64-byte keys (128 hex chars)', () => {
		const hash = hashPassword('test');
		const key = hash.split(':')[1];
		expect(key).toHaveLength(128);
	});

	it('should reject malformed hash', () => {
		expect(verifyPassword('invalid', 'test')).toBe(false);
		expect(verifyPassword('hexhex:tooshort', 'test')).toBe(false);
		expect(verifyPassword(':', 'test')).toBe(false);
	});

	it('should handle unicode normalization (NFKC)', () => {
		const hash = hashPassword('\u00e9'); // é in NFC form
		expect(verifyPassword(hash, '\u0065\u0301')).toBe(true); // é as NFD (e + combining acute)
	});
});
