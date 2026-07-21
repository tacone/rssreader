import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { auth } from '$lib/server/auth';
import { addFeed as addFeedAction, deleteFeed as deleteFeedAction, refreshAll as refreshAllAction } from '$lib/server/feed/actions';
import { discoverAndSubscribe } from '$lib/server/feed/discover';
import { and, eq } from 'drizzle-orm';

export const actions: Actions = {
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	},

	addFeed: async ({ locals, request }) => {
		if (!locals.user) return { status: 401 };
		const data = await request.formData();
		const url = (data.get('url') as string)?.trim();
		if (!url) return fail(400, { error: 'URL is required' });

		const feedResult = await addFeedAction(locals.user.id, url);

		if ('success' in feedResult) return feedResult;

		const err = feedResult as { data?: { message?: string } };
		const msg = err.data?.message;
		if (msg === 'No feed found at this URL' || msg === 'Unrecognized feed format') {
			const discResult = await discoverAndSubscribe(locals.user.id, url);
			return { ...discResult, _action: 'addOrDiscover' };
		}

		return feedResult;
	},

	refreshFeed: async ({ locals, request }) => {
		if (!locals.user) return { status: 401 };

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
			console.log(`[refreshFeed] ERROR: ${feed.url} — ${msg}`);
			return fail(422, { message: msg });
		}
	},

	deleteFeed: async ({ locals, request }) => {
		if (!locals.user) return { status: 401 };
		const data = await request.formData();
		return deleteFeedAction(locals.user.id, data.get('feedId') as string);
	},

	refreshAll: async ({ locals }) => {
		if (!locals.user) return { status: 401 };
		return refreshAllAction(locals.user.id);
	},

	subscribeFromDiscover: async ({ locals, request }) => {
		if (!locals.user) return { status: 401 };
		const data = await request.formData();
		const feedUrl = data.get('feedUrl') as string;
		if (!feedUrl) return fail(400, { discoverError: 'Feed URL is required' });
		const result = await addFeedAction(locals.user.id, feedUrl);
		return { ...result, _action: 'subscribeFromDiscover' };
	}
};
