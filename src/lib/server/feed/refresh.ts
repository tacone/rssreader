import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { refreshSingleFeed } from './store';

async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force');
	const positional = args.filter((a) => !a.startsWith('--'));

	if (positional.length < 2) {
		console.error('Usage: bun run feeds:refresh [--force] <user-email> <feed-url>');
		console.error('  With npm: npm run feeds:refresh -- [--force] <user-email> <feed-url>');
		process.exit(1);
	}

	const [email, url] = positional;

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

		const feed = await db
			.select()
			.from(schema.feeds)
			.where(and(eq(schema.feeds.userId, user.id), eq(schema.feeds.url, url)))
			.limit(1)
			.then((r) => r[0]);

		if (!feed) {
			console.error(`Feed not found for this user: ${url}`);
			process.exit(1);
		}

		const result = await refreshSingleFeed(db, user.id, feed, force, (msg) => console.log(msg));

		if (result.status === 'refreshed') {
			console.log(`OK: ${feed.title || feed.url} (${result.newItemCount} new items)`);
		} else {
			console.log(`304: ${feed.title || feed.url}`);
		}
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
