import { describe, it, expect } from 'vitest';
import { sanitizeHtml, classifyImages } from './sanitize';

describe('sanitizeHtml', () => {
	it('preserves basic formatting tags', async () => {
		const html = '<p>Hello <strong>world</strong> <em>test</em></p>';
		expect(await sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong> <em>test</em></p>');
	});

	it('preserves links', async () => {
		const html = '<a href="https://example.com">click here</a>';
		expect(await sanitizeHtml(html)).toBe('<a href="https://example.com">click here</a>');
	});

	it('preserves images with safe attributes', async () => {
		const html = '<img src="https://example.com/img.jpg" alt="A photo" width="800" height="600">';
		const result = await sanitizeHtml(html);
		// sole child of body → standalone-image
		expect(result).toContain('src="https://example.com/img.jpg"');
		expect(result).toContain('alt="A photo"');
		expect(result).toContain('width="800"');
		expect(result).toContain('height="600"');
		expect(result).toContain('class="standalone-image"');
	});

	it('preserves headings', async () => {
		const html = '<h2>Section Title</h2><h3>Subsection</h3>';
		expect(await sanitizeHtml(html)).toBe('<h2>Section Title</h2><h3>Subsection</h3>');
	});

	it('preserves lists', async () => {
		const html = '<ul><li>One</li><li>Two</li></ul><ol><li value="2">Three</li></ol>';
		expect(await sanitizeHtml(html)).toBe('<ul><li>One</li><li>Two</li></ul><ol><li value="2">Three</li></ol>');
	});

	it('preserves blockquotes', async () => {
		const html = '<blockquote cite="https://example.com"><p>Cited text</p></blockquote>';
		expect(await sanitizeHtml(html)).toBe('<blockquote cite="https://example.com"><p>Cited text</p></blockquote>');
	});

	it('preserves tables', async () => {
		const html = '<table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('<table>');
		expect(result).toContain('<th scope="col">');
		expect(result).toContain('<td>Value</td>');
	});

	it('strips script tags and their content', async () => {
		const html = '<p>hello</p><script>alert(1)</script><p>world</p>';
		expect(await sanitizeHtml(html)).toBe('<p>hello</p><p>world</p>');
	});

	it('strips inline event handlers', async () => {
		const html = '<img src="x" onerror="alert(1)">';
		const result = await sanitizeHtml(html);
		expect(result).toContain('src="x"');
		expect(result).not.toContain('onerror');
		// class added by image classifier (sole child of body)
		expect(result).toContain('class="standalone-image"');
	});

	it('strips javascript: URLs from links', async () => {
		const html = '<a href="javascript:alert(1)">click</a>';
		expect(await sanitizeHtml(html)).toBe('<a>click</a>');
	});

	it('strips generic iframes', async () => {
		const html = '<p>text</p><iframe src="https://evil.com"></iframe><p>more</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p><p>more</p>');
	});

	it('converts YouTube embed iframe to thumbnail link', async () => {
		const html = '<p>text</p><iframe width="200" height="113" src="https://www.youtube.com/embed/s8iXW3GHx3w?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="The Vast"></iframe><p>more</p>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('data-provider="youtube"');
		expect(result).toContain('data-videoid="s8iXW3GHx3w"');
		expect(result).toContain('src="https://img.youtube.com/vi/s8iXW3GHx3w/hqdefault.jpg"');
		expect(result).toContain('href="https://www.youtube.com/watch?v=s8iXW3GHx3w"');
		expect(result).not.toContain('<iframe');
	});

	it('converts TED embed iframe to plain link', async () => {
		const html = '<iframe src="https://embed.ted.com/talks/seth_shostak_et_is_probably_out_there_get_ready" width="560" height="316" frameborder="0" scrolling="no" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
		const result = await sanitizeHtml(html);
		expect(result).toBe('<a href="https://embed.ted.com/talks/seth_shostak_et_is_probably_out_there_get_ready">TED Talk</a>');
	});

	it('does not convert non-YouTube/TED iframes', async () => {
		const html = '<iframe src="https://vimeo.com/123"></iframe>';
		expect(await sanitizeHtml(html)).toBe('');
	});

	it('strips form and input elements (text content survives)', async () => {
		const html = '<form action="/steal"><input name="x"><button>submit</button></form>';
		// form/input/button tags are stripped, but inline text content survives (KEEP_CONTENT: true)
		expect(await sanitizeHtml(html)).toBe('submit');
	});

	it('strips style tags', async () => {
		const html = '<p>text</p><style>body { color: red; }</style><p>more</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p><p>more</p>');
	});

	it('strips style attributes', async () => {
		const html = '<p style="color: red">text</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips id attributes (class is now allowed for image classification)', async () => {
		const html = '<p class="highlight" id="main">text</p>';
		// class is allowed (needed for inline-image/standalone-image), but id is not
		expect(await sanitizeHtml(html)).toBe('<p class="highlight">text</p>');
	});

	it('strips data-* attributes', async () => {
		const html = '<div data-track="123" data-analytics="true">content</div>';
		expect(await sanitizeHtml(html)).toBe('<div>content</div>');
	});

	it('removes objects and embeds', async () => {
		const html = '<object data="flash.swf"></object><embed src="flash.swf">';
		expect(await sanitizeHtml(html)).toBe('');
	});

	it('removes svg and math elements', async () => {
		const html = '<svg onload="alert(1)"></svg><math><mi>x</mi></math>';
		expect(await sanitizeHtml(html)).toBe('');
	});

	it('preserves video elements with controls forced', async () => {
		const html = '<video src="https://example.com/video.mp4" poster="https://example.com/poster.jpg" width="640" height="360"></video>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('<video');
		expect(result).toContain('controls');
		expect(result).toContain('src="https://example.com/video.mp4"');
		expect(result).toContain('poster="https://example.com/poster.jpg"');
		expect(result).toContain('width="640"');
		expect(result).toContain('height="360"');
	});

	it('preserves existing controls attribute on video', async () => {
		const html = '<video src="x.mp4" controls loop></video>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('controls');
		expect(result).toContain('loop');
	});

	it('strips autoplay from video elements', async () => {
		const html = '<video src="x.mp4" autoplay muted></video>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('<video');
		expect(result).toContain('controls');
		expect(result).not.toContain('autoplay');
		expect(result).not.toContain('muted');
	});

	it('preserves source children inside video', async () => {
		const html = '<video controls><source src="x.webm" type="video/webm"><source src="x.mp4" type="video/mp4"></video>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('<video');
		expect(result).toContain('<source src="x.webm" type="video/webm">');
		expect(result).toContain('<source src="x.mp4" type="video/mp4">');
	});

	it('preserves picture elements with srcset and sizes', async () => {
		const html = '<picture><source srcset="img.webp" type="image/webp" sizes="(max-width: 600px) 100vw, 50vw"><img src="img.jpg" alt="photo"></picture>';
		const result = await sanitizeHtml(html);
		expect(result).toContain('<picture>');
		expect(result).toContain('<source srcset="img.webp"');
		expect(result).toContain('sizes="(max-width: 600px) 100vw, 50vw"');
		expect(result).toContain('type="image/webp"');
		expect(result).toContain('<img src="img.jpg"');
		expect(result).toContain('class="standalone-image"');
	});

	it('strips nested dangerous content inside safe elements', async () => {
		const html = '<div><p><script>alert(1)</script></p></div>';
		expect(await sanitizeHtml(html)).toBe('<div><p></p></div>');
	});

	it('handles empty string', async () => {
		expect(await sanitizeHtml('')).toBe('');
	});

	it('handles plain text without HTML', async () => {
		expect(await sanitizeHtml('just some text')).toBe('just some text');
	});

	it('preserves <br> tags', async () => {
		expect(await sanitizeHtml('<p>line1<br>line2</p>')).toBe('<p>line1<br>line2</p>');
	});

	it('strips <base> tag', async () => {
		const html = '<base href="https://evil.com"><p>text</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <meta> tag', async () => {
		const html = '<meta http-equiv="refresh" content="0;url=https://evil.com"><p>text</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <link> tag', async () => {
		const html = '<link rel="stylesheet" href="evil.css"><p>text</p>';
		expect(await sanitizeHtml(html)).toBe('<p>text</p>');
	});

	it('strips <noscript> tag (content survives)', async () => {
		const html = '<noscript><img src="tracker.gif"></noscript><p>text</p>';
		// noscript tag is stripped but its content survives (KEEP_CONTENT: true)
		const result = await sanitizeHtml(html);
		expect(result).toContain('src="tracker.gif"');
		expect(result).toContain('<p>text</p>');
		// img is sole child of body → standalone-image
		expect(result).toContain('class="standalone-image"');
	});

	it('handles real WordPress-style feed HTML', async () => {
		const html = '<p class="wp-block-paragraph">Since the 1990s, the web has been a publishing place for human-readable documents.</p>';
		const result = await sanitizeHtml(html);
		// class is now allowed (needed for image classification)
		expect(result).toBe('<p class="wp-block-paragraph">Since the 1990s, the web has been a publishing place for human-readable documents.</p>');
	});

	it('handles real feed HTML with images and links', async () => {
		const html = '<img src="https://storage.example.com/img.jpg" alt="Photo">'
			+ '<p><em>Some text from </em><a href="https://example.com"><em>a speech</em></a></p>';
		const result = await sanitizeHtml(html);
		expect(result).toBe(
			'<img src="https://storage.example.com/img.jpg" alt="Photo" class="standalone-image">'
			+ '<p><em>Some text from </em><a href="https://example.com"><em>a speech</em></a></p>',
		);
	});

	it('preserves target and rel on links', async () => {
		const html = '<a href="https://example.com" target="_blank" rel="noreferrer">link</a>';
		expect(await sanitizeHtml(html)).toBe('<a href="https://example.com" target="_blank" rel="noreferrer">link</a>');
	});

	it('handles deeply nested HTML', async () => {
		const html = '<div><div><div><p><strong><em>deep text</em></strong></p></div></div></div>';
		expect(await sanitizeHtml(html)).toBe('<div><div><div><p><strong><em>deep text</em></strong></p></div></div></div>');
	});

	// ── Image classification: inline ──────────────────────────────

	describe('inline image classification', () => {
		it('classifies by height attribute < 100', async () => {
			const result = await sanitizeHtml('<p><img src="x.png" height="16"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).toContain('src="x.png"');
			expect(result).not.toContain('height="16"');
		});

		it('height = 99 inline, height = 100 not inline', async () => {
			const r1 = await sanitizeHtml('<p><img src="x.png" height="99"> text</p>');
			expect(r1).toMatch(/class="[^"]*inline-image/);

			const r2 = await sanitizeHtml('<p><img src="x.png" height="100"> text</p>');
			expect(r2).not.toContain('class="');
		});

		it('classifies by querystring h param < 100', async () => {
			const result = await sanitizeHtml('<p><img src="x.png?h=24"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});

		it('classifies by querystring height param < 100', async () => {
			const result = await sanitizeHtml('<p><img src="x.png?height=32"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});

		it('classifies by querystring h param among others', async () => {
			const result = await sanitizeHtml('<p><img src="x.png?w=800&h=48"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});

		it('querystring h >= 100 does not classify as inline', async () => {
			const result = await sanitizeHtml('<p><img src="x.png?h=200"> text</p>');
			expect(result).not.toContain('class="');
		});

		it('classifies by dimension pattern in path', async () => {
			const result = await sanitizeHtml('<p><img src="https://cdn.example.com/74x43/thumb.jpg"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});

		it('classifies by 16x16 pattern in filename', async () => {
			const result = await sanitizeHtml('<p><img src="icon-16x16.png"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});

		it('classifies by whitelisted class wp-smiley', async () => {
			const result = await sanitizeHtml('<p><img class="wp-smiley" src="emoji.png" height="10"> text</p>');
			// class attribute has both wp-smiley (original) and inline-image (added)
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).not.toContain('height="10"');
		});

		it('classifies images inside <pre> regardless of height', async () => {
			const result = await sanitizeHtml('<pre><code><img src="emoji.png" height="500"></code></pre>');
			expect(result).toContain('class="inline-image"');
		});

		it('strips height and width from inline-classified images', async () => {
			const result = await sanitizeHtml('<p><img src="x.png" height="24" width="24"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).not.toContain('height="');
			expect(result).not.toContain('width="');
		});

		it('inline image inside transparent wrapper (a, span) is classified correctly', async () => {
			const result = await sanitizeHtml('<p><a href="/"><img src="icon.svg" height="24"></a> Download</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).not.toContain('height="24"');
		});

		it('inline image inside span wrapper', async () => {
			const result = await sanitizeHtml('<p><span><img src="emoji.png" height="16"></span> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
		});
	});

	// ── Inline text-adjacency classes ──────────────────────────────

	describe('inline text adjacency (preceded-by-text / followed-by-text)', () => {
		it('both sides: text on both sides of img', async () => {
			const result = await sanitizeHtml('<p>before <img src="x.png" height="16"> after</p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('followed only: text only after img', async () => {
			const result = await sanitizeHtml('<p><img src="x.png" height="16"> after</p>');
			expect(result).not.toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('preceded only: text only before img', async () => {
			const result = await sanitizeHtml('<p>before <img src="x.png" height="16"></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).not.toMatch(/class="[^"]*followed-by-text/);
		});

		it('both sides: element siblings with text content count', async () => {
			const result = await sanitizeHtml('<p><span>a</span><img src="x.png" height="16"><span>b</span></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('<br> stops preceding text scan', async () => {
			const result = await sanitizeHtml('<p>Hello<br><img src="x.png" height="16"> world</p>');
			expect(result).not.toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('text inside element wrapper counts', async () => {
			const result = await sanitizeHtml('<p><span>x</span><img src="x.png" height="16"><span>y</span></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('text inside transparent wrapper (a) counts at img level', async () => {
			// "content " prevents a from being sole child of p → img stays inline
			const result = await sanitizeHtml('<p>content <a href="/"><img src="x.png" height="16"><strong>label</strong></a></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('text before transparent wrapper (a) counts at wrapper level', async () => {
			const result = await sanitizeHtml('<p>text <a href="/"><img src="x.png" height="16"></a></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).not.toMatch(/class="[^"]*followed-by-text/);
		});

		it('text inside wrapper chain counts (span inside a)', async () => {
			// "content " prevents a from being sole child of p → img stays inline
			const result = await sanitizeHtml('<p>content <a href="/"><span><img src="x.png" height="16"> label</span></a></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});

		it('whitespace-only text siblings are skipped', async () => {
			const result = await sanitizeHtml('<p><span>x</span> <img src="x.png" height="16"> <span>y</span></p>');
			expect(result).toMatch(/class="[^"]*preceded-by-text/);
			expect(result).toMatch(/class="[^"]*followed-by-text/);
		});
	});

	// ── Image classification: NOT inline (sole child check) ───────

	describe('inline precondition: sole child of block element', () => {
		it('sole child of <p> is not inline despite height < 100', async () => {
			const result = await sanitizeHtml('<p><img src="icon.png" height="32"></p>');
			expect(result).not.toContain('class="inline-image"');
			expect(result).toContain('class="standalone-image"');
			// height preserved since it's standalone, not inline
			expect(result).toContain('height="32"');
		});

		it('sole child of <div> is not inline', async () => {
			const result = await sanitizeHtml('<div><img src="icon.png" height="16"></div>');
			expect(result).not.toContain('class="inline-image"');
		});

		it('sole child of <td> is not inline', async () => {
			const result = await sanitizeHtml('<table><tr><td><img src="icon.png" height="16"></td></tr></table>');
			expect(result).not.toContain('class="inline-image"');
		});

		it('sole child of <th> is not inline', async () => {
			const result = await sanitizeHtml('<table><tr><th><img src="icon.png" height="16"></th></tr></table>');
			expect(result).not.toContain('class="inline-image"');
		});
	});

	// ── Image classification: standalone ─────────────────────────

	describe('standalone image classification', () => {
		it('sole child of <p> is standalone', async () => {
			const result = await sanitizeHtml('<p><img src="banner.jpg"></p>');
			expect(result).toContain('class="standalone-image"');
		});

		it('sole child of <div> is standalone', async () => {
			const result = await sanitizeHtml('<div><img src="photo.jpg" width="800" height="600"></div>');
			expect(result).toContain('class="standalone-image"');
			// standalone preserves height/width
			expect(result).toContain('width="800"');
			expect(result).toContain('height="600"');
		});

		it('linked image as sole child of <p> is standalone', async () => {
			const result = await sanitizeHtml('<p><a href="/article"><img src="hero.jpg"></a></p>');
			expect(result).toContain('class="standalone-image"');
		});

		it('multi-wrapper sole child is standalone', async () => {
			const result = await sanitizeHtml('<p><span><a href="/"><img src="banner.jpg"></a></span></p>');
			expect(result).toContain('class="standalone-image"');
		});

		it('surrounded by elements on both sides is standalone', async () => {
			const result = await sanitizeHtml('<p><span>a</span><img src="photo.jpg"><span>b</span></p>');
			expect(result).toContain('class="standalone-image"');
		});

		it('surrounded by <br> on both sides is standalone', async () => {
			const result = await sanitizeHtml('<p><br><img src="photo.jpg"><br></p>');
			expect(result).toContain('class="standalone-image"');
		});

		it('image with srcset attribute is standalone', async () => {
			const result = await sanitizeHtml('<img src="photo.jpg" srcset="photo-800.jpg 800w, photo-1200.jpg 1200w" sizes="100vw">');
			expect(result).toContain('class="standalone-image"');
			expect(result).toContain('srcset="photo-800.jpg 800w, photo-1200.jpg 1200w"');
			expect(result).toContain('sizes="100vw"');
		});

		it('image inside <picture> is standalone', async () => {
			const result = await sanitizeHtml('<picture><source srcset="photo.webp" type="image/webp"><img src="photo.jpg" alt="photo"></picture>');
			expect(result).toContain('class="standalone-image"');
		});

		it('image with srcset overrides inline classification (height < 100)', async () => {
			const result = await sanitizeHtml('<p><img src="icon.svg" height="24" srcset="icon.svg 1x, icon@2x.svg 2x"></p>');
			expect(result).toContain('class="standalone-image"');
			// standalone preserves height
			expect(result).toContain('height="24"');
		});

		it('image in <picture> that would have been inline becomes standalone', async () => {
			const result = await sanitizeHtml('<p><picture><img src="icon.svg" height="24"></picture></p>');
			expect(result).toContain('class="standalone-image"');
		});
	});

	// ── Image classification: NOT standalone ─────────────────────

	describe('standalone exclusion', () => {
		it('image in <figure> with figcaption is not standalone (default)', async () => {
			const result = await sanitizeHtml('<figure><img src="art.jpg"><figcaption>Desc</figcaption></figure>');
			expect(result).not.toContain('class="standalone-image"');
			expect(result).not.toContain('class="inline-image"');
		});

		it('image in <figure> alone is not standalone', async () => {
			const result = await sanitizeHtml('<figure><img src="art.jpg"></figure>');
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image with srcset in <figure> is not standalone', async () => {
			const result = await sanitizeHtml('<figure><img src="art.jpg" srcset="art-800.jpg 800w" sizes="100vw"><figcaption>Desc</figcaption></figure>');
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image in <picture> inside <figure> is not standalone', async () => {
			const result = await sanitizeHtml('<figure><picture><source srcset="art.webp" type="image/webp"><img src="art.jpg" alt="art"></picture><figcaption>Desc</figcaption></figure>');
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image inside <table> is not standalone', async () => {
			const result = await sanitizeHtml('<table><tr><td><img src="chart.png"></td></tr></table>');
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image with srcset inside <table> is not standalone', async () => {
			const result = await sanitizeHtml(
				'<table><tr><td><img src="chart.png" srcset="chart-2x.png 2x"></td></tr></table>'
			);
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image in <picture> inside <table> is not standalone', async () => {
			const result = await sanitizeHtml(
				'<table><tr><td><picture><source srcset="chart.webp"><img src="chart.png"></picture></td></tr></table>'
			);
			expect(result).not.toContain('class="standalone-image"');
		});

		it('image with text on both sides is not standalone (default)', async () => {
			const result = await sanitizeHtml('<p>left <img src="x.jpg"> right</p>');
			expect(result).not.toContain('class="standalone-image"');
			expect(result).not.toContain('class="inline-image"');
		});
	});

	// ── Image classification: unhandled / pass-through ────────────

	describe('unhandled cases (default)', () => {
		it('consecutive images are default (no class)', async () => {
			const result = await sanitizeHtml('<p><img src="a.jpg"><img src="b.jpg"></p>');
			expect(result).not.toContain('class="');
		});

		it('images separated by <br> are default', async () => {
			const result = await sanitizeHtml('<p><img src="a.jpg"><br><img src="b.jpg"></p>');
			expect(result).not.toContain('class="');
		});

		it('data URI without declared height is default', async () => {
			const result = await sanitizeHtml('<p>text <img src="data:image/svg+xml,%3Csvg..."> more</p>');
			expect(result).not.toContain('class="');
		});
	});

	// ── classifyImages direct ───────────────────────────────────

	describe('classifyImages (direct, no DOMPurify pass)', () => {
		// Direct tests for edge cases that DOMPurify might mangle
		it('returns HTML with inline-image class for height < 100', async () => {
			const result = classifyImages('<p><img src="x.png" height="16"> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).not.toContain('height="16"');
		});

		it('returns standalone-image when image has height >= 100 and is sole child', async () => {
			const result = classifyImages('<p><img src="x.png" height="400"></p>');
			expect(result).toContain('class="standalone-image"');
			expect(result).toContain('height="400"');
		});

		it('no class for images with text siblings', async () => {
			const result = classifyImages('<p>a <img src="x.png"> b</p>');
			expect(result).not.toContain('class="');
		});

		it('inline inside transparent a wrapper when not sole child', async () => {
			const result = classifyImages('<p><a href="/"><img src="icon.svg" height="24"></a> text</p>');
			expect(result).toMatch(/class="[^"]*inline-image/);
			expect(result).not.toContain('height="24"');
		});

		it('standalone when wrapper is sole child', async () => {
			const result = classifyImages('<p><a href="/"><img src="banner.jpg" height="400"></a></p>');
			expect(result).toContain('class="standalone-image"');
			expect(result).toContain('height="400"');
		});
	});

	// ── Relative URL resolution ─────────────────────────────────

	describe('relative URL resolution', () => {
		it('resolves relative img src', async () => {
			const result = await sanitizeHtml('<img src="/images/photo.jpg" alt="photo">', 'https://example.com/blog');
			expect(result).toContain('src="https://example.com/images/photo.jpg"');
		});

		it('resolves relative a href', async () => {
			const result = await sanitizeHtml('<a href="/article">link</a>', 'https://example.com/blog');
			expect(result).toContain('href="https://example.com/article"');
		});

		it('resolves relative video src and poster', async () => {
			const result = await sanitizeHtml('<video src="/videos/clip.mp4" poster="/thumbs/clip.jpg"></video>', 'https://example.com');
			expect(result).toContain('src="https://example.com/videos/clip.mp4"');
			expect(result).toContain('poster="https://example.com/thumbs/clip.jpg"');
		});

		it('does not modify absolute URLs', async () => {
			const result = await sanitizeHtml('<img src="https://cdn.example.com/photo.jpg" alt="">', 'https://example.com');
			expect(result).toContain('src="https://cdn.example.com/photo.jpg"');
		});

		it('does not modify data URIs', async () => {
			const result = await sanitizeHtml('<img src="data:image/svg+xml,%3Csvg..." alt="">', 'https://example.com');
			expect(result).toContain('src="data:image/svg+xml,%3Csvg..."');
		});

		it('resolves srcset URLs', async () => {
			const result = await sanitizeHtml('<img src="photo.jpg" srcset="photo-800.jpg 800w, photo-1200.jpg 1200w" sizes="100vw">', 'https://example.com/blog/');
			expect(result).toContain('srcset="https://example.com/blog/photo-800.jpg 800w, https://example.com/blog/photo-1200.jpg 1200w"');
		});

		it('resolves srcset with 1x/2x descriptors', async () => {
			const result = await sanitizeHtml('<img src="icon.svg" srcset="icon.svg 1x, icon@2x.svg 2x">', 'https://example.com/images/');
			expect(result).toContain('srcset="https://example.com/images/icon.svg 1x, https://example.com/images/icon@2x.svg 2x"');
		});

		it('resolves source srcset inside picture', async () => {
			const result = await sanitizeHtml('<picture><source srcset="photo.webp" type="image/webp"><img src="photo.jpg" alt="photo"></picture>', 'https://example.com');
			expect(result).toContain('srcset="https://example.com/photo.webp"');
		});

		it('resolves relative URLs without baseUrl (no change)', async () => {
			const result = await sanitizeHtml('<img src="/images/photo.jpg" alt="photo">');
			expect(result).toContain('src="/images/photo.jpg"');
		});

		it('resolves relative path without leading slash', async () => {
			const result = await sanitizeHtml('<img src="images/photo.jpg" alt="photo">', 'https://example.com/blog/');
			expect(result).toContain('src="https://example.com/blog/images/photo.jpg"');
		});

		it('handles empty html', async () => {
			expect(await sanitizeHtml('', 'https://example.com')).toBe('');
		});

		it('handles html with no URLs', async () => {
			const result = await sanitizeHtml('<p>Hello world</p>', 'https://example.com');
			expect(result).toBe('<p>Hello world</p>');
		});
	});

	// ── Syntax highlighting ──────────────────────────────────

	describe('syntax highlighting', () => {
		// Must not contain unescaped < or > — JSDOM would interpret them as HTML tags
		const PYTHON_SNIPPET =
			'import os\nimport sys\nfrom typing import List\n\n' +
			'def load_data(path: str) -> List[str]:\n' +
			'    with open(path) as f:\n' +
			'        return [line.strip() for line in f if line.strip()]\n\n' +
			'def process(items: List[str]) -> List[str]:\n' +
			'    result = []\n' +
			'    for item in items:\n' +
			'        if not item.startswith("#"):\n' +
			'            result.append(item.upper())\n' +
			'    return result\n\n' +
			'class Reporter:\n' +
			'    def __init__(self, name: str):\n' +
			'        self.name = name\n' +
			'        self.count = 0\n\n' +
			'    def report(self, msg: str) -> None:\n' +
			'        self.count += 1\n' +
			'        print(f"[{self.name}] {msg}")\n\n' +
			'def main() -> None:\n' +
			'    args = sys.argv[1:]\n' +
			'    if not args:\n' +
			'        print("Usage: script.py PATH")\n' +
			'        sys.exit(1)\n' +
			'    r = Reporter("test")\n' +
			'    for path in args:\n' +
			'        if os.path.exists(path):\n' +
			'            data = load_data(path)\n' +
			'            output = process(data)\n' +
			'            r.report(f"processed {len(output)} lines")\n' +
			'            for line in output:\n' +
			'                print(line)\n\n' +
			'if __name__ == "__main__":\n' +
			'    main()';

		it('highlights <pre> when auto-relevance >= 12', async () => {
			const result = await sanitizeHtml(`<pre>${PYTHON_SNIPPET}</pre>`);
			expect(result).toMatch(/^<pre class="language-\w+" data-relevance="\d+">/);
			expect(result).toContain('hljs-');
		});

		it('highlights <pre><code> when auto-relevance >= 12', async () => {
			const result = await sanitizeHtml(`<pre><code>${PYTHON_SNIPPET}</code></pre>`);
			expect(result).toMatch(/^<pre class="language-\w+" data-relevance="\d+">/);
			expect(result).toContain('hljs-');
			expect(result).toContain('<code>');
			expect(result).toContain('</code>');
		});

		it('skips highlighting when auto-relevance < 12 but still sets class and attr', async () => {
			const result = await sanitizeHtml('<pre>var x = 1;</pre>');
			expect(result).toMatch(/^<pre class="language-\w+" data-relevance="\d+">/);
			expect(result).not.toContain('hljs-');
		});

		it('skips <pre> with non-code child elements', async () => {
			const input = '<pre><b>bold text</b></pre>';
			const result = await sanitizeHtml(input);
			expect(result).toBe(input);
		});

		it('skips <pre> with mixed children', async () => {
			const input = '<pre>text<code>code</code>more</pre>';
			const result = await sanitizeHtml(input);
			expect(result).toBe(input);
		});

		it('skips empty <pre>', async () => {
			const result = await sanitizeHtml('<pre>  </pre>');
			expect(result).toBe('<pre>  </pre>');
		});

		it('sets class and attr on <pre><code> when auto-relevance < 12', async () => {
			const result = await sanitizeHtml('<pre><code>var x = 1;</code></pre>');
			expect(result).toMatch(/^<pre class="language-\w+" data-relevance="\d+">/);
			expect(result).toContain('<code>var x = 1;</code>');
		});

		it('does not interfere with non-pre elements', async () => {
			const result = await sanitizeHtml('<p>Hello <code>world</code></p>');
			expect(result).toBe('<p>Hello <code>world</code></p>');
		});

		it('works alongside relative URL resolution', async () => {
			const result = await sanitizeHtml(`<pre>${PYTHON_SNIPPET}</pre><img src="/pic.jpg">`, 'https://example.com');
			expect(result).toMatch(/^<pre class="language-\w+" data-relevance="\d+">/);
			expect(result).toContain('src="https://example.com/pic.jpg"');
		});

		it('uses language-javascript class on <pre> to select language', async () => {
			const result = await sanitizeHtml('<pre class="language-javascript">var x = 1;</pre>');
			expect(result).toContain('language-javascript');
			expect(result).toContain('data-relevance="9999"');
			expect(result).toContain('hljs-keyword');
		});

		it('uses language-python class on <pre> to select language', async () => {
			const result = await sanitizeHtml('<pre class="language-python">def hello(name):\n    return name</pre>');
			expect(result).toContain('language-python');
			expect(result).toContain('data-relevance="9999"');
		});

		it('uses bare language class (js) on <pre>', async () => {
			const result = await sanitizeHtml('<pre class="js">var x = 1;</pre>');
			expect(result).toContain('language-javascript');
			expect(result).toContain('data-relevance="9999"');
			expect(result).toContain('hljs-keyword');
		});

		it('language- prefixed class takes priority over bare class', async () => {
			const result = await sanitizeHtml('<pre class="language-javascript js">x = 1</pre>');
			expect(result).toContain('language-javascript');
			expect(result).toContain('data-relevance="9999"');
		});

		it('uses language class from sole-child <code> when <pre> has no language class', async () => {
			const result = await sanitizeHtml('<pre><code class="language-javascript">var x = 1;</code></pre>');
			expect(result).toContain('language-javascript');
			expect(result).toContain('data-relevance="9999"');
		});

		it('adds language class and attr even when auto-relevance is low', async () => {
			const result = await sanitizeHtml('<pre class="some-random-class">var x = 1;</pre>');
			expect(result).toMatch(/^<pre class="some-random-class language-\w+" data-relevance="\d+">/);
			expect(result).not.toContain('hljs-');
		});
	});
});
