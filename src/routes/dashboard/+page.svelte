<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form }: { data: { feeds: Array<{ id: string; url: string; title: string | null; siteUrl: string | null; icon: string | null; lastFetchedAt: Date | null; errorCount: number }> }; form: { message?: string; success?: string } | undefined } = $props();
	let urlInput = $state('');
</script>

<svelte:head><title>Dashboard — RSS Reader</title></svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Dashboard</h1>
		<div class="flex items-center gap-3">
			<a href="/login" class="rounded-md bg-gray-800 px-4 py-2 text-sm text-white">Sign Out</a>
		</div>
	</div>

	<form method="POST" action="?/addFeed" use:enhance class="flex gap-3">
		<input
			bind:value={urlInput}
			name="url"
			type="url"
			placeholder="https://example.com/feed.xml"
			required
			class="flex-1 rounded border px-3 py-2"
		/>
		<button type="submit" class="rounded-md bg-gray-800 px-4 py-2 text-sm text-white">Add Feed</button>
	</form>

	{#if form?.message}
		<p class="text-sm text-red-600">{form.message}</p>
	{/if}
	{#if form?.success}
		<p class="text-sm text-green-600">{form.success}</p>
	{/if}

	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Feeds ({data.feeds.length})</h2>
		{#if data.feeds.length > 0}
			<form method="POST" action="?/refreshAll" use:enhance>
				<button type="submit" class="rounded-md bg-gray-200 px-3 py-1 text-sm">Refresh All</button>
			</form>
		{/if}
	</div>

	{#if data.feeds.length === 0}
		<p class="text-gray-500">No feeds yet. Add your first feed to get started.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.feeds as feed (feed.id)}
				<li class="flex items-center gap-3 rounded border px-4 py-3">
					{#if feed.icon}
						<img src={feed.icon} alt="" class="h-6 w-6 rounded" />
					{/if}
					<div class="min-w-0 flex-1">
						<a href={feed.siteUrl ?? feed.url} class="font-medium truncate block">{feed.title || feed.url}</a>
						<p class="truncate text-sm text-gray-500">{feed.url}</p>
					</div>
					<span class="text-xs text-gray-400">
						{feed.lastFetchedAt ? new Date(feed.lastFetchedAt).toLocaleDateString() : 'never'}
					</span>
					<form method="POST" action="?/refreshFeed" use:enhance class="inline">
						<input type="hidden" name="feedId" value={feed.id} />
						<button type="submit" class="rounded bg-gray-100 px-2 py-1 text-xs">Refresh</button>
					</form>
					<form method="POST" action="?/deleteFeed" use:enhance class="inline">
						<input type="hidden" name="feedId" value={feed.id} />
						<button type="submit" class="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Delete</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>
