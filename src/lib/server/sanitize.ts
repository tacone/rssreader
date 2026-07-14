import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import hljs from 'highlight.js';
import { minify, type Options } from 'html-minifier-terser';

const AUTO_LANGUAGES = [
	'bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'go', 'graphql', 'ini',
	'java', 'javascript', 'json', 'kotlin', 'less', 'lua', 'makefile',
	'markdown', 'objectivec', 'perl', 'php', 'php-template', 'plaintext',
	'python', 'python-repl', 'r', 'ruby', 'rust', 'scss', 'shell', 'sql',
	'svelte', 'swift', 'typescript', 'vbnet', 'wasm', 'xml', 'yaml',
];

const window = new JSDOM('').window;
const purify = createDOMPurify(window);

const ALLOWED_TAGS = [
	'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br',
	'caption', 'cite', 'code', 'col', 'colgroup',
	'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
	'em', 'figcaption', 'figure',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
	'i', 'img', 'ins', 'kbd', 'li', 'mark',
	'ol', 'p', 'picture', 'pre', 'q',
	's', 'samp', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
	'video',
	'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr',
	'u', 'ul', 'var',
];

const ALLOWED_ATTR = [
	'abbr', 'alt', 'cite', 'class', 'colspan', 'controls', 'datetime', 'decoding',
	'height', 'href', 'hreflang', 'loading', 'loop', 'playsinline',
	'poster', 'rel', 'rowspan', 'scope', 'sizes', 'src', 'srcset', 'start', 'target', 'title', 'type', 'value', 'width',
];

const YOUTUBE_RE = /<iframe[^>]*src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
const TED_RE = /<iframe[^>]*src="https?:\/\/embed\.ted\.com\/talks\/([^"]+)"[^>]*>[\s\S]*?<\/iframe>/gi;
const VIDEO_RE = /<video\b([^>]*?)>/gi;

function preprocessEmbeds(html: string): string {
	html = html.replace(YOUTUBE_RE, (_, videoId) => {
		const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
		const href = `https://www.youtube.com/watch?v=${videoId}`;
		return `<a href="${href}" data-provider="youtube" data-videoid="${videoId}"><img src="${thumb}" alt="YouTube video" loading="lazy"></a>`;
	});
	html = html.replace(TED_RE, (_, talkPath) => {
		const href = `https://embed.ted.com/talks/${talkPath}`;
		return `<a href="${href}">TED Talk</a>`;
	});
	html = html.replace(VIDEO_RE, (match, attrs) => {
		const clean = attrs.replace(/\/?\s*$/, '');
		if (/\bcontrols\b/.test(clean)) return match;
		return `<video ${clean} controls>`;
	});
	return html;
}

// ── Image classification ────────────────────────────────────────

const BLOCK_TAGS = new Set([
	'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'blockquote', 'li', 'dd', 'dt', 'pre', 'ol', 'ul',
	'figure', 'figcaption',
	'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
	'caption', 'details', 'summary', 'dl',
]);

const INLINE_WRAPPER_TAGS = new Set([
	'a', 'span', 'b', 'i', 'em', 'strong', 'u', 's',
	'abbr', 'cite', 'code', 'del', 'dfn', 'ins', 'kbd',
	'mark', 'q', 'samp', 'small', 'sub', 'sup', 'time', 'var',
]);

const INLINE_CLASS_WHITELIST = new Set(['wp-smiley']);

const INLINE_DIMENSION_RE = /(?:^|[^0-9])\d{1,2}x\d{1,2}(?=[^0-9]|$)/;

function getOutermostWrapper(el: Element): Element {
	let current = el;
	while (current.parentElement && INLINE_WRAPPER_TAGS.has(current.parentElement.tagName.toLowerCase())) {
		current = current.parentElement;
	}
	return current;
}

function isSoleChild(el: Element): boolean {
	const parent = el.parentElement;
	if (!parent) return false;
	const children = Array.from(parent.childNodes);
	return children.every(
		(node) =>
			node === el || (node.nodeType === 3 && (!node.textContent || !node.textContent!.trim().length))
	);
}

