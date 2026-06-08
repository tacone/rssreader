import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { feeds as feedsTable } from '$lib/server/db/schema';
import { fetchFeed } from './fetch';
import { upsertFeed } from './store';
import { detectPartialFeed } from './detect-partial';
import { eq, and } from 'drizzle-orm';

export async function addFeed(userId: string, url: string) {
	if (!url) return fail(400, { message: 'URL is required' });
	try { new URL(url); } catch { return fail(400, { message: 'Invalid URL' }); }

	const existing = await db
		.select({ id: feedsTable.id })
		.from(feedsTable)
		.where(and(eq(feedsTable.userId, userId), eq(feedsTable.url, url)))
		.limit(1);

	if (existing.length > 0) return fail(409, { message: 'Feed already added' });

	let fetchResult;
	try { fetchResult = await fetchFeed(url); }
	catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		console.log(`[addFeed] ERROR: ${url} — ${msg}`);
		return fail(422, { message: msg });
	}

	if (fetchResult.items.length === 0 && !fetchResult.meta.title)
		return fail(422, { message: 'No feed found at this URL' });

	// Detect before upsert so items get page-fetched immediately
	let isPartial: boolean | undefined;
	try {
		isPartial = await detectPartialFeed(url, fetchResult.items);
		if (isPartial) {
			console.log(`[addFeed] ${url} — marked as partial feed`);
		}
	} catch (e) {
		console.log(`[addFeed] detection error for ${url}: ${e instanceof Error ? e.message : e}`);
	}

	await upsertFeed(db, userId, url, fetchResult, isPartial);

	return { success: 'Feed added' };
}

export async function refreshFeed(userId: string, feedId: string) {
	if (!feedId) return fail(400, { message: 'Feed ID is required' });

	const feed = await db
		.select()
		.from(feedsTable)
		.where(and(eq(feedsTable.id, feedId), eq(feedsTable.userId, userId)))
		.limit(1)
		.then((r) => r[0]);

	if (!feed) return fail(404, { message: 'Feed not found' });

	try {
		const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
		if (result.items.length > 0 || result.meta.title) await upsertFeed(db, userId, feed.url, result);
		return { success: 'Feed refreshed' };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		console.log(`[refreshFeed] ERROR: ${feed.url} — ${msg}`);
		return fail(422, { message: msg });
	}
}

export async function deleteFeed(userId: string, feedId: string) {
	if (!feedId) return fail(400, { message: 'Feed ID is required' });
	await db.delete(feedsTable).where(and(eq(feedsTable.id, feedId), eq(feedsTable.userId, userId)));
	return { success: 'Feed deleted' };
}

export async function refreshAll(userId: string) {
	const userFeeds = await db
		.select()
		.from(feedsTable)
		.where(eq(feedsTable.userId, userId));

	console.log('[refreshAll] Refreshing', userFeeds.length, 'feeds');

	let refreshed = 0;
	let cached = 0;
	let errors = 0;

	for (const feed of userFeeds) {
		try {
			const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
			if (result.items.length > 0 || result.meta.title) {
				const { newItemCount } = await upsertFeed(db, userId, feed.url, result);
				console.log('[refreshAll] OK:', feed.title || feed.url, `(${newItemCount} new items)`);
				refreshed++;
			} else {
				console.log('[refreshAll] 304:', feed.title || feed.url);
				cached++;
			}
		} catch (e) {
			console.log('[refreshAll] ERR:', feed.title || feed.url, e instanceof Error ? e.message : e);
			errors++;
		}
	}

	const parts = [`${refreshed} refreshed`];
	if (cached > 0) parts.push(`${cached} cached`);
	if (errors > 0) parts.push(`${errors} failed`);
	console.log('[refreshAll] Done:', parts.join(', '));
	return { success: parts.join(', ') };
}
