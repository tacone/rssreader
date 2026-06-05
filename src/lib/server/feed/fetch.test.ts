import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
});

// Sample RSS 2.0 feed
const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test feed</description>
    <link>https://example.com</link>
    <language>en</language>
    <item>
      <title>First Article</title>
      <link>https://example.com/1</link>
      <description>First description</description>
      <guid>abc-123</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <author>John Doe</author>
    </item>
    <item>
      <title>Second Article</title>
      <link>https://example.com/2</link>
      <guid>def-456</guid>
    </item>
  </channel>
</rss>`;

// Sample Atom 1.0 feed
const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <subtitle>An atom feed</subtitle>
  <link href="https://atom.example.com"/>
  <entry>
    <id>atom-1</id>
    <title>Atom Entry</title>
    <link href="https://atom.example.com/1"/>
    <summary>Atom summary</summary>
    <published>2024-01-01T00:00:00Z</published>
    <author><name>Jane Doe</name></author>
  </entry>
</feed>`;

describe('fetchFeed', () => {
	it('should parse RSS 2.0 feed', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(sampleRss),
			headers: new Map([['ETag', '"abc123"']])
		});

		const { fetchFeed } = await import('./fetch');
		const result = await fetchFeed('https://example.com/feed.xml');

		expect(result.meta.title).toBe('Test Feed');
		expect(result.meta.description).toBe('A test feed');
		expect(result.meta.link).toBe('https://example.com');
		expect(result.items).toHaveLength(2);
		expect(result.items[0].guid).toBe('abc-123');
		expect(result.items[0].title).toBe('First Article');
		expect(result.items[0].author).toBe('John Doe');
		expect(result.items[1].guid).toBe('def-456');
		expect(result.items[1].title).toBe('Second Article');
		expect(result.etag).toBe('"abc123"');
	});

	it('should parse Atom 1.0 feed', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(sampleAtom),
			headers: new Map()
		});

		const { fetchFeed } = await import('./fetch');
		const result = await fetchFeed('https://atom.example.com/feed.xml');

		expect(result.meta.title).toBe('Atom Feed');
		expect(result.meta.description).toBe('An atom feed');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].guid).toBe('atom-1');
		expect(result.items[0].title).toBe('Atom Entry');
		expect(result.items[0].author).toBe('Jane Doe');
	});

	it('should return empty on 304 Not Modified', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 304,
			headers: new Map()
		});

		const { fetchFeed } = await import('./fetch');
		const result = await fetchFeed('https://example.com/feed.xml', {
			etag: '"old-abc"',
			lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT'
		});

		expect(result.meta).toEqual({});
		expect(result.items).toHaveLength(0);
	});

	it('should send conditional GET headers', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(sampleRss),
			headers: new Map()
		});

		const { fetchFeed } = await import('./fetch');
		await fetchFeed('https://example.com/feed.xml', {
			etag: '"my-etag"',
			lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT'
		});

		expect(mockFetch).toHaveBeenCalledWith('https://example.com/feed.xml', {
			headers: expect.objectContaining({
				'If-None-Match': '"my-etag"',
				'If-Modified-Since': 'Mon, 01 Jan 2024 00:00:00 GMT'
			})
		});
	});

	it('should throw on HTTP error', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 404,
			statusText: 'Not Found',
			headers: new Map()
		});

		const { fetchFeed } = await import('./fetch');
		await expect(fetchFeed('https://example.com/missing')).rejects.toThrow('HTTP 404');
	});
});
