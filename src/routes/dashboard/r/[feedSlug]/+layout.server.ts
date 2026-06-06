import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	const feed = await db
		.select({ id: feedsTable.id })
		.from(feedsTable)
		.where(and(eq(feedsTable.slug, params.feedSlug), eq(feedsTable.userId, locals.user.id)))
		.limit(1)
		.then((r) => r[0]);

	if (!feed) redirect(302, '/dashboard/r');

	const items = await db
		.select({
			id: itemsTable.id,
			slug: itemsTable.slug,
			title: itemsTable.title,
			url: itemsTable.url,
			summary: itemsTable.summary,
			author: itemsTable.author,
			publishedAt: itemsTable.publishedAt,
			isRead: itemsTable.isRead,
			isStarred: itemsTable.isStarred
		})
		.from(itemsTable)
		.where(eq(itemsTable.feedId, feed.id))
		.orderBy(desc(itemsTable.publishedAt))
		.limit(200);

	return { feedId: feed.id, feedSlug: params.feedSlug, items };
};
