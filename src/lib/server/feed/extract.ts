import { Readability, isProbablyReaderable } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export type ExtractResult = {
	content: string | null;
	notRenderable: boolean;
};

export function extractFromPage(html: string, url: string): ExtractResult {
	const doc = new JSDOM(html, { url });
	const document = doc.window.document;

	if (!isProbablyReaderable(document)) {
		return { content: null, notRenderable: true };
	}

	const reader = new Readability(document);
	const result = reader.parse();

	if (!result || !result.content) {
		return { content: null, notRenderable: false };
	}

	return { content: result.content, notRenderable: false };
}

export function compareContentLength(
	extractedText: string,
	feedText: string | null | undefined
): boolean {
	const feedLen = (feedText ?? '').length;
	const extractedLen = extractedText.length;
	return extractedLen > Math.max(feedLen * 2, feedLen + 500);
}

export function getTextContent(html: string): string {
	const doc = new JSDOM(html);
	return doc.window.document.body.textContent ?? '';
}
