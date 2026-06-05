import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import * as schema from '../db/schema';
import { hashPassword } from './password';

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error('DATABASE_URL is not set');
		process.exit(1);
	}

	const email = process.argv[2] || 'admin@test.com';
	const password = process.argv[3] || 'admin123';
	const name = process.argv[4] || 'Admin';

	const client = postgres(dbUrl);
	const db = drizzle(client, { schema });

	const existing = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);

	if (existing.length > 0) {
		await db.delete(schema.users).where(eq(schema.users.id, existing[0].id));
	}

	const now = new Date();
	const userId = randomUUID();
	const hashedPassword = hashPassword(password);

	await db.insert(schema.users).values({
		id: userId,
		email,
		emailVerified: true,
		name,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(schema.accounts).values({
		id: randomUUID(),
		accountId: userId,
		providerId: 'credential',
		userId,
		password: hashedPassword,
		createdAt: now,
		updatedAt: now
	});

	console.log(`Created user: ${email} / ${password}`);
	await client.end();
}

main();
