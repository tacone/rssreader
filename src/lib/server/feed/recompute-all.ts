import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { htmlToText } from '../html';
import { sanitizeHtml } from '../sanitize';

async function main() {
	const email = process.argv[2];

	if (!email) {
		console.error('Usage: bun run feeds:recompute-all <user-email>');
		console.error('  With npm: npm run feeds:recompute-all -- <user-email>');
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

		console.log(`Recomputing ${feeds.length} feed(s) for ${email}...`);

		let totalUpdated = 0;

		for (const feed of feeds) {
			const items = await db
				.select({ id: schema.items.id, rawTitle: schema.items.rawTitle, rawSummary: schema.items.rawSummary, rawContent: schema.items.rawContent })
				.from(schema.items)
				.where(eq(schema.items.feedId, feed.id));

			let updated = 0;

			for (const item of items) {
				if (!item.rawTitle && !item.rawSummary && !item.rawContent) continue;

				const title = item.rawTitle ? htmlToText(item.rawTitle) : null;

				let summary: string | null;
				if (item.rawSummary) {
					summary = htmlToText(item.rawSummary);
				} else if (item.rawContent) {
					summary = htmlToText(item.rawContent).slice(0, 255);
				} else {
					summary = null;
				}

				const content = item.rawContent ? await sanitizeHtml(item.rawContent, feed.url) : null;

				await db
					.update(schema.items)
					.set({ title, summary, content })
					.where(eq(schema.items.id, item.id));

				updated++;
			}

			totalUpdated += updated;
			console.log(`  ${feed.title || feed.url}: ${updated} items`);
		}

		console.log(`Done: ${totalUpdated} items recomputed`);
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
