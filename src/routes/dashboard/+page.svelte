<script lang="ts">
	import { SITE_NAME } from '$lib/config';
	import FeedIcon from '$lib/components/FeedIcon.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	interface Feed {
		id: string; slug: string; url: string; title: string | null;
		siteUrl: string | null; icon: string | null;
		lastFetchedAt: Date | null; errorCount: number;
	}

	interface DiscoveredFeed {
		url: string; format: string;
		title?: string; siteUrl?: string;
	}

	let { data, form }: {
		data: { feeds: Feed[] };
		form: { message?: string; success?: string } | undefined;
	} = $props();

	let urlInput = $state('');

	let showModal = $state(false);
	let modalFeeds = $state<DiscoveredFeed[]>([]);
	let feedMsg = $state<string | null>(null);

	function handleAddFeed() {
		return function handleAddFeedResult({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: (opts?: { reset: boolean }) => Promise<void> }) {
			update({ reset: true });
			if (result.type === 'success' && result.data) {
				if (result.data.success) {
					feedMsg = 'Feed added';
					urlInput = '';
					invalidateAll();
				} else if (result.data.discovered) {
					modalFeeds = result.data.discovered as DiscoveredFeed[];
					showModal = true;
					feedMsg = null;
				} else if (result.data.error) {
					feedMsg = result.data.error as string;
				} else if (result.data.discoverError) {
					feedMsg = result.data.discoverError as string;
				}
			} else if (result.type === 'error') {
				feedMsg = 'Something went wrong';
			}
		};
	}

	function handleSubscribe() {
		return function handleSubscribeResult({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: (opts?: { reset: boolean }) => Promise<void> }) {
			update({ reset: true });
			if (result.type === 'success' && result.data && (result.data.success || result.data._action)) {
				showModal = false;
				modalFeeds = [];
				feedMsg = 'Feed added';
				invalidateAll();
			} else {
				showModal = false;
				modalFeeds = [];
				feedMsg = (result.data?.message as string) || 'Failed to add feed';
			}
		};
	}

	function closeModal() {
		showModal = false;
	}
</script>

<svelte:head><title>Manage Feeds — {SITE_NAME}</title></svelte:head>

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

	<form method="POST" action="?/addFeed" use:enhance={handleAddFeed} class="join w-full">
		<input
			bind:value={urlInput}
			name="url"
			type="text"
			placeholder="https://example.com/feed.xml or website URL"
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

	{#if feedMsg}
		<p class="text-sm {feedMsg === 'Feed added' ? 'text-success' : 'text-error'}">{feedMsg}</p>
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
						<FeedIcon src={feed.icon} size="size-6" />
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

<dialog class="modal" class:modal-open={showModal}>
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-4">Discovered Feeds</h3>
		{#if modalFeeds.length === 0}
			<p class="text-base-content/60">No feeds found.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each modalFeeds as f (f.url)}
					<li class="flex items-center gap-2 border-b border-base-300 pb-2 last:border-0">
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{f.title || f.url}</p>
							<p class="truncate text-sm text-base-content/60">{f.url} ({f.format})</p>
						</div>
						<form method="POST" action="?/subscribeFromDiscover" use:enhance={handleSubscribe} class="inline">
							<input type="hidden" name="feedUrl" value={f.url} />
							<button type="submit" class="btn btn-primary btn-sm">Subscribe</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="modal-action">
			<button onclick={closeModal} class="btn btn-ghost btn-sm">Close</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={closeModal}>close</button>
	</form>
</dialog>
