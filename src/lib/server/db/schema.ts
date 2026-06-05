import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	primaryKey,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export * from './auth.schema';
import { user } from './auth.schema';

// --- Feeds ---

export const feeds = pgTable(
	'feed',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		title: text('title'),
		description: text('description'),
		siteUrl: text('site_url'),
		icon: text('icon'),
		etag: text('etag'),
		lastModified: text('last_modified'),
		lastFetchedAt: timestamp('last_fetched_at'),
		errorCount: integer('error_count').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('feed_user_url_idx').on(table.userId, table.url),
		index('feed_user_id_idx').on(table.userId)
	]
);

export const feedsRelations = relations(feeds, ({ many }) => ({
	items: many(items),
	feedFolders: many(feedFolders)
}));

// --- Items ---

export const items = pgTable(
	'item',
	{
		id: text('id').primaryKey(),
		feedId: text('feed_id')
			.notNull()
			.references(() => feeds.id, { onDelete: 'cascade' }),
		guid: text('guid').notNull(),
		url: text('url'),
		title: text('title'),
		content: text('content'),
		summary: text('summary'),
		author: text('author'),
		publishedAt: timestamp('published_at'),
		fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
		isRead: boolean('is_read').notNull().default(false),
		isStarred: boolean('is_starred').notNull().default(false)
	},
	(table) => [
		uniqueIndex('item_feed_guid_idx').on(table.feedId, table.guid),
		index('item_feed_id_idx').on(table.feedId),
		index('item_published_at_idx').on(table.publishedAt),
		index('item_is_read_idx').on(table.isRead),
		index('item_is_starred_idx').on(table.isStarred)
	]
);

export const itemsRelations = relations(items, ({ one, many }) => ({
	feed: one(feeds, {
		fields: [items.feedId],
		references: [feeds.id]
	}),
	tags: many(itemTags)
}));

// --- Folders ---

export const folders = pgTable(
	'folder',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		parentId: text('parent_id'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('folder_parent_id_idx').on(table.parentId),
		index('folder_user_id_idx').on(table.userId)
	]
);

export const foldersRelations = relations(folders, ({ one, many }) => ({
	parent: one(folders, {
		fields: [folders.parentId],
		references: [folders.id]
	}),
	children: many(folders),
	feedFolders: many(feedFolders)
}));

// --- Feed-Folder join ---

export const feedFolders = pgTable(
	'feed_folder',
	{
		feedId: text('feed_id')
			.notNull()
			.references(() => feeds.id, { onDelete: 'cascade' }),
		folderId: text('folder_id')
			.notNull()
			.references(() => folders.id, { onDelete: 'cascade' })
	},
	(table) => ({
		pk: primaryKey({ columns: [table.feedId, table.folderId] })
	})
);

export const feedFoldersRelations = relations(feedFolders, ({ one }) => ({
	feed: one(feeds, {
		fields: [feedFolders.feedId],
		references: [feeds.id]
	}),
	folder: one(folders, {
		fields: [feedFolders.folderId],
		references: [folders.id]
	})
}));

// --- Item Tags ---

export const itemTags = pgTable(
	'item_tag',
	{
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		tag: text('tag').notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.itemId, table.tag] }),
		tagIdx: index('item_tag_tag_idx').on(table.tag)
	})
);

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
	item: one(items, {
		fields: [itemTags.itemId],
		references: [items.id]
	})
}));
