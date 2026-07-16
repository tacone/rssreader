import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { eq, sql, count, and } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const rows = await db
		.select({
			id: feedsTable.id,
			slug: feedsTable.slug,
			title: feedsTable.title,
			icon: feedsTable.icon,
			url: feedsTable.url,
			unread: count(itemsTable.id)
		})
		.from(feedsTable)
		.leftJoin(itemsTable, and(
			eq(itemsTable.feedId, feedsTable.id),
			eq(itemsTable.isRead, false)
		))
		.where(eq(feedsTable.userId, locals.user.id))
		.groupBy(feedsTable.id, feedsTable.slug, feedsTable.title, feedsTable.icon, feedsTable.url)
		.orderBy(sql`lower(${feedsTable.title})`);

	const feeds = rows.map(r => ({ ...r, unread: r.unread ?? 0 }));

	return { feeds };
};
