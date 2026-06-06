import { randomUUID } from 'node:crypto';
import { feeds as feedsTable, items as itemsTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema';
import type { FetchResult } from './fetch';
import { generateSlug } from '../slug';
import { htmlToText } from '../html';
import { sanitizeHtml } from '../sanitize';

export type DB = PostgresJsDatabase<typeof schema>;

export async function upsertFeed(
	db: DB,
	userId: string,
	url: string,
	fetchResult: FetchResult
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
		await db
			.update(feedsTable)
			.set({
				slug,
				title: fetchResult.meta.title,
				description: fetchResult.meta.description,
				siteUrl: fetchResult.meta.link,
				icon: fetchResult.meta.image,
				etag: fetchResult.etag,
				lastModified: fetchResult.lastModified,
				lastFetchedAt: sql`now()`,
				errorCount: 0
			})
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
			lastFetchedAt: sql`now()`
		});
	}

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

		const content = rawContent ? sanitizeHtml(rawContent) : null;

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
			.onConflictDoNothing({ target: [itemsTable.feedId, itemsTable.guid] });
	}

	return { feedId, newItemCount: newItems.length };
}
