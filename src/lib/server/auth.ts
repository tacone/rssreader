import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { bearer, jwt } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	user: { modelName: 'users' },
	session: {
		modelName: 'sessions',
		cookieCache: {
			enabled: true,
			maxAge: 7 * 24 * 60 * 60,
			strategy: 'jwe'
		}
	},
	account: { modelName: 'accounts' },
	verification: { modelName: 'verifications' },
	plugins: [bearer(), jwt({ disableSettingJwtHeader: true }), sveltekitCookies(getRequestEvent)]
});
