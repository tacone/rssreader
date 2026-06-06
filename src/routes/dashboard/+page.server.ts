import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { addFeed as addFeedAction, refreshFeed as refreshFeedAction, deleteFeed as deleteFeedAction, refreshAll as refreshAllAction } from '$lib/server/feed/actions';
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
		return addFeedAction(locals.user.id, (data.get('url') as string)?.trim());
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
	}
};
