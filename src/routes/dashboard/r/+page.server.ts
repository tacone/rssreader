import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { feeds as feedsTable, folders as foldersTable, feedFolders as feedFoldersTable } from '$lib/server/db/schema';
import { fetchFeed } from '$lib/server/feed/fetch';
import { upsertFeed } from '$lib/server/feed/store';
import { auth } from '$lib/server/auth';
import { addFeed as addFeedAction, deleteFeed as deleteFeedAction, refreshAll as refreshAllAction } from '$lib/server/feed/actions';
import { discoverAndSubscribe } from '$lib/server/feed/discover';
import { and, eq, sql } from 'drizzle-orm';
import { generateId } from '$lib/server/id';

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
	},

	// --- Folder CRUD ---

	createFolder: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Folder name is required' });

		const maxOrder = await db
			.select({ max: sql<number>`max(${foldersTable.sortOrder})` })
			.from(foldersTable)
			.where(eq(foldersTable.userId, locals.user.id))
			.then(r => r[0]?.max ?? -1);

		await db.insert(foldersTable).values({
			id: generateId(),
			userId: locals.user.id,
			name,
			sortOrder: maxOrder + 1,
		});

		return { success: true };
	},

	renameFolder: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const folderId = data.get('folderId') as string;
		const name = (data.get('name') as string)?.trim();
		if (!folderId || !name) return fail(400, { error: 'Folder name is required' });

		await db
			.update(foldersTable)
			.set({ name })
			.where(and(eq(foldersTable.id, folderId), eq(foldersTable.userId, locals.user.id)));

		return { success: true };
	},

	deleteFolder: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const folderId = data.get('folderId') as string;
		if (!folderId) return fail(400, { error: 'Folder ID is required' });

		await db
			.delete(foldersTable)
			.where(and(eq(foldersTable.id, folderId), eq(foldersTable.userId, locals.user.id)));

		return { success: true };
	},

	moveFolder: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const folderId = data.get('folderId') as string;
		const direction = data.get('direction') as string;
		if (!folderId || !['up', 'down'].includes(direction)) return fail(400);

		const userFolders = await db
			.select({ id: foldersTable.id, sortOrder: foldersTable.sortOrder })
			.from(foldersTable)
			.where(eq(foldersTable.userId, locals.user.id))
			.orderBy(foldersTable.sortOrder);

		const idx = userFolders.findIndex(f => f.id === folderId);
		if (idx === -1) return fail(404);
		if (direction === 'up' && idx === 0) return fail(400, { error: 'Already first' });
		if (direction === 'down' && idx === userFolders.length - 1) return fail(400, { error: 'Already last' });

		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		const current = userFolders[idx];
		const target = userFolders[swapIdx];

		await db.transaction(async (tx) => {
			await tx.update(foldersTable).set({ sortOrder: target.sortOrder }).where(eq(foldersTable.id, current.id));
			await tx.update(foldersTable).set({ sortOrder: current.sortOrder }).where(eq(foldersTable.id, target.id));
		});

		return { success: true };
	},

	reorderFolders: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const userId = locals.user.id;
		const data = await request.formData();
		const raw = (data.get('folderIds') as string) || '';
		const folderIds = raw.split(',').filter(Boolean);
		if (!folderIds.length) return fail(400);

		await db.transaction(async (tx) => {
			for (let i = 0; i < folderIds.length; i++) {
				await tx
					.update(foldersTable)
					.set({ sortOrder: i })
					.where(and(eq(foldersTable.id, folderIds[i]), eq(foldersTable.userId, userId)));
			}
		});

		return { success: true };
	},

	assignFeedToFolder: async ({ locals, request }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const feedId = data.get('feedId') as string;
		const folderId = data.get('folderId') as string;
		if (!feedId) return fail(400, { error: 'Feed ID is required' });

		await db.delete(feedFoldersTable).where(eq(feedFoldersTable.feedId, feedId));

		if (folderId) {
			await db.insert(feedFoldersTable).values({ feedId, folderId });
		}

		return { success: true };
	},
};
