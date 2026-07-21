import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { addFeed as addFeedAction, refreshFeed as refreshFeedAction, deleteFeed as deleteFeedAction, refreshAll as refreshAllAction } from '$lib/server/feed/actions';
import { discoverAndSubscribe } from '$lib/server/feed/discover';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const feeds = await db
		.select({
			id: feedsTable.id,
			slug: feedsTable.slug,
			url: feedsTable.url,
			title: feedsTable.title,
			siteUrl: feedsTable.siteUrl,
			icon: feedsTable.icon,
			lastFetchedAt: feedsTable.lastFetchedAt,
			errorCount: feedsTable.errorCount
		})
		.from(feedsTable)
		.where(eq(feedsTable.userId, locals.user.id))
		.orderBy(sql`lower(${feedsTable.title})`);

	return { feeds };
};

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
		return refreshFeedAction(locals.user.id, data.get('feedId') as string);
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
