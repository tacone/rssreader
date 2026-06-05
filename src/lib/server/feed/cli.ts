import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { fetchFeed } from './fetch';
import { upsertFeed } from './store';

async function main() {
	const url = process.argv[2];
	if (!url) {
		console.error('Usage: bun run fetch-feeds <feed-url>');
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
		console.log(`Fetching: ${url}`);
		const result = await fetchFeed(url);
		console.log(`  → ${result.items.length} items found`);

		const users = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
		if (users.length === 0) {
			console.error('No users found. Create a user first via the web UI.');
			process.exit(1);
		}

		const { feedId, newItemCount } = await upsertFeed(db, users[0].id, url, result);
		console.log(`  → feed stored (${newItemCount} new items)`);
	} catch (err) {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
