import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	const feed = await db
		.select({ id: feedsTable.id })
		.from(feedsTable)
		.where(and(eq(feedsTable.slug, params.feedSlug), eq(feedsTable.userId, locals.user.id)))
		.limit(1)
		.then((r) => r[0]);

	if (!feed) redirect(302, '/dashboard/r');

	const item = await db
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
		.where(and(eq(itemsTable.slug, params.itemSlug), eq(itemsTable.feedId, feed.id)))
		.limit(1)
		.then((r) => r[0]);

	if (!item) redirect(302, `/dashboard/r/${params.feedSlug}`);

	if (!item.isRead) {
		await db.update(itemsTable).set({ isRead: true }).where(eq(itemsTable.id, item.id));
		item.isRead = true;
	}

	return { item };
};

export const actions: Actions = {
	toggleRead: async ({ locals, request, params }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isRead = data.get('isRead') === 'true';
		if (!itemId) return fail(400);

		const feed = await db
			.select({ id: feedsTable.id })
			.from(feedsTable)
			.where(and(eq(feedsTable.slug, params.feedSlug), eq(feedsTable.userId, locals.user.id)))
			.limit(1)
			.then((r) => r[0]);

		if (!feed) return fail(404);

		const item = await db
			.select({ id: itemsTable.id })
			.from(itemsTable)
			.where(and(eq(itemsTable.id, itemId), eq(itemsTable.feedId, feed.id)))
			.limit(1)
			.then((r) => r[0]);

		if (!item) return fail(404);

		await db.update(itemsTable).set({ isRead }).where(eq(itemsTable.id, itemId));
		return { success: true };
	},

	toggleStar: async ({ locals, request, params }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId') as string;
		const isStarred = data.get('isStarred') === 'true';
		if (!itemId) return fail(400);

		const feed = await db
			.select({ id: feedsTable.id })
			.from(feedsTable)
			.where(and(eq(feedsTable.slug, params.feedSlug), eq(feedsTable.userId, locals.user.id)))
			.limit(1)
			.then((r) => r[0]);

		if (!feed) return fail(404);

		const item = await db
			.select({ id: itemsTable.id })
			.from(itemsTable)
			.where(and(eq(itemsTable.id, itemId), eq(itemsTable.feedId, feed.id)))
			.limit(1)
			.then((r) => r[0]);

		if (!item) return fail(404);

		await db.update(itemsTable).set({ isStarred }).where(eq(itemsTable.id, itemId));
		return { success: true };
	}
};
