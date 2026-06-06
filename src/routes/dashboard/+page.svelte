<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	interface Feed {
		id: string; slug: string; url: string; title: string | null;
		siteUrl: string | null; icon: string | null;
		lastFetchedAt: Date | null; errorCount: number;
	}

	let { data, form }: {
		data: { feeds: Feed[] };
		form: { message?: string; success?: string } | undefined;
	} = $props();

	let urlInput = $state('');

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<svelte:head><title>Manage Feeds — RSS Reader</title></svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Manage Feeds</h1>
		<div class="flex items-center gap-3">
			<a href="/dashboard/r" class="btn btn-primary btn-sm">Start Reading</a>
			<form method="POST" action="?/signOut" use:enhance>
				<button type="submit" class="btn btn-ghost btn-sm">Sign Out</button>
			</form>
		</div>
	</div>

	<form method="POST" action="?/addFeed" use:enhance class="join w-full">
		<input
			bind:value={urlInput}
			name="url"
			type="url"
			placeholder="https://example.com/feed.xml"
			required
			class="input input-bordered join-item flex-1"
		/>
		<button type="submit" class="btn btn-primary join-item">Add Feed</button>
	</form>

	{#if form?.message}
		<p class="text-sm text-error">{form.message}</p>
	{/if}
	{#if form?.success}
		<div class="alert alert-success"><span>{form.success}</span></div>
	{/if}

	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Feeds ({data.feeds.length})</h2>
		{#if data.feeds.length > 0}
			<form method="POST" action="?/refreshAll" use:enhance>
				<button type="submit" class="btn btn-outline btn-sm">Refresh All</button>
			</form>
		{/if}
	</div>

	{#if data.feeds.length === 0}
		<p class="text-base-content/60">No feeds yet. Add your first feed to get started.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.feeds as feed (feed.id)}
				<li class="card card-border card-side items-center bg-base-200 px-4 py-3">
					<span class="inline-block size-6 shrink-0">
						{#if feed.icon}
							<img src={feed.icon} alt="" class="size-6 rounded" onerror={e => (e.currentTarget as HTMLImageElement).hidden = true} />
						{/if}
					</span>
					<div class="min-w-0 flex-1 px-3">
						<a href="/dashboard/r/{feed.slug}" class="link link-hover truncate block font-medium">{feed.title || feed.url}</a>
						<p class="truncate text-sm text-base-content/60">{feed.url}</p>
					</div>
					<span class="text-xs text-base-content/40">
						{feed.lastFetchedAt ? new Date(feed.lastFetchedAt).toLocaleDateString() : 'never'}
					</span>
					<form method="POST" action="?/refreshFeed" use:enhance class="inline">
						<input type="hidden" name="feedId" value={feed.id} />
						<button type="submit" class="btn btn-ghost btn-xs">Refresh</button>
					</form>
					<form method="POST" action="?/deleteFeed" use:enhance class="inline">
						<input type="hidden" name="feedId" value={feed.id} />
						<button type="submit" class="btn btn-ghost btn-xs text-error">Delete</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>