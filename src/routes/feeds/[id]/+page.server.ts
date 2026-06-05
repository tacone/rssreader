import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	const feed = await db
		.select({
			id: feedsTable.id,
			url: feedsTable.url,
			title: feedsTable.title,
			siteUrl: feedsTable.siteUrl,
			icon: feedsTable.icon
		})
		.from(feedsTable)
		.where(and(eq(feedsTable.id, params.id), eq(feedsTable.userId, locals.user.id)))
		.limit(1)
		.then((r) => r[0]);

	if (!feed) redirect(302, '/dashboard');

	const feedItems = await db
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
		.where(eq(itemsTable.feedId, params.id))
		.orderBy(desc(itemsTable.publishedAt));

	return { feed, items: feedItems };
};

export const actions: Actions = {
	toggleRead: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isRead = data.get('isRead') === 'true';

		if (!itemId) return fail(400, { message: 'Item ID required' });

		const item = await db
			.select({ id: itemsTable.id, feedId: itemsTable.feedId })
			.from(itemsTable)
			.where(and(eq(itemsTable.id, itemId), eq(itemsTable.feedId, data.get('feedId') as string)))
			.limit(1)
			.then((r) => r[0]);

		if (!item) return fail(404, { message: 'Item not found' });

		await db.update(itemsTable).set({ isRead }).where(eq(itemsTable.id, itemId));

		return { success: true };
	},

	toggleStar: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isStarred = data.get('isStarred') === 'true';

		if (!itemId) return fail(400, { message: 'Item ID required' });

		const item = await db
			.select({ id: itemsTable.id, feedId: itemsTable.feedId })
			.from(itemsTable)
			.where(and(eq(itemsTable.id, itemId), eq(itemsTable.feedId, data.get('feedId') as string)))
			.limit(1)
			.then((r) => r[0]);

		if (!item) return fail(404, { message: 'Item not found' });

		await db.update(itemsTable).set({ isStarred }).where(eq(itemsTable.id, itemId));

		return { success: true };
	}
};
