import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { auth } from '$lib/server/auth';
import { eq, and, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/login');

	const selectedFeedId = url.searchParams.get('feed');
	const selectedItemId = url.searchParams.get('item');

	const feeds = await db
		.select({
			id: feedsTable.id,
			url: feedsTable.url,
			title: feedsTable.title,
			icon: feedsTable.icon,
			siteUrl: feedsTable.siteUrl,
			errorCount: feedsTable.errorCount,
			unread: sql<number>`
				(SELECT count(*)::int FROM ${itemsTable}
				 WHERE ${itemsTable.feedId} = ${feedsTable.id}
				 AND ${itemsTable.isRead} = false)
			`
		})
		.from(feedsTable)
		.where(eq(feedsTable.userId, locals.user.id))
		.orderBy(sql`lower(${feedsTable.title})`);

	let items: Array<{
		id: string; title: string | null; url: string | null;
		summary: string | null; content: string | null;
		author: string | null; publishedAt: Date | null;
		isRead: boolean; isStarred: boolean;
	}> = [];

	if (selectedFeedId) {
		items = await db
			.select({
				id: itemsTable.id,
				title: itemsTable.title,
				url: itemsTable.url,
				summary: itemsTable.summary,
				content: itemsTable.content,
				author: itemsTable.author,
				publishedAt: itemsTable.publishedAt,
				isRead: itemsTable.isRead,
				isStarred: itemsTable.isStarred
			})
			.from(itemsTable)
			.where(and(eq(itemsTable.feedId, selectedFeedId)))
			.orderBy(desc(itemsTable.publishedAt))
			.limit(200);
	}

	let selectedItem: typeof items[0] | null = null;

	if (selectedItemId) {
		selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
		if (!selectedItem) {
			selectedItem = await db
				.select({
					id: itemsTable.id,
					title: itemsTable.title,
					url: itemsTable.url,
					summary: itemsTable.summary,
					content: itemsTable.content,
					author: itemsTable.author,
					publishedAt: itemsTable.publishedAt,
					isRead: itemsTable.isRead,
					isStarred: itemsTable.isStarred
				})
				.from(itemsTable)
				.where(eq(itemsTable.id, selectedItemId))
				.limit(1)
				.then((r) => r[0] ?? null);
		}
	}

	return { feeds, items, selectedItem, selectedFeedId };
};

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
		catch (e) { return fail(422, { message: e instanceof Error ? e.message : 'Failed to fetch feed' }); }

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
			return fail(422, { message: e instanceof Error ? e.message : 'Failed to refresh feed' });
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

		let refreshed = 0;
		let errors = 0;

		for (const feed of userFeeds) {
			try {
				const result = await fetchFeed(feed.url, { etag: feed.etag ?? undefined, lastModified: feed.lastModified ?? undefined });
				if (result.items.length > 0 || result.meta.title) await upsertFeed(db, locals.user.id, feed.url, result);
				refreshed++;
			} catch { errors++; }
		}

		return { success: `Refreshed ${refreshed} feed(s)${errors ? ` (${errors} failed)` : ''}` };
	},

	toggleRead: async ({ locals, request }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isRead = data.get('isRead') === 'true';
		if (!itemId) return fail(400);

		await db
			.update(itemsTable)
			.set({ isRead })
			.where(
				and(eq(itemsTable.id, itemId))
			);

		return { success: true };
	},

	toggleStar: async ({ locals, request }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isStarred = data.get('isStarred') === 'true';
		if (!itemId) return fail(400);

		await db
			.update(itemsTable)
			.set({ isStarred })
			.where(eq(itemsTable.id, itemId));

		return { success: true };
	}
};
