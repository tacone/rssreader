import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { fetchFeed } from './fetch';
import { upsertFeed } from './store';
import { eq } from 'drizzle-orm';

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error('Usage: bun run feeds:refresh-all <user-email>');
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

		console.log(`Refreshing ${feeds.length} feed(s) for ${email}...`);

		let refreshed = 0;
		let errors = 0;

		for (const feed of feeds) {
			try {
				const result = await fetchFeed(feed.url, {
					etag: feed.etag ?? undefined,
					lastModified: feed.lastModified ?? undefined,
				});
				if (result.items.length > 0 || result.meta.title) {
					const { newItemCount } = await upsertFeed(db, user.id, feed.url, result);
					console.log(`  OK: ${feed.title || feed.url} (${newItemCount} new items)`);
				} else {
					console.log(`  304: ${feed.title || feed.url}`);
				}
				refreshed++;
			} catch (e) {
				console.error(`  ERR: ${feed.title || feed.url} — ${e instanceof Error ? e.message : e}`);
				errors++;
			}
		}

		console.log(`Done: ${refreshed} refreshed, ${errors} failed`);
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
