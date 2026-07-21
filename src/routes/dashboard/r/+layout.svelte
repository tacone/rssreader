<script lang="ts">
	import { SITE_NAME } from '$lib/config';
	import FeedIcon from '$lib/components/FeedIcon.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';

	interface Feed {
		id: string; slug: string; title: string | null;
		icon: string | null; url: string; unread: number;
	}

	interface DiscoveredFeed {
		url: string; format: string;
		title?: string; siteUrl?: string;
	}

	let { data, children }: {
		data: { feeds: Feed[] };
		children: import('svelte').Snippet;
	} = $props();

	let urlInput = $state('');
	let theme = $state(browser && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

	let showModal = $state(false);
	let modalFeeds = $state<DiscoveredFeed[]>([]);
	let modalError = $state<string | null>(null);
	let feedMsg = $state<string | null>(null);

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	function handleRefreshAll() {
		invalidateAll();
	}

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

<div class="grid h-screen overflow-hidden" style="grid-template-rows: auto 1fr;">
	<header class="flex items-center gap-3 border-b border-base-300 px-4 py-2">
		<a href="/dashboard" class="mr-3 flex items-center gap-3 text-lg font-bold"><img src={favicon} alt="" class="size-5" />{SITE_NAME}</a>
		<div class="flex-1"></div>
		<form method="POST" action="/dashboard/r?/refreshAll" use:enhance={handleRefreshAll} class="inline">
			<button type="submit" class="btn btn-ghost btn-xs">Refresh All</button>
		</form>
		<form method="POST" action="/dashboard/r?/signOut" use:enhance class="inline">
			<button type="submit" class="btn btn-ghost btn-xs">Sign Out</button>
		</form>
		<button onclick={toggleTheme} class="btn btn-square btn-ghost btn-xs" aria-label="Toggle theme">
			{#if theme === 'light'}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
					<path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
					<path fill-rule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clip-rule="evenodd" />
				</svg>
			{/if}
		</button>
	</header>

	<div class="grid overflow-hidden" style="grid-template-columns: 240px 1fr;">
		<aside class="flex flex-col gap-2 overflow-y-auto border-r border-base-300 p-3">
			<form method="POST" action="/dashboard/r?/addFeed" use:enhance={handleAddFeed} class="join w-full">
				<input
					bind:value={urlInput}
					name="url"
					type="text"
					placeholder="Feed or website URL"
					required
					class="input input-bordered input-xs join-item flex-1"
				/>
				<button type="submit" class="btn btn-primary btn-xs join-item">+</button>
			</form>

			{#if feedMsg}
				<p class="text-xs {feedMsg === 'Feed added' || feedMsg === 'Feed discovered and added!' ? 'text-success' : 'text-error'}">{feedMsg}</p>
			{/if}

			{#if data.feeds.length === 0}
				<p class="text-xs text-base-content/40">No feeds yet.</p>
			{/if}

			<ul class="flex flex-col">
				{#each data.feeds as feed (feed.id)}
					<li>
						<a href="/dashboard/r/{feed.slug}" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-base-300 border-l border-l-transparent pl-3 {($page.url.pathname + $page.url.search).includes(feed.slug) ? 'bg-base-300 border-l-accent!' : ''}">
							<span class="inline-block size-4 shrink-0">
								<FeedIcon src={feed.icon} />
							</span>
							<span class="min-w-0 flex-1 truncate">{feed.title || feed.url}</span>
							{#if feed.unread > 0}
								<span class="badge badge-xs badge-ghost">{feed.unread}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</aside>

		{@render children()}
	</div>
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
							<p class="truncate text-sm font-medium">{f.title || f.url}</p>
							<p class="truncate text-xs text-base-content/60">{f.url}</p>
						</div>
						<form method="POST" action="/dashboard/r?/subscribeFromDiscover" use:enhance={handleSubscribe} class="inline">
							<input type="hidden" name="feedUrl" value={f.url} />
							<button type="submit" class="btn btn-primary btn-xs">Subscribe</button>
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
