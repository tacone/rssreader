<script lang="ts">
	import { enhance } from '$app/forms';

	let { form }: { form: { message?: string } | undefined } = $props();
</script>

<svelte:head><title>Log in</title></svelte:head>

<form method="POST" use:enhance class="mx-auto flex max-w-md flex-col gap-3 p-6">
	<h1 class="text-2xl font-bold">Log in</h1>

	<input name="email" type="email" placeholder="Email" required class="rounded border px-3 py-2" />
	<input name="password" type="password" placeholder="Password" required class="rounded border px-3 py-2" />

	{#if form?.message}
		<p class="text-sm text-red-600">{form.message}</p>
	{/if}

	<button type="submit" class="rounded-md bg-gray-800 px-4 py-2 text-white">Log in</button>

	<p class="text-sm">New here? <a href="/signup" class="underline">Create an account</a></p>
</form>
