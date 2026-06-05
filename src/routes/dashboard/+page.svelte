<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	const session = authClient.useSession();

	async function handleSignOut() {
		await authClient.signOut();
		goto('/login');
	}
</script>

<svelte:head><title>Dashboard — RSS Reader</title></svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-4 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Dashboard</h1>
		<div class="flex items-center gap-3">
			{#if $session.data}
				<span class="text-sm text-gray-600">{$session.data.user.name}</span>
			{/if}
			<button onclick={handleSignOut} class="rounded-md bg-gray-800 px-4 py-2 text-sm text-white">
				Sign Out
			</button>
		</div>
	</div>
	<p class="text-gray-500">No feeds yet. Add your first feed to get started.</p>
</div>
