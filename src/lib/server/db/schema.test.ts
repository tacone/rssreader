import { describe, it, expect } from 'vitest';
import * as schema from './schema';

describe('schema', () => {
	it('should export all expected tables', () => {
		expect(schema.feeds).toBeDefined();
		expect(schema.items).toBeDefined();
		expect(schema.folders).toBeDefined();
		expect(schema.feedFolders).toBeDefined();
		expect(schema.itemTags).toBeDefined();
	});

	it('should export auth tables', () => {
		expect(schema.user).toBeDefined();
		expect(schema.session).toBeDefined();
		expect(schema.account).toBeDefined();
	});

	it('feed should have expected columns', () => {
		const columns = Object.keys(schema.feeds);
		expect(columns).toContain('id');
		expect(columns).toContain('userId');
		expect(columns).toContain('url');
		expect(columns).toContain('title');
		expect(columns).toContain('description');
		expect(columns).toContain('etag');
		expect(columns).toContain('lastModified');
	});

	it('item should have expected columns', () => {
		const columns = Object.keys(schema.items);
		expect(columns).toContain('id');
		expect(columns).toContain('feedId');
		expect(columns).toContain('guid');
		expect(columns).toContain('isRead');
		expect(columns).toContain('isStarred');
	});
});
