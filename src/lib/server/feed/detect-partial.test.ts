import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractImageBasenames, imagesMatchPage, detectPartialFeed } from './detect-partial';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
});

describe('extractImageBasenames', () => {
	it('extracts basenames from <img> tags', () => {
		const html = '<p>Text</p><img src="https://example.com/images/photo.jpg"><p>More</p>';
		expect(extractImageBasenames(html)).toEqual(['photo.jpg']);
	});

	it('extracts basenames from multiple images', () => {
		const html = '<img src="a.png"><img src="b.jpg">';
		expect(extractImageBasenames(html)).toEqual(['a.png', 'b.jpg']);
	});

	it('extracts basenames from markdown images', () => {
		const html = 'Text ![alt](https://example.com/img/photo.png) more';
		expect(extractImageBasenames(html)).toEqual(['photo.png']);
	});

	it('extracts basenames from both HTML and markdown images', () => {
		const html = '<img src="a.jpg"> and ![alt](b.png)';
		expect(extractImageBasenames(html)).toEqual(['a.jpg', 'b.png']);
	});

	it('strips query parameters from basenames', () => {
		const html = '<img src="https://example.com/img.jpg?w=800&q=75">';
		expect(extractImageBasenames(html)).toEqual(['img.jpg']);
	});

	it('returns empty array for content with no images', () => {
		expect(extractImageBasenames('<p>Just text</p>')).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(extractImageBasenames('')).toEqual([]);
	});

	it('deduplicates identical basenames', () => {
		const html = '<img src="a.png"><img src="a.png">';
		expect(extractImageBasenames(html)).toEqual(['a.png']);
	});

	it('handles single-quoted src attributes', () => {
		const html = "<img src='photo.jpg'>";
		expect(extractImageBasenames(html)).toEqual(['photo.jpg']);
	});

	it('handles img tags with many attributes', () => {
		const html = '<img class="foo" src="hero.png" alt="Hero" width="800">';
		expect(extractImageBasenames(html)).toEqual(['hero.png']);
	});

	it('handles nested paths correctly', () => {
		const html = '<img src="/a/b/c/deep/file.svg">';
		expect(extractImageBasenames(html)).toEqual(['file.svg']);
	});
});

describe('imagesMatchPage', () => {
	it('returns true when a basename appears in page HTML', () => {
		expect(imagesMatchPage(['photo.jpg'], '<html><img src="photo.jpg"></html>')).toBe(true);
	});

	it('returns true when basename appears in any context', () => {
		expect(imagesMatchPage(['hero.png'], '<html><div data-image="hero.png"></div></html>')).toBe(true);
	});

	it('returns false when no basename appears in page', () => {
		expect(imagesMatchPage(['photo.jpg'], '<html><p>no images here</p></html>')).toBe(false);
	});

	it('returns false for empty basenames list', () => {
		expect(imagesMatchPage([], '<html>anything</html>')).toBe(false);
	});

	it('matches any of multiple basenames', () => {
		expect(imagesMatchPage(['missing.svg', 'found.png'], '<html>found.png</html>')).toBe(true);
	});

	it('skips basenames of 3 chars or fewer (too short to be reliable)', () => {
		expect(imagesMatchPage(['x.a'], '<html>x.a</html>')).toBe(false);
	});

	it('matches basenames of 4+ chars', () => {
		expect(imagesMatchPage(['abcd.png'], '<html>abcd.png</html>')).toBe(true);
	});

	it('matches basenames with special characters', () => {
		expect(imagesMatchPage(['my-image@2x.png'], '<html>my-image@2x.png</html>')).toBe(true);
	});
});

