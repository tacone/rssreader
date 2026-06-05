import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { eq, and, count, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const rows = await db
		.select({
			id: feedsTable.id,
			url: feedsTable.url,
			title: feedsTable.title,
			siteUrl: feedsTable.siteUrl,
			icon: feedsTable.icon,
			lastFetchedAt: feedsTable.lastFetchedAt,
			errorCount: feedsTable.errorCount
		})
		.from(feedsTable)
		.where(eq(feedsTable.userId, locals.user.id))
		.orderBy(feedsTable.createdAt);

	return { feeds: rows };
};

export const actions: Actions = {
	addFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const url = (data.get('url') as string)?.trim();

		if (!url) return fail(400, { message: 'URL is required' });

		try {
			new URL(url);
		} catch {
			return fail(400, { message: 'Invalid URL' });
		}

		const existing = await db
			.select({ id: feedsTable.id })
			.from(feedsTable)
			.where(and(eq(feedsTable.userId, locals.user.id), eq(feedsTable.url, url)))
			.limit(1);

		if (existing.length > 0) {
			return fail(409, { message: 'Feed already added' });
		}

		let fetchResult;
		try {
			fetchResult = await fetchFeed(url);
		} catch (e) {
			return fail(422, { message: e instanceof Error ? e.message : 'Failed to fetch feed' });
		}

		if (fetchResult.items.length === 0 && !fetchResult.meta.title) {
			return fail(422, { message: 'No feed found at this URL' });
		}

		await upsertFeed(db, locals.user.id, url, fetchResult);

		return { success: 'Feed added' };
	},

	refreshFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const feedId = data.get('feedId') as string;
		if (!feedId) return fail(400, { message: 'Feed ID is required' });

		const feed = await db
			.select()
			.from(feedsTable)
			.where(and(eq(feedsTable.id, feedId), eq(feedsTable.userId, locals.user.id)))
			.limit(1)
			.then((r) => r[0]);

		if (!feed) return fail(404, { message: 'Feed not found' });

		try {
			const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
			if (result.items.length > 0 || result.meta.title) {
				await upsertFeed(db, locals.user.id, feed.url, result);
			}
			return { success: 'Feed refreshed' };
		} catch (e) {
			return fail(422, { message: e instanceof Error ? e.message : 'Failed to refresh feed' });
		}
	},

	deleteFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const feedId = data.get('feedId') as string;
		if (!feedId) return fail(400, { message: 'Feed ID is required' });

		await db
			.delete(feedsTable)
			.where(and(eq(feedsTable.id, feedId), eq(feedsTable.userId, locals.user.id)));

		return { success: 'Feed deleted' };
	},

	refreshAll: async ({ locals }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const userFeeds = await db
			.select()
			.from(feedsTable)
			.where(eq(feedsTable.userId, locals.user.id));

		let refreshed = 0;
		let errors = 0;

		for (const feed of userFeeds) {
			try {
				const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
				if (result.items.length > 0 || result.meta.title) {
					await upsertFeed(db, locals.user.id, feed.url, result);
				}
				refreshed++;
			} catch {
				errors++;
			}
		}

		return { success: `Refreshed ${refreshed} feed(s)${errors ? ` (${errors} failed)` : ''}` };
	}
};
