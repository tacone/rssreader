import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { fetchFeed } from './fetch';
import { upsertFeed } from './store';
import { detectPartialFeed } from './detect-partial';
import { eq } from 'drizzle-orm';

async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force');
	const email = args.find((a) => !a.startsWith('--'));

	if (!email) {
		console.error('Usage: bun run feeds:refresh-all [--force] <user-email>');
		console.error('  With npm: npm run feeds:refresh-all -- [--force] <user-email>');
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

		console.log(`Refreshing ${feeds.length} feed(s) for ${email}${force ? ' (forced)' : ''}...`);

		let refreshed = 0;
		let cached = 0;
		let errors = 0;

		for (const feed of feeds) {
			try {
				const result = await fetchFeed(feed.url, force ? undefined : {
					etag: feed.etag ?? undefined,
					lastModified: feed.lastModified ?? undefined,
				});
				if (result.items.length > 0 || result.meta.title) {
					const { newItemCount } = await upsertFeed(db, user.id, feed.url, result);

					if (force) {
						try {
							const isPartial = await detectPartialFeed(feed.url, result.items, (msg) => console.log(`  detect: ${msg}`));
							await db
								.update(schema.feeds)
								.set({ isPartialFeed: isPartial ? 1 : 0 })
								.where(eq(schema.feeds.id, feed.id));
							if (isPartial) {
								console.log(`  → PARTIAL FEED`);
							}
						} catch (e) {
							console.error(`  detect-err: ${feed.title || feed.url} — ${e instanceof Error ? e.message : e}`);
						}
					}

					console.log(`  OK: ${feed.title || feed.url} (${newItemCount} new items)`);
					refreshed++;
				} else {
					console.log(`  304: ${feed.title || feed.url}`);
					cached++;
				}
			} catch (e) {
				console.error(`  ERR: ${feed.title || feed.url} — ${e instanceof Error ? e.message : e}`);
				errors++;
			}
		}

		const parts = [`${refreshed} refreshed`];
		if (cached > 0) parts.push(`${cached} cached`);
		if (errors > 0) parts.push(`${errors} failed`);
		console.log(`Done: ${parts.join(', ')}`);
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
