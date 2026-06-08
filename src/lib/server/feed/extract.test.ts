import { describe, it, expect } from 'vitest';
import { extractFromPage, compareContentLength, getTextContent } from './extract';

describe('extractFromPage', () => {
	function articleBody(text: string): string {
		return `<p>${text}</p>`.repeat(5);
	}

	const longEnough = 'A paragraph with enough text to pass the readerable threshold. '.repeat(10);

	it('extracts article content from a blog post page', () => {
		const html = `<!DOCTYPE html>
<html><head><title>My Blog Post</title></head>
<body>
<article>
<h1>My Blog Post</h1>
<p>This is the full article content. It has multiple paragraphs of text that a readability algorithm should be able to extract from the page, because the page structure clearly marks the content area.</p>
<p>Here is a second paragraph with more details about the topic being discussed in this article. It goes on for a while to provide enough text for the readerable check.</p>
<p>A third paragraph ensures we meet the minimum content length threshold so that readability considers this page worth parsing.</p>
</article>
<nav>Some navigation links here</nav>
<footer>Footer content that should be excluded</footer>
</body></html>`;

		const result = extractFromPage(html, 'https://example.com/blog');
		expect(result.notRenderable).toBe(false);
		expect(result.content).not.toBeNull();
		expect(result.content).toContain('full article content');
		expect(result.content).not.toContain('navigation');
		expect(result.content).not.toContain('Footer');
	});

	it('marks page as not renderable when content is too short', () => {
		const html = `<!DOCTYPE html>
<html><head><title>Tiny</title></head>
<body><p>Hi</p></body></html>`;

		const result = extractFromPage(html, 'https://example.com/tiny');
		expect(result.notRenderable).toBe(true);
		expect(result.content).toBeNull();
	});

	it('marks page as not renderable when bare minimum with no real article', () => {
		const html = `<!DOCTYPE html>
<html><head><title>Nav only</title></head>
<body><nav><a href="/">Home</a><a href="/about">About</a></nav></body></html>`;

		const result = extractFromPage(html, 'https://example.com/navonly');
		expect(result.notRenderable).toBe(true);
		expect(result.content).toBeNull();
	});

	it('extracts content from a page with minimal text but enough for readerable', () => {
		const html = `<!DOCTYPE html>
<html><head><title>Just enough</title></head>
<body>${articleBody(longEnough)}</body></html>`;

		const result = extractFromPage(html, 'https://example.com/justenough');
		expect(result.notRenderable).toBe(false);
		expect(result.content).not.toBeNull();
	});

	it('handles empty HTML gracefully', () => {
		const result = extractFromPage('', 'https://example.com/empty');
		expect(result.notRenderable).toBe(true);
		expect(result.content).toBeNull();
	});

	it('handles HTML with no body', () => {
		const result = extractFromPage('<html></html>', 'https://example.com/nobody');
		expect(result.notRenderable).toBe(true);
		expect(result.content).toBeNull();
	});

	it('resolves relative URLs using the base URL', () => {
		const html = `<!DOCTYPE html>
<html><head><title>Relative URLs</title></head>
<body>
${articleBody(longEnough)}
<img src="/images/photo.jpg" alt="Photo">
<a href="/about">About</a>
</body></html>`;

		const result = extractFromPage(html, 'https://example.com/blog/post');
		expect(result.notRenderable).toBe(false);
		expect(result.content).not.toBeNull();
		expect(result.content).toContain('src="https://example.com/images/photo.jpg"');
		expect(result.content).toContain('href="https://example.com/about"');
	});

	it('strips scripts and extraneous elements', () => {
		const html = `<!DOCTYPE html>
<html><head><title>Clean extraction</title></head>
<body>
<script>alert("bad")</script>
${articleBody(longEnough)}
<style>.body { color: red; }</style>
<p>More article text here for the second paragraph that we need to reach the minimum score. A bit more text should do the trick nicely.</p>
<aside>Sidebar ads and junk</aside>
</body></html>`;

		const result = extractFromPage(html, 'https://example.com/clean');
		expect(result.notRenderable).toBe(false);
		expect(result.content).not.toBeNull();
		expect(result.content).not.toContain('alert');
		expect(result.content).not.toContain('ads and junk');
	});
});

describe('compareContentLength', () => {
	it('returns true when extracted text is more than double feed text', () => {
		expect(compareContentLength('A'.repeat(1000), 'A'.repeat(400))).toBe(true);
	});

	it('returns true when extracted text is feed + 500 chars', () => {
		expect(compareContentLength('A'.repeat(600), 'A'.repeat(50))).toBe(true);
	});

	it('returns false when feed text and extracted text are similar in length', () => {
		expect(compareContentLength('A'.repeat(500), 'A'.repeat(450))).toBe(false);
	});

	it('returns false when extracted text is shorter than feed text', () => {
		expect(compareContentLength('A'.repeat(100), 'A'.repeat(200))).toBe(false);
	});

	it('returns false for roughly equal lengths', () => {
		expect(compareContentLength('A'.repeat(500), 'A'.repeat(499))).toBe(false);
	});

	it('returns true when feed text is null and extracted is long enough', () => {
		expect(compareContentLength('A'.repeat(600), null)).toBe(true);
	});

	it('returns false when feed text is null and extracted is below threshold', () => {
		expect(compareContentLength('A'.repeat(100), null)).toBe(false);
	});

	it('returns true when feed text is undefined and extracted is long enough', () => {
		expect(compareContentLength('A'.repeat(600), undefined)).toBe(true);
	});

	it('returns false when both texts are short and similar', () => {
		expect(compareContentLength('A'.repeat(30), 'A'.repeat(20))).toBe(false);
	});

	it('handles empty extracted text', () => {
		expect(compareContentLength('', 'A'.repeat(100))).toBe(false);
	});

	it('handles both texts empty', () => {
		expect(compareContentLength('', '')).toBe(false);
	});
});

describe('getTextContent', () => {
	it('strips HTML tags', () => {
		expect(getTextContent('<p>Hello <b>world</b></p>')).toBe('Hello world');
	});

	it('returns text from nested elements', () => {
		expect(getTextContent('<div><p>First</p><p>Second</p></div>')).toBe('FirstSecond');
	});

	it('returns empty string for empty input', () => {
		expect(getTextContent('')).toBe('');
	});

	it('returns empty string for HTML with no text', () => {
		expect(getTextContent('<div><span></span></div>')).toBe('');
	});

	it('preserves text without HTML tags', () => {
		expect(getTextContent('Plain text')).toBe('Plain text');
	});

	it('handles HTML with entities', () => {
		expect(getTextContent('<p>Hello &amp; goodbye</p>')).toBe('Hello & goodbye');
	});
});
