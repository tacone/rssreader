import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { auth } from '$lib/server/auth';
import { addFeed as addFeedAction, deleteFeed as deleteFeedAction, refreshAll as refreshAllAction } from '$lib/server/feed/actions';
import { and, eq } from 'drizzle-orm';

export const actions: Actions = {
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	},

	addFeed: async ({ locals, request }) => {
		if (!locals.user) return { status: 401 };
		const data = await request.formData();
		return addFeedAction(locals.user.id, (data.get('url') as string)?.trim());
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
	}
};
