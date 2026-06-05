<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await authClient.signUp.email({ name, email, password });

		loading = false;
		if (err) {
			error = err.message ?? 'Could not create account.';
			return;
		}
		goto('/');
	}
</script>

<svelte:head><title>Create an account</title></svelte:head>

<form onsubmit={handleSubmit} class="mx-auto flex max-w-md flex-col gap-3 p-6">
	<h1 class="text-2xl font-bold">Create an account</h1>

	<input bind:value={name} placeholder="Name" required class="rounded border px-3 py-2" />
	<input bind:value={email} type="email" placeholder="Email" required class="rounded border px-3 py-2" />
	<input bind:value={password} type="password" placeholder="Password" required class="rounded border px-3 py-2" />

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	<button type="submit" disabled={loading} class="rounded-md bg-gray-800 px-4 py-2 text-white disabled:opacity-50">
		{loading ? 'Creating…' : 'Create account'}
	</button>

	<p class="text-sm">Already have an account? <a href="/login" class="underline">Log in</a></p>
</form>
