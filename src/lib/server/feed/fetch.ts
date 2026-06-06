import { parseFeed } from 'feedsmith';

export type FetchResult = {
	meta: {
		title?: string;
		description?: string;
		link?: string;
		language?: string;
		image?: string;
	};
	items: Array<{
		guid: string;
		url?: string;
		title?: string;
		content?: string;
		summary?: string;
		author?: string;
		publishedAt?: Date;
		rawTitle?: string;
		rawSummary?: string;
		rawContent?: string;
	}>;
	etag?: string;
	lastModified?: string;
};

export function extractText(val: Record<string, unknown> | string | undefined): string | undefined {
	if (typeof val === 'string') return val;
	return val?.value as string | undefined;
}

export async function fetchFeed(
	url: string,
	options?: { etag?: string; lastModified?: string }
): Promise<FetchResult> {
	const headers: Record<string, string> = {
		'User-Agent': 'RSSReader/1.0',
		Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml'
	};

	if (options?.etag) headers['If-None-Match'] = options.etag;
	if (options?.lastModified) headers['If-Modified-Since'] = options.lastModified;

	const response = await fetch(url, { headers });

	if (response.status === 304) {
		return { meta: {}, items: [] };
	}

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const xml = await response.text();
	const parsed = parseFeed(xml);

	const meta: FetchResult['meta'] = {};
	const items: FetchResult['items'] = [];

	if (parsed.format === 'rss') {
		const f = parsed.feed as Record<string, unknown>;
		meta.title = f.title as string | undefined;
		meta.description = f.description as string | undefined;
		meta.link = f.link as string | undefined;
		meta.language = f.language as string | undefined;
		const image = f.image as Record<string, unknown> | undefined;
		meta.image = image?.url as string | undefined;

		const rawItems = (f.items ?? []) as Array<Record<string, unknown>>;
		for (const item of rawItems) {
			const guid = item.guid as Record<string, unknown> | undefined;
			const content = item.content as Record<string, unknown> | undefined;
			const authors = item.authors as Array<string | Record<string, string>> | undefined;
			const rawContent = (content?.encoded as string) ?? (item.description as string | undefined);
			items.push({
				guid: (guid?.value as string) ?? (item.link as string) ?? '',
				url: item.link as string | undefined,
				title: item.title as string | undefined,
				content: rawContent,
				summary: item.description as string | undefined,
				rawTitle: item.title as string | undefined,
				rawSummary: item.description as string | undefined,
				rawContent,
				author: typeof authors?.[0] === 'string' ? authors[0] : (authors?.[0] as Record<string, string> | undefined)?.name,
				publishedAt: item.pubDate ? new Date(item.pubDate as string) : undefined
			});
		}
	} else if (parsed.format === 'atom') {
		const f = parsed.feed as Record<string, unknown>;
		const title = f.title as Record<string, unknown> | string | undefined;
		meta.title = typeof title === 'string' ? title : (title?.value as string | undefined);
		const subtitle = f.subtitle as Record<string, unknown> | string | undefined;
		meta.description = typeof subtitle === 'string' ? subtitle : (subtitle?.value as string | undefined);
		const links = f.links as Array<Record<string, unknown>> | undefined;
		meta.link = links?.[0]?.href as string | undefined;
		meta.language = f.language as string | undefined;
		meta.image = f.icon as string | undefined;

		const entries = (f.entries ?? []) as Array<Record<string, unknown>>;
		for (const entry of entries) {
			const entryTitle = entry.title as Record<string, unknown> | string | undefined;
			const entryContent = entry.content as Record<string, unknown> | string | undefined;
			const entrySummary = entry.summary as Record<string, unknown> | string | undefined;
			const entryLinks = entry.links as Array<Record<string, unknown>> | undefined;
			const authors = entry.authors as Array<Record<string, unknown>> | undefined;
			const rawContent = extractText(entryContent) ?? extractText(entrySummary);
			const title = extractText(entryTitle);
			items.push({
				guid: entry.id as string,
				url: entryLinks?.[0]?.href as string | undefined,
				title,
				content: rawContent,
				summary: extractText(entrySummary),
				rawTitle: title,
				rawContent,
				rawSummary: extractText(entrySummary),
				author: authors?.[0]?.name as string | undefined,
				publishedAt: entry.published ? new Date(entry.published as string) : undefined
			});
		}
	} else if (parsed.format === 'rdf') {
		const f = parsed.feed as Record<string, unknown>;
		meta.title = f.title as string | undefined;
		meta.description = f.description as string | undefined;
		meta.link = f.link as string | undefined;
		const image = f.image as Record<string, unknown> | undefined;
		meta.image = image?.url as string | undefined;

		const rawItems = (f.items ?? []) as Array<Record<string, unknown>>;
		for (const item of rawItems) {
			const dc = item.dc as Record<string, unknown> | undefined;
			const rawContent = item.description as string | undefined;
			items.push({
				guid: (item.link as string) ?? '',
				url: item.link as string | undefined,
				title: item.title as string | undefined,
				content: rawContent,
				summary: rawContent,
				rawTitle: item.title as string | undefined,
				rawContent,
				rawSummary: rawContent,
				publishedAt: dc?.date ? new Date(dc.date as string) : undefined
			});
		}
	} else if (parsed.format === 'json') {
		const f = parsed.feed as Record<string, unknown>;
		meta.title = f.title as string | undefined;
		meta.description = f.description as string | undefined;
		meta.link = f.home_page_url as string | undefined;
		meta.image = f.icon as string | undefined;

		const rawItems = (f.items ?? []) as Array<Record<string, unknown>>;
		for (const item of rawItems) {
			const authors = item.authors as Array<Record<string, unknown>> | undefined;
			const rawContent = (item.content_html as string) ?? (item.content_text as string | undefined);
			items.push({
				guid: item.id as string ?? '',
				url: item.url as string | undefined,
				title: item.title as string | undefined,
				content: rawContent,
				summary: item.summary as string | undefined,
				rawTitle: item.title as string | undefined,
				rawContent,
				rawSummary: item.summary as string | undefined,
				author: authors?.[0]?.name as string | undefined,
				publishedAt: item.date_published ? new Date(item.date_published as string) : undefined
			});
		}
	}

	return { meta, items, etag: response.headers.get('ETag') ?? undefined, lastModified: response.headers.get('Last-Modified') ?? undefined };
}
