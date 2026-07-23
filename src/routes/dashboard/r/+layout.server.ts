import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, items as itemsTable, folders as foldersTable, feedFolders as feedFoldersTable } from '$lib/server/db/schema';
import { eq, sql, count, and } from 'drizzle-orm';

const unreadExpr = count(itemsTable.id);

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const userId = locals.user.id;

	const feedRows = await db
		.select({
			id: feedsTable.id,
			slug: feedsTable.slug,
			title: feedsTable.title,
			icon: feedsTable.icon,
			url: feedsTable.url,
			unread: sql<number>`coalesce(${unreadExpr}, 0)`.as('unread'),
		})
		.from(feedsTable)
		.leftJoin(itemsTable, and(
			eq(itemsTable.feedId, feedsTable.id),
			eq(itemsTable.isRead, false)
		))
		.where(eq(feedsTable.userId, userId))
		.groupBy(feedsTable.id, feedsTable.slug, feedsTable.title, feedsTable.icon, feedsTable.url)
		.orderBy(sql`lower(${feedsTable.title})`);

	const feeds = feedRows.map(r => ({ ...r, unread: Number(r.unread) }));

	const folderRows = await db
		.select({
			id: foldersTable.id,
			name: foldersTable.name,
			sortOrder: foldersTable.sortOrder,
			unread: sql<number>`coalesce(${unreadExpr}, 0)`.as('unread'),
		})
		.from(foldersTable)
		.leftJoin(feedFoldersTable, eq(feedFoldersTable.folderId, foldersTable.id))
		.leftJoin(feedsTable, eq(feedsTable.id, feedFoldersTable.feedId))
		.leftJoin(itemsTable, and(
			eq(itemsTable.feedId, feedsTable.id),
			eq(itemsTable.isRead, false)
		))
		.where(eq(foldersTable.userId, userId))
		.groupBy(foldersTable.id, foldersTable.name, foldersTable.sortOrder)
		.orderBy(foldersTable.sortOrder, foldersTable.name);

	const feedFolderRows = await db
		.select({ feedId: feedFoldersTable.feedId, folderId: feedFoldersTable.folderId })
		.from(feedFoldersTable)
		.innerJoin(feedsTable, eq(feedsTable.id, feedFoldersTable.feedId))
		.where(eq(feedsTable.userId, userId));

	const feedFolderMap = new Map(feedFolderRows.map(r => [r.feedId, r.folderId]));

	const folders = folderRows.map(folder => ({
		...folder,
		unread: Number(folder.unread),
		feeds: feeds.filter(f => feedFolderMap.get(f.id) === folder.id),
	}));

	const uncategorizedFeeds = feeds.filter(f => !feedFolderMap.has(f.id));

	const totalUnread = feeds.reduce((s, f) => s + f.unread, 0);

	const starredRow = await db
		.select({ count: count(itemsTable.id) })
		.from(itemsTable)
		.innerJoin(feedsTable, eq(feedsTable.id, itemsTable.feedId))
		.where(and(
			eq(itemsTable.isStarred, true),
			eq(feedsTable.userId, userId)
		))
		.then(r => r[0]);
	const starredCount = starredRow?.count ?? 0;

	return { feeds, folders, uncategorizedFeeds, totalUnread, starredCount };
};
