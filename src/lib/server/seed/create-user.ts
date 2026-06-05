import { randomUUID } from 'node:crypto';
import { randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import * as schema from '../db/schema';

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const key = scryptSync(password.normalize('NFKC'), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2
	});
	return `${salt}:${key.toString('hex')}`;
}

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
		console.log(`User ${email} already exists`);
		await client.end();
		return;
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
		accountId: email,
		providerId: 'email',
		userId,
		password: hashedPassword,
		createdAt: now,
		updatedAt: now
	});

	console.log(`Created user: ${email} / ${password}`);
	await client.end();
}

main();
