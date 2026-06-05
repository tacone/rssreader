<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await authClient.signIn.email({ email, password });

		loading = false;
		if (err) {
			error = err.message ?? 'Invalid email or password.';
			return;
		}
		goto('/');
	}
</script>

<svelte:head><title>Log in</title></svelte:head>

<form onsubmit={handleSubmit} class="mx-auto flex max-w-md flex-col gap-3 p-6">
	<h1 class="text-2xl font-bold">Log in</h1>

	<input bind:value={email} type="email" placeholder="Email" required class="rounded border px-3 py-2" />
	<input bind:value={password} type="password" placeholder="Password" required class="rounded border px-3 py-2" />

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	<button type="submit" disabled={loading} class="rounded-md bg-gray-800 px-4 py-2 text-white disabled:opacity-50">
		{loading ? 'Signing in…' : 'Log in'}
	</button>

	<p class="text-sm">New here? <a href="/signup" class="underline">Create an account</a></p>
</form>
