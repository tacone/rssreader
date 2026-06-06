import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = createDOMPurify(window);

const ALLOWED_TAGS = [
	'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br',
	'caption', 'cite', 'code', 'col', 'colgroup',
	'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
	'em', 'figcaption', 'figure',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
	'i', 'img', 'ins', 'kbd', 'li', 'mark',
	'ol', 'p', 'pre', 'q',
	's', 'samp', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
	'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr',
	'u', 'ul', 'var',
];

const ALLOWED_ATTR = [
	'abbr', 'alt', 'cite', 'colspan', 'controls', 'datetime', 'decoding',
	'height', 'href', 'hreflang', 'loading', 'loop', 'playsinline',
	'rel', 'rowspan', 'scope', 'src', 'start', 'target', 'title', 'type', 'value', 'width',
];

const YOUTUBE_RE = /<iframe[^>]*src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
const TED_RE = /<iframe[^>]*src="https?:\/\/embed\.ted\.com\/talks\/([^"]+)"[^>]*>[\s\S]*?<\/iframe>/gi;

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
	return html;
}

export function sanitizeHtml(html: string): string {
	return purify.sanitize(preprocessEmbeds(html), {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false,
		ADD_ATTR: ['data-provider', 'data-videoid'],
		ALLOW_UNKNOWN_PROTOCOLS: false,
	});
}
