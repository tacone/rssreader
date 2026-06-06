import { describe, it, expect } from 'vitest';
import { kebab, generateSlug } from './slug';

describe('kebab', () => {
	it('converts basic string', () => {
		expect(kebab('Hello World')).toBe('hello-world');
	});

	it('handles special characters', () => {
		expect(kebab('Foo: Bar & Baz!')).toBe('foo-bar-baz');
	});

	it('collapses multiple hyphens', () => {
		expect(kebab('a  b   c')).toBe('a-b-c');
	});

	it('trims leading/trailing hyphens', () => {
		expect(kebab('--hello--')).toBe('hello');
	});

	it('handles empty string', () => {
		expect(kebab('')).toBe('');
	});
});

describe('generateSlug', () => {
	const id = '550e8400-e29b-41d4-a716-446655440000';

	it('uses label as base', () => {
		expect(generateSlug(id, 'Hello World')).toBe('hello-world-55440000');
	});

	it('uses domain from fallbackUrl when no label', () => {
		expect(generateSlug(id, null, 'https://example.com/feed.xml')).toBe('example-com-55440000');
	});

	it('uses untitled when no label or fallbackUrl', () => {
		expect(generateSlug(id, null, null)).toBe('untitled-55440000');
	});

	it('handles invalid fallbackUrl gracefully', () => {
		expect(generateSlug(id, null, 'not-a-url')).toBe('untitled-55440000');
	});

	it('appends last 8 chars of id', () => {
		expect(generateSlug(id, 'Test')).toBe('test-55440000');
		const shortId = 'abc123';
		expect(generateSlug(shortId, 'Test')).toBe('test-abc123');
	});

	it('falls back to untitled when label is empty string', () => {
		expect(generateSlug(id, '')).toBe('untitled-55440000');
	});

	it('uses domain from item URL', () => {
		expect(generateSlug(id, null, 'https://blog.example.com/article')).toBe('blog-example-com-55440000');
	});
});
