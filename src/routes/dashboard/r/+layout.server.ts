import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const feeds = await db
		.select({
			id: feedsTable.id,
			slug: feedsTable.slug,
			title: feedsTable.title,
			icon: feedsTable.icon,
			url: feedsTable.url,
			unread: sql<number>`
				(SELECT count(*)::int FROM ${itemsTable}
				 WHERE ${itemsTable.feedId} = ${feedsTable.id}
				 AND ${itemsTable.isRead} = false)
			`
		})
		.from(feedsTable)
		.where(eq(feedsTable.userId, locals.user.id))
		.orderBy(sql`lower(${feedsTable.title})`);

	return { feeds };
};