function isSurroundedByBoundaries(el: Element): boolean {
	const parent = el.parentElement;
	if (!parent) return false;
	const children = Array.from(parent.childNodes);
	const idx = children.indexOf(el);
	if (idx === -1) return false;

	for (let i = 0; i < idx; i++) {
		const node = children[i];
		if (node.nodeType === 3) {
			if (node.textContent && node.textContent.trim().length > 0) return false;
		} else if (node.nodeType !== 1) {
			return false;
		}
	}

	for (let i = idx + 1; i < children.length; i++) {
		const node = children[i];
		if (node.nodeType === 3) {
			if (node.textContent && node.textContent.trim().length > 0) return false;
		} else if (node.nodeType !== 1) {
			return false;
		}
	}

	return true;
}

function hasTableAncestor(el: Element): boolean {
	let parent = el.parentElement;
	while (parent) {
		const tag = parent.tagName.toLowerCase();
		if (tag === 'table' || tag === 'tbody' || tag === 'thead' || tag === 'tfoot' || tag === 'tr' || tag === 'td' || tag === 'th') {
			return true;
		}
		parent = parent.parentElement;
	}
	return false;
}

function hasFigureAncestor(el: Element): boolean {
	let parent = el.parentElement;
	while (parent) {
		if (parent.tagName.toLowerCase() === 'figure') return true;
		parent = parent.parentElement;
	}
	return false;
}

function isInlineWrapper(el: Element | null): boolean {
	if (!el) return false;
	return INLINE_WRAPPER_TAGS.has(el.tagName.toLowerCase());
}

function hasAdjacentText(el: Element, direction: 'preceding' | 'following'): boolean {
	const parent = el.parentElement;
	if (!parent) return false;

	const children = Array.from(parent.childNodes);
	const idx = children.indexOf(el);
	if (idx === -1) return false;

	const start = direction === 'preceding' ? idx - 1 : idx + 1;
	const end = direction === 'preceding' ? -1 : children.length;
	const step = direction === 'preceding' ? -1 : 1;

	for (let i = start; direction === 'preceding' ? i > end : i < end; i += step) {
		const node = children[i];
		if (node.nodeType === 3) {
			if (node.textContent && node.textContent.trim().length > 0) return true;
		} else if (node.nodeType === 1) {
			const element = node as Element;
			if (element.tagName.toLowerCase() === 'br') return false;
			if (element.textContent && element.textContent.trim().length > 0) return true;
		}
	}

	return false;
}

function hasAdjacentTextInChain(el: Element, direction: 'preceding' | 'following'): boolean {
	let current: Element | null = el;
	while (current) {
		if (hasAdjacentText(current, direction)) return true;
		if (current.parentElement && isInlineWrapper(current.parentElement)) {
			current = current.parentElement;
		} else {
			break;
		}
	}
	return false;
}

function hasImgSiblings(el: Element): boolean {
	const parent = el.parentElement;
	if (!parent) return false;
	return Array.from(parent.children).some(
		(child) => child !== el && child.tagName.toLowerCase() === 'img'
	);
}

function isInlineImage(img: Element): boolean {
	// Images inside <figure> are never inline — figure provides its own layout
	if (img.closest('figure')) return false;

	// Unconditional triggers: these override the sole-child precondition
	if (img.closest('pre')) return true;

	const cls = img.getAttribute('class');
	if (cls) {
		for (const c of cls.split(/\s+/)) {
			if (INLINE_CLASS_WHITELIST.has(c)) return true;
		}
	}

	// Conditional triggers: require the img to NOT be a sole child of a block element
	const wrapper = getOutermostWrapper(img);
	const parent = wrapper.parentElement;
	if (!parent) return false;

	const tag = parent.tagName.toLowerCase();
	if (BLOCK_TAGS.has(tag) || tag === 'tr' || tag === 'td' || tag === 'th') {
		if (isSoleChild(wrapper)) return false;
	}

	const heightAttr = img.getAttribute('height');
	if (heightAttr) {
		const h = parseInt(heightAttr, 10);
		if (!isNaN(h) && h < 100) return true;
	}

	const src = img.getAttribute('src') || '';
	try {
		const url = new URL(src, 'https://localhost');
		const hParam = url.searchParams.get('h') || url.searchParams.get('height');
		if (hParam) {
			const h = parseInt(hParam, 10);
			if (!isNaN(h) && h < 100) return true;
		}
	} catch {
		// invalid URL — skip query param check
	}

	if (INLINE_DIMENSION_RE.test(src)) return true;

	return false;
}

