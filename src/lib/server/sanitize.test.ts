import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
	it('preserves basic formatting tags', () => {
		const html = '<p>Hello <strong>world</strong> <em>test</em></p>';
		expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong> <em>test</em></p>');
	});

	it('preserves links', () => {
		const html = '<a href="https://example.com">click here</a>';
		expect(sanitizeHtml(html)).toBe('<a href="https://example.com">click here</a>');
	});

	it('preserves images with safe attributes', () => {
		const html = '<img src="https://example.com/img.jpg" alt="A photo" width="800" height="600">';
		expect(sanitizeHtml(html)).toBe('<img src="https://example.com/img.jpg" alt="A photo" width="800" height="600">');
	});

	it('preserves headings', () => {
		const html = '<h2>Section Title</h2><h3>Subsection</h3>';
		expect(sanitizeHtml(html)).toBe('<h2>Section Title</h2><h3>Subsection</h3>');
	});

	it('preserves lists', () => {
		const html = '<ul><li>One</li><li>Two</li></ul><ol><li value="2">Three</li></ol>';
		expect(sanitizeHtml(html)).toBe('<ul><li>One</li><li>Two</li></ul><ol><li value="2">Three</li></ol>');
	});

	it('preserves blockquotes', () => {
		const html = '<blockquote cite="https://example.com"><p>Cited text</p></blockquote>';
		expect(sanitizeHtml(html)).toBe('<blockquote cite="https://example.com"><p>Cited text</p></blockquote>');
	});

	it('preserves tables', () => {
		const html = '<table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>';
		const result = sanitizeHtml(html);
		expect(result).toContain('<table>');
		expect(result).toContain('<th scope="col">');
		expect(result).toContain('<td>Value</td>');
	});

	it('strips script tags and their content', () => {
		const html = '<p>hello</p><script>alert(1)</script><p>world</p>';
		expect(sanitizeHtml(html)).toBe('<p>hello</p><p>world</p>');
	});

	it('strips inline event handlers', () => {
		const html = '<img src="x" onerror="alert(1)">';
		expect(sanitizeHtml(html)).toBe('<img src="x">');
	});

	it('strips javascript: URLs from links', () => {
		const html = '<a href="javascript:alert(1)">click</a>';
		expect(sanitizeHtml(html)).toBe('<a>click</a>');
	});

	it('strips iframes', () => {
		const html = '<p>text</p><iframe src="https://evil.com"></iframe><p>more</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p><p>more</p>');
	});

	it('strips form and input elements (text content survives)', () => {
		const html = '<form action="/steal"><input name="x"><button>submit</button></form>';
		// form/input/button tags are stripped, but inline text content survives (KEEP_CONTENT: true)
		expect(sanitizeHtml(html)).toBe('submit');
	});

	it('strips style tags', () => {
		const html = '<p>text</p><style>body { color: red; }</style><p>more</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p><p>more</p>');
	});

	it('strips style attributes', () => {
		const html = '<p style="color: red">text</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips class and id attributes', () => {
		const html = '<p class="highlight" id="main">text</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips data-* attributes', () => {
		const html = '<div data-track="123" data-analytics="true">content</div>';
		expect(sanitizeHtml(html)).toBe('<div>content</div>');
	});

	it('removes objects and embeds', () => {
		const html = '<object data="flash.swf"></object><embed src="flash.swf">';
		expect(sanitizeHtml(html)).toBe('');
	});

	it('removes svg and math elements', () => {
		const html = '<svg onload="alert(1)"></svg><math><mi>x</mi></math>';
		expect(sanitizeHtml(html)).toBe('');
	});

	it('strips nested dangerous content inside safe elements', () => {
		const html = '<div><p><script>alert(1)</script></p></div>';
		expect(sanitizeHtml(html)).toBe('<div><p></p></div>');
	});

	it('handles empty string', () => {
		expect(sanitizeHtml('')).toBe('');
	});

	it('handles plain text without HTML', () => {
		expect(sanitizeHtml('just some text')).toBe('just some text');
	});

	it('preserves <br> tags', () => {
		expect(sanitizeHtml('<p>line1<br>line2</p>')).toBe('<p>line1<br>line2</p>');
	});

	it('strips <base> tag', () => {
		const html = '<base href="https://evil.com"><p>text</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <meta> tag', () => {
		const html = '<meta http-equiv="refresh" content="0;url=https://evil.com"><p>text</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <link> tag', () => {
		const html = '<link rel="stylesheet" href="evil.css"><p>text</p>';
		expect(sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <noscript> tag (content survives)', () => {
		const html = '<noscript><img src="tracker.gif"></noscript><p>text</p>';
		// noscript tag is stripped but its content survives (KEEP_CONTENT: true)
		expect(sanitizeHtml(html)).toBe('<img src="tracker.gif"><p>text</p>');
	});

	it('handles real WordPress-style feed HTML', () => {
		const html = '<p class="wp-block-paragraph">Since the 1990s, the web has been a publishing place for human-readable documents.</p>';
		const result = sanitizeHtml(html);
		expect(result).toBe('<p>Since the 1990s, the web has been a publishing place for human-readable documents.</p>');
	});

	it('handles real feed HTML with images and links', () => {
		const html = '<img src="https://storage.example.com/img.jpg" alt="Photo">'
			+ '<p><em>Some text from </em><a href="https://example.com"><em>a speech</em></a></p>';
		const result = sanitizeHtml(html);
		expect(result).toBe(
			'<img src="https://storage.example.com/img.jpg" alt="Photo">'
			+ '<p><em>Some text from </em><a href="https://example.com"><em>a speech</em></a></p>',
		);
	});

	it('preserves target and rel on links', () => {
		const html = '<a href="https://example.com" target="_blank" rel="noreferrer">link</a>';
		expect(sanitizeHtml(html)).toBe('<a href="https://example.com" target="_blank" rel="noreferrer">link</a>');
	});

	it('handles deeply nested HTML', () => {
		const html = '<div><div><div><p><strong><em>deep text</em></strong></p></div></div></div>';
		expect(sanitizeHtml(html)).toBe('<div><div><div><p><strong><em>deep text</em></strong></p></div></div></div>');
	});
});
