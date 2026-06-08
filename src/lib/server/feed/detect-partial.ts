import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { fetchFeed } from './fetch';
import { extractFromPage, compareContentLength, getTextContent } from './extract';

export async function detectPartialFeed(
	feedUrl: string,
	items: Array<{ url?: string; content?: string; summary?: string }>,
	log?: (msg: string) => void
): Promise<boolean> {
	const logMsg = log ?? (() => {});
	const candidates = items.filter((item) => item.url).slice(0, 5);

	if (candidates.length < 3) {
		logMsg(`  detection: only ${candidates.length} items with URLs, need at least 3`);
		return false;
	}

	let matches = 0;
	let attempts = 0;

	for (const item of candidates) {
		try {
			logMsg(`  detection: fetching ${item.url}`);
			const response = await fetch(item.url!);
			if (!response.ok) {
				logMsg(`  detection: HTTP ${response.status} for ${item.url}`);
				continue;
			}

			const html = await response.text();
			const { content } = extractFromPage(html, item.url!);

			if (!content) {
				logMsg(`  detection: not readerable or empty — ${item.url}`);
				continue;
			}

			attempts++;

			const feedText = item.content ?? item.summary ?? '';
			const feedTextContent = getTextContent(feedText);
			const extractedText = getTextContent(content);

			if (compareContentLength(extractedText, feedTextContent)) {
				matches++;
				logMsg(`  detection: MATCH (feed:${feedTextContent.length}, extracted:${extractedText.length}) — ${item.url}`);
			} else {
				logMsg(`  detection: no match (feed:${feedTextContent.length}, extracted:${extractedText.length}) — ${item.url}`);
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			logMsg(`  detection: error fetching ${item.url} — ${msg}`);
		}
	}

	if (attempts < 3) {
		logMsg(`  detection: only ${attempts}/${candidates.length} items fetched successfully, need at least 3`);
		return false;
	}

	const isPartial = matches >= 3;
	logMsg(`  detection: ${matches}/${attempts} matches → ${isPartial ? 'PARTIAL' : 'full content'}`);
	return isPartial;
}

async function main() {
	const email = process.argv[2];

	if (!email) {
		console.error('Usage: bun run feeds:detect-partial <user-email>');
		process.exit(1);
	}

	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error('DATABASE_URL is not set');
		process.exit(1);
	}

	const client = postgres(dbUrl);
	const db = drizzle(client, { schema });

	try {
		const user = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.email, email))
			.limit(1)
			.then((r) => r[0]);

		if (!user) {
			console.error(`User not found: ${email}`);
			process.exit(1);
		}

		const feeds = await db
			.select()
			.from(schema.feeds)
			.where(eq(schema.feeds.userId, user.id));

		if (feeds.length === 0) {
			console.log('No feeds found for this user.');
			process.exit(0);
		}

		console.log(`Detecting partial feeds for ${email} (${feeds.length} feed(s))...`);

		let marked = 0;
		let skipped = 0;
		let errors = 0;

		for (const feed of feeds) {
			try {
				console.log(`\n${feed.title || feed.url}:`);

				const result = await fetchFeed(feed.url);
				if (result.items.length === 0) {
					console.log(`  no items found, skipping`);
					skipped++;
					continue;
				}

				const isPartial = await detectPartialFeed(feed.url, result.items, (msg) => console.log(msg));

				await db
					.update(schema.feeds)
					.set({ isPartialFeed: isPartial ? 1 : 0 })
					.where(eq(schema.feeds.id, feed.id));

				if (isPartial) {
					console.log(`  → marked as PARTIAL`);
					marked++;
				} else {
					console.log(`  → marked as full-content`);
				}
			} catch (e) {
				console.error(`  ERR: ${feed.title || feed.url} — ${e instanceof Error ? e.message : e}`);
				errors++;
			}
		}

		const parts = [`${marked} marked partial`];
		parts.push(`${feeds.length - marked - errors - skipped} full-content`);
		if (skipped > 0) parts.push(`${skipped} skipped`);
		if (errors > 0) parts.push(`${errors} failed`);
		console.log(`\nDone: ${parts.join(', ')}`);
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
