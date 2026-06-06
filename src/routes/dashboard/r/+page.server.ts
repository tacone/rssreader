import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { auth } from '$lib/server/auth';
import { eq, and } from 'drizzle-orm';

export const actions: Actions = {
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	},

	addFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const url = (data.get('url') as string)?.trim();

		if (!url) return fail(400, { message: 'URL is required' });
		try { new URL(url); } catch { return fail(400, { message: 'Invalid URL' }); }

		const existing = await db
			.select({ id: feedsTable.id })
			.from(feedsTable)
			.where(and(eq(feedsTable.userId, locals.user.id), eq(feedsTable.url, url)))
			.limit(1);

		if (existing.length > 0) return fail(409, { message: 'Feed already added' });

		let fetchResult;
		try { fetchResult = await fetchFeed(url); }
		catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			console.error(`[addFeed] ${url} — ${msg}`, e);
			return fail(422, { message: msg });
		}

		if (fetchResult.items.length === 0 && !fetchResult.meta.title)
			return fail(422, { message: 'No feed found at this URL' });

		await upsertFeed(db, locals.user.id, url, fetchResult);
		return { success: 'Feed added' };
	},

	refreshFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401);

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
			if (result.items.length > 0 || result.meta.title) await upsertFeed(db, locals.user.id, feed.url, result);
			return { success: 'Feed refreshed' };
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			console.error(`[refreshFeed] ${feed.url} — ${msg}`, e);
			return fail(422, { message: msg });
		}
	},

	deleteFeed: async ({ locals, request }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const feedId = data.get('feedId') as string;
		if (!feedId) return fail(400, { message: 'Feed ID is required' });

		await db.delete(feedsTable).where(and(eq(feedsTable.id, feedId), eq(feedsTable.userId, locals.user.id)));
		return { success: 'Feed deleted' };
	},

	refreshAll: async ({ locals }) => {
		if (!locals.user) return fail(401);

		const userFeeds = await db
			.select()
			.from(feedsTable)
			.where(eq(feedsTable.userId, locals.user.id));

		console.log('[refreshAll] Refreshing', userFeeds.length, 'feeds');

		let refreshed = 0;
		let errors = 0;

		for (const feed of userFeeds) {
			try {
				const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
				const itemCount = result.items.length;
				if (itemCount > 0 || result.meta.title) {
					const { newItemCount } = await upsertFeed(db, locals.user.id, feed.url, result);
					console.log('[refreshAll] OK:', feed.title || feed.url, `(${newItemCount} new items)`);
				} else {
					console.log('[refreshAll] 304:', feed.title || feed.url, feed.lastModified);
				}
				refreshed++;
			} catch (e) {
				console.error('[refreshAll] ERR:', feed.title || feed.url, e instanceof Error ? e.message : e);
				errors++;
			}
		}

		const msg = `Refreshed ${refreshed} feed(s)${errors ? ` (${errors} failed)` : ''}`;
		console.log('[refreshAll] Done:', msg);
		return { success: msg };
	}
};
