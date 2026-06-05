import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/dashboard');
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required', email });
		}

		try {
			await auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch {
			return fail(401, { message: 'Invalid email or password.', email });
		}

		redirect(302, '/dashboard');
	}
};