describe('detectPartialFeed', () => {
	it('returns false when fewer than 3 items have URLs', async () => {
		const items = [
			{ url: 'https://example.com/1', content: '<p>short</p>' },
			{ url: 'https://example.com/2', content: '<p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(false);
	});

	it('returns false when there are no items with URLs', async () => {
		const items = [
			{ content: '<p>no url</p>' },
			{ summary: '<p>also no url</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(false);
	});

	it('returns false when fewer than 3 page fetches succeed', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 500 });

		const items = [
			{ url: 'https://example.com/1', content: '<p>short</p>' },
			{ url: 'https://example.com/2', content: '<p>short</p>' },
			{ url: 'https://example.com/3', content: '<p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(false);
	});

	it('marks feed as partial when length differs significantly for 3+ items', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article>
<h1>Full Article</h1>
<p>${longText}</p>
</article>
</body></html>`)
		});

		const items = [
			{ url: 'https://example.com/1', content: '<p>short summary</p>' },
			{ url: 'https://example.com/2', content: '<p>short summary</p>' },
			{ url: 'https://example.com/3', content: '<p>short summary</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(true);
	});

	it('marks feed as full when length is similar for all items', async () => {
		const fullContent = `<p>${'A'.repeat(500)}</p>`;

		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body><article>${fullContent}</article></body></html>`)
		});

		const items = [
			{ url: 'https://example.com/1', content: fullContent },
			{ url: 'https://example.com/2', content: fullContent },
			{ url: 'https://example.com/3', content: fullContent }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(false);
	});

	it('uses summary when content is not available', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article>
<h1>Full Article</h1>
<p>${longText}</p>
</article>
</body></html>`)
		});

		const items = [
			{ url: 'https://example.com/1', summary: '<p>short</p>' },
			{ url: 'https://example.com/2', summary: '<p>short</p>' },
			{ url: 'https://example.com/3', summary: '<p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(true);
	});

	it('requires feed images to be found in page when feed has images (AND logic)', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article>
<h1>Full Article</h1>
<p>${longText}</p>
</article>
</body></html>`)
		});

		// Feed has images, length differs, but images NOT in page → no match
		const items = [
			{ url: 'https://example.com/1', content: '<img src="thumbnail.jpg"><p>short</p>' },
			{ url: 'https://example.com/2', content: '<img src="thumbnail.jpg"><p>short</p>' },
			{ url: 'https://example.com/3', content: '<img src="thumbnail.jpg"><p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(false);
	});

	it('counts match when both length and image conditions are satisfied', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article>
<h1>Full Article</h1>
<img src="thumbnail.jpg">
<p>${longText}</p>
</article>
</body></html>`)
		});

		const items = [
			{ url: 'https://example.com/1', content: '<img src="thumbnail.jpg"><p>short</p>' },
			{ url: 'https://example.com/2', content: '<img src="thumbnail.jpg"><p>short</p>' },
			{ url: 'https://example.com/3', content: '<img src="thumbnail.jpg"><p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(true);
	});

	it('handles HTTP errors gracefully without affecting other items', async () => {
		const longText = 'Article content. '.repeat(200);
		let callCount = 0;
		mockFetch.mockImplementation(() => {
			callCount++;
			if (callCount === 2) {
				return Promise.resolve({ ok: false, status: 500 });
			}
			return Promise.resolve({
				ok: true,
				text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article><p>${longText}</p></article>
</body></html>`)
			});
		});

		const items = [
			{ url: 'https://example.com/1', content: '<p>short</p>' },
			{ url: 'https://example.com/2', content: '<p>short</p>' },
			{ url: 'https://example.com/3', content: '<p>short</p>' },
			{ url: 'https://example.com/4', content: '<p>short</p>' },
			{ url: 'https://example.com/5', content: '<p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(true);
	});

	it('handles network errors gracefully', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockRejectedValueOnce(new Error('Network failure'));
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article><p>${longText}</p></article>
</body></html>`)
		});

		const items = [
			{ url: 'https://example.com/1', content: '<p>short</p>' },
			{ url: 'https://example.com/2', content: '<p>short</p>' },
			{ url: 'https://example.com/3', content: '<p>short</p>' },
			{ url: 'https://example.com/4', content: '<p>short</p>' },
			{ url: 'https://example.com/5', content: '<p>short</p>' }
		];
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(result).toBe(true);
	});

	it('respects the 5-item limit even when more items are provided', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article><p>${longText}</p></article>
</body></html>`)
		});

		const items = Array.from({ length: 20 }, (_, i) => ({
			url: `https://example.com/${i + 1}`,
			content: '<p>short</p>'
		}));
		const result = await detectPartialFeed('https://feed.example.com', items);
		expect(mockFetch).toHaveBeenCalledTimes(5);
		expect(result).toBe(true);
	});

	it('passes the log callback with meaningful messages', async () => {
		const longText = 'Article content. '.repeat(200);
		mockFetch.mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(`<!DOCTYPE html>
<html><head><title>Article</title></head>
<body>
<article><p>${longText}</p></article>
</body></html>`)
		});

		const logs: string[] = [];
		const items = [
			{ url: 'https://example.com/1', content: '<p>short</p>' },
			{ url: 'https://example.com/2', content: '<p>short</p>' },
			{ url: 'https://example.com/3', content: '<p>short</p>' }
		];
		await detectPartialFeed('https://feed.example.com', items, (msg) => logs.push(msg));

		expect(logs.length).toBeGreaterThan(0);
		expect(logs.some((l) => l.includes('MATCH'))).toBe(true);
		expect(logs.some((l) => l.includes('PARTIAL') || l.includes('full'))).toBe(true);
	});
});
