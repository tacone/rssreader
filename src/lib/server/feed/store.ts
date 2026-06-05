import { randomUUID } from 'node:crypto';
import { feeds as feedsTable, items as itemsTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema';
import type { FetchResult } from './fetch';

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
		await db
			.update(feedsTable)
			.set({
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
		await db.insert(feedsTable).values({
			id: feedId,
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
		await db
			.insert(itemsTable)
			.values({
				id: randomUUID(),
				feedId,
				guid: item.guid,
				url: item.url,
				title: item.title,
				content: item.content,
				summary: item.summary,
				author: item.author,
				publishedAt: item.publishedAt
			})
			.onConflictDoNothing({ target: [itemsTable.feedId, itemsTable.guid] });
	}

	return { feedId, newItemCount: newItems.length };
}
