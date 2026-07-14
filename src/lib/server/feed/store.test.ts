import { describe, it, expect } from 'vitest';
import { buildItemUpdateSet } from './store';

const base = {
	title: 'Article Title',
	url: 'https://example.com/article',
	rawTitle: '<h1>Article Title</h1>',
	rawSummary: '<p>Summary</p>',
	rawContent: '<p>Feed content — short summary for partial feeds</p>',
	content: '<p>Full extracted content from the actual article page</p>',
	summary: 'Article Title',
	author: 'Author Name',
	publishedAt: new Date('2026-01-15'),
	isPartialFeed: 0
};

describe('buildItemUpdateSet', () => {
	it('includes content for full-content feeds (isPartialFeed = 0)', () => {
		const result = buildItemUpdateSet(base);
		expect(result).toHaveProperty('content');
	});

	it('excludes content for partial feeds (isPartialFeed = 1)', () => {
		const result = buildItemUpdateSet({ ...base, isPartialFeed: 1 });
		expect(result).not.toHaveProperty('content');
	});

	it('requires content to be excluded isPartialFeed = 1 even with empty content', () => {
		const result = buildItemUpdateSet({ ...base, content: null, isPartialFeed: 1 });
		expect(result).not.toHaveProperty('content');
	});

	it('includes all other fields regardless of partial status', () => {
		for (const partial of [0, 1]) {
			const result = buildItemUpdateSet({ ...base, isPartialFeed: partial });
			expect(result.title).toBe(base.title);
			expect(result.url).toBe(base.url);
			expect(result.rawTitle).toBe(base.rawTitle);
			expect(result.rawSummary).toBe(base.rawSummary);
			expect(result.rawContent).toBe(base.rawContent);
			expect(result.summary).toBe(base.summary);
			expect(result.author).toBe(base.author);
			expect(result.publishedAt).toBe(base.publishedAt);
		}
	});

	it('does not mutate the returned object on subsequent calls', () => {
		const full = buildItemUpdateSet(base);
		const partial = buildItemUpdateSet({ ...base, isPartialFeed: 1 });
		expect(full).toHaveProperty('content');
		expect(partial).not.toHaveProperty('content');
	});
});