function isStandaloneImage(img: Element): boolean {
	if (hasFigureAncestor(img)) return false;
	if (hasTableAncestor(img)) return false;

	const wrapper = getOutermostWrapper(img);
	const parent = wrapper.parentElement;
	if (!parent) return false;

	// Consecutive images are an unhandled case — skip classification
	if (hasImgSiblings(wrapper)) return false;

	return isSoleChild(wrapper) || isSurroundedByBoundaries(wrapper);
}

export function classifyImages(html: string): string {
	if (!html.includes('<img')) return html;

	const doc = new JSDOM(html).window.document;
	const body = doc.body;
	const images = Array.from(body.querySelectorAll('img'));

	for (const img of images) {
		const isSrcsetOrPicture = img.hasAttribute('srcset') || img.closest('picture');
		if (isSrcsetOrPicture && !hasFigureAncestor(img) && !hasTableAncestor(img)) {
			img.classList.add('standalone-image');
		} else if (isInlineImage(img)) {
			img.classList.add('inline-image');
			if (hasAdjacentTextInChain(img, 'preceding')) img.classList.add('preceded-by-text');
			if (hasAdjacentTextInChain(img, 'following')) img.classList.add('followed-by-text');
			img.removeAttribute('height');
			img.removeAttribute('width');
		} else if (isStandaloneImage(img)) {
			img.classList.add('standalone-image');
		}
	}

	return body.innerHTML;
}

// ── Relative URL resolution ────────────────────────────────────

const URL_ATTRS = ['src', 'href', 'poster'];

function resolveUrl(url: string, base: string): string {
	if (!url) return url;
	try {
		return new URL(url, base).href;
	} catch {
		return url;
	}
}

function resolveSrcset(srcset: string, base: string): string {
	return srcset
		.split(',')
		.map((candidate) => {
			const parts = candidate.trim().split(/\s+/);
			if (parts.length === 0) return candidate;
			parts[0] = resolveUrl(parts[0], base);
			return parts.join(' ');
		})
		.join(', ');
}

function resolveRelativeUrls(html: string, baseUrl: string): string {
	if (!html.includes('"') && !html.includes("'")) return html;

	const doc = new JSDOM(html).window.document;
	const body = doc.body;

	for (const attr of URL_ATTRS) {
		for (const el of Array.from(body.querySelectorAll(`[${attr}]`))) {
			const val = el.getAttribute(attr);
			if (val) el.setAttribute(attr, resolveUrl(val, baseUrl));
		}
	}

	for (const el of Array.from(body.querySelectorAll('[srcset]'))) {
		const val = el.getAttribute('srcset');
		if (val) el.setAttribute('srcset', resolveSrcset(val, baseUrl));
	}

	return body.innerHTML;
}

// ── Syntax highlighting ────────────────────────────────────────

function isWhitespaceNode(node: Node): boolean {
	return node.nodeType === 3 && (!node.textContent || !node.textContent.trim().length);
}

const EXPLICIT_RELEVANCE = 9999;
const MIN_AUTO_RELEVANCE = 12;

const languageRegistration: Record<string, string> = Object.create(null);
{
	const langs = hljs.listLanguages();
	for (const key of langs) {
		const lang = hljs.getLanguage(key);
		if (!lang) continue;
		languageRegistration[key] = key;
		if (lang.name) languageRegistration[lang.name] = key;
		if (lang.aliases) {
			for (const alias of lang.aliases) languageRegistration[alias] = key;
		}
	}
}

