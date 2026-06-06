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

export function sanitizeHtml(html: string): string {
	return purify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false,
		ALLOW_UNKNOWN_PROTOCOLS: false,
	});
}
