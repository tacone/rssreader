import { randomUUID } from 'node:crypto';
import { feeds as feedsTable, items as itemsTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema';
import type { FetchResult } from './fetch';
import { fetchFeed } from './fetch';
import { generateSlug } from '../slug';
import { htmlToText } from '../html';
import { sanitizeHtml } from '../sanitize';
import { extractFromPage } from './extract';
import { detectPartialFeed } from './detect-partial';

export type DB = PostgresJsDatabase<typeof schema>;

export async function upsertFeed(
	db: DB,
	userId: string,
	url: string,
	fetchResult: FetchResult,
	isPartialFeed?: boolean
) {
	const existing = await db
		.select()
		.from(feedsTable)
		.where(and(eq(feedsTable.userId, userId), eq(feedsTable.url, url)))
		.limit(1);

	let feedId: string;

	if (existing.length > 0) {
		feedId = existing[0].id;
		const slug = existing[0].slug || generateSlug(feedId, fetchResult.meta.title, url);
		const updateData: Record<string, unknown> = {
			slug,
			title: fetchResult.meta.title,
			description: fetchResult.meta.description,
			siteUrl: fetchResult.meta.link,
			icon: fetchResult.meta.image,
			etag: fetchResult.etag,
			lastModified: fetchResult.lastModified,
			lastFetchedAt: sql`now()`,
			errorCount: 0
		};
		if (isPartialFeed !== undefined) {
			updateData.isPartialFeed = isPartialFeed ? 1 : 0;
		}
		await db
			.update(feedsTable)
			.set(updateData)
			.where(eq(feedsTable.id, feedId));
	} else {
		feedId = randomUUID();
		const slug = generateSlug(feedId, fetchResult.meta.title, url);
		await db.insert(feedsTable).values({
			id: feedId,
			slug,
			userId,
			url,
			title: fetchResult.meta.title,
			description: fetchResult.meta.description,
			siteUrl: fetchResult.meta.link,
			icon: fetchResult.meta.image,
			etag: fetchResult.etag,
			lastModified: fetchResult.lastModified,
			lastFetchedAt: sql`now()`,
			isPartialFeed: isPartialFeed ? 1 : 0
		});
	}

	// Determine partial status — use passed value or DB (existing feed only)
	const isItemPartial: number = isPartialFeed !== undefined
		? (isPartialFeed ? 1 : 0)
		: (existing.length > 0
			? await db
				.select({ isPartialFeed: feedsTable.isPartialFeed })
				.from(feedsTable)
				.where(eq(feedsTable.id, feedId))
				.limit(1)
				.then((r) => r[0]?.isPartialFeed ?? 0)
			: 0);

	const newItems = fetchResult.items.filter((item) => item.guid);
	for (const item of newItems) {
		const rawTitle = item.rawTitle?.trim() ?? null;
		const rawSummary = item.rawSummary?.trim() ?? null;
		const rawContent = item.rawContent?.trim() ?? null;
		const itemId = randomUUID();

		const title = rawTitle ? htmlToText(rawTitle) : null;

		let summary: string | null;
		if (rawSummary) {
			summary = htmlToText(rawSummary);
		} else if (rawContent) {
			summary = htmlToText(rawContent).slice(0, 255);
		} else {
			summary = null;
		}

		const content = rawContent ? await sanitizeHtml(rawContent, url) : null;

		await db
			.insert(itemsTable)
			.values({
				id: itemId,
				slug: generateSlug(itemId, title ?? item.url),
				feedId,
				guid: item.guid,
				url: item.url,
				title,
				rawTitle,
				rawSummary,
				content,
				rawContent,
				summary,
				author: item.author,
				publishedAt: item.publishedAt
			})
			.onConflictDoUpdate({
				target: [itemsTable.feedId, itemsTable.guid],
				set: buildItemUpdateSet({
					title,
					url: item.url,
					rawTitle,
					rawSummary,
					rawContent,
					content,
					summary,
					author: item.author,
					publishedAt: item.publishedAt,
					isPartialFeed: isItemPartial
				})
			});
	}

	// For partial feeds, fetch raw_page_content for items that don't have it yet
	if (isItemPartial) {
		await fetchPageContent(db, feedId, newItems);
	}

	return { feedId, newItemCount: newItems.length };
}

export async function refreshSingleFeed(
	db: DB,
	userId: string,
	feed: {
		id: string;
		url: string;
		title: string | null;
		etag: string | null;
		lastModified: string | null;
	},
	force?: boolean,
	log?: (msg: string) => void
): Promise<{ newItemCount: number; status: 'refreshed' | 'cached' }> {
	const _log = log ?? (() => {});

	const result = await fetchFeed(feed.url, force ? undefined : {
		etag: feed.etag ?? undefined,
		lastModified: feed.lastModified ?? undefined,
	});

	if (result.items.length === 0 && !result.meta.title) {
		return { newItemCount: 0, status: 'cached' };
	}

	let isPartial: boolean | undefined;
	if (force) {
		try {
			isPartial = await detectPartialFeed(feed.url, result.items, (msg) => _log(`  detect: ${msg}`));
			if (isPartial) {
				_log('  → PARTIAL FEED');
			}
		} catch (e) {
			_log(`  detect-err: ${e instanceof Error ? e.message : e}`);
		}
	}

	const { newItemCount } = await upsertFeed(db, userId, feed.url, result, isPartial);
	return { newItemCount, status: 'refreshed' };
}

async function fetchPageContent(db: DB, feedId: string, items: FetchResult['items']) {
	for (const item of items) {
		if (!item.url) continue;

		const existing = await db
			.select({ rawPageContent: itemsTable.rawPageContent })
			.from(itemsTable)
			.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)))
			.limit(1)
			.then((r) => r[0]);

		if (existing?.rawPageContent) continue;

		const log = (msg: string) => console.log(`  fetchContent: ${item.url} — ${msg}`);

		try {
			const response = await fetch(item.url);

			if (!response.ok) {
				log(`HTTP ${response.status}`);
				await db
					.update(itemsTable)
					.set({ rawPageError: response.status, notRenderable: 1 })
					.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)));
				continue;
			}

			const html = await response.text();
			const { content, notRenderable } = extractFromPage(html, item.url);

			if (notRenderable) {
				log('not readerable');
				await db
					.update(itemsTable)
					.set({ rawPageContent: html, notRenderable: 1 })
					.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)));
				continue;
			}

			if (content) {
				const cleanContent = await sanitizeHtml(content, item.url);
				log('extracted');
				await db
					.update(itemsTable)
					.set({ rawPageContent: html, content: cleanContent, notRenderable: 0 })
					.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)));
			} else {
				log('readability returned empty');
				await db
					.update(itemsTable)
					.set({ rawPageContent: html, notRenderable: 1 })
					.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)));
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			log(`network error: ${msg}`);
			await db
				.update(itemsTable)
				.set({ rawPageError: -1, notRenderable: 1 })
				.where(and(eq(itemsTable.feedId, feedId), eq(itemsTable.guid, item.guid)));
		}
	}
}

export type ItemUpdateParams = {
	title: string | null;
	url: string | undefined | null;
	rawTitle: string | null;
	rawSummary: string | null;
	rawContent: string | null;
	content: string | null;
	summary: string | null;
	author: string | undefined | null;
	publishedAt: Date | undefined | null;
	isPartialFeed: number;
};

export function buildItemUpdateSet(params: ItemUpdateParams): Record<string, unknown> {
	const set: Record<string, unknown> = {
		title: params.title,
		url: params.url,
		rawTitle: params.rawTitle,
		rawSummary: params.rawSummary,
		rawContent: params.rawContent,
		summary: params.summary,
		author: params.author,
		publishedAt: params.publishedAt
	};

	if (!params.isPartialFeed) {
		set.content = params.content;
	}

	return set;
}