function resolveLanguage(input: string): string | null {
	const key = languageRegistration[input];
	if (key) return key;
	if (hljs.getLanguage(input)) return input;
	return null;
}

function detectLanguageFromElement(el: Element): string | null {
	const classes = Array.from(el.classList);

	for (const cls of classes) {
		if (cls.startsWith('language-')) {
			const candidate = cls.slice('language-'.length);
			if (!candidate) continue;
			const lang = resolveLanguage(candidate);
			if (lang) return lang;
		}
	}

	for (const cls of classes) {
		if (cls.startsWith('language-')) continue;
		const lang = resolveLanguage(cls);
		if (lang) return lang;
	}

	return null;
}

function highlightCodeBlocks(html: string): string {
	if (!html.includes('<pre')) return html;

	const doc = new JSDOM(html).window.document;
	const body = doc.body;
	const preBlocks = Array.from(body.querySelectorAll('pre'));

	for (const pre of preBlocks) {
		const children = Array.from(pre.childNodes);
		const childElements = children.filter((n): n is Element => n.nodeType === 1);

		let codeText: string | null = null;
		let isCodeChild = false;

		if (childElements.length === 0) {
			codeText = pre.textContent;
		} else if (childElements.length === 1 && childElements[0].tagName.toLowerCase() === 'code') {
			const onlyElement = childElements[0];
			if (children.every((n) => n === onlyElement || isWhitespaceNode(n))) {
				codeText = onlyElement.textContent;
				isCodeChild = true;
			}
		}

		if (!codeText || !codeText.trim()) continue;

		const explicitLang = detectLanguageFromElement(pre) || (isCodeChild && detectLanguageFromElement(childElements[0]));

		let highlighted: ReturnType<typeof hljs.highlightAuto>;
		let doHighlight: boolean;

		if (explicitLang) {
			highlighted = hljs.highlight(codeText, { language: explicitLang });
			highlighted.relevance = EXPLICIT_RELEVANCE;
			doHighlight = true;
		} else {
			highlighted = hljs.highlightAuto(codeText, AUTO_LANGUAGES);
			doHighlight = highlighted.relevance >= MIN_AUTO_RELEVANCE;
		}

		const result = {
			value: highlighted.value,
			language: highlighted.language || 'plaintext',
			relevance: highlighted.relevance,
		};

		if (doHighlight) {
			if (isCodeChild) {
				childElements[0].innerHTML = result.value;
			} else {
				pre.innerHTML = result.value;
			}
		}

		const langClass = `language-${result.language || 'plaintext'}`;
		pre.classList.add(langClass);
		pre.setAttribute('data-relevance', String(result.relevance));
	}

	return body.innerHTML;
}

// ── HTML minification ───────────────────────────────────────────

const MINIFY_OPTIONS:Options = {
	collapseWhitespace: true,
	removeComments: true,
	collapseBooleanAttributes: true,
	removeEmptyAttributes: true,
	decodeEntities: true,
	ignoreCustomFragments: [/srcset="[^"]*"/g],
	removeEmptyElements: true,
	removeRedundantAttributes: true,
	sortAttributes: true,
};

// minification makes the process ~30% slower (e.g. from 36s to 48s)
const MINIFY_HTML = false;

// ── Public API ──────────────────────────────────────────────────

export async function sanitizeHtml(html: string, baseUrl?: string): Promise<string> {
	if (!html) return '';
	if (baseUrl) html = resolveRelativeUrls(html, baseUrl);
	html = highlightCodeBlocks(html);
	const preprocessed = preprocessEmbeds(html);
	const classified = classifyImages(preprocessed);
	const sanitized = purify.sanitize(classified, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false,
		ADD_ATTR: ['data-provider', 'data-videoid', 'data-relevance'],
		ALLOW_UNKNOWN_PROTOCOLS: false,
	});
	if (!MINIFY_HTML) return sanitized;

	const minified = await minify(sanitized, MINIFY_OPTIONS);
	console.log(`minified from ${sanitized.length} to ${minified.length} [${(100 * minified.length / sanitized.length).toFixed(2)}]`)

	return minified;
}
