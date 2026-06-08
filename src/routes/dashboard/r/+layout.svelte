<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	interface Feed {
		id: string; slug: string; title: string | null;
		icon: string | null; url: string; unread: number;
	}

	let { data, children }: {
		data: { feeds: Feed[] };
		children: import('svelte').Snippet;
	} = $props();

	let urlInput = $state('');
	let theme = $state(browser && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<div class="grid h-screen overflow-hidden" style="grid-template-rows: auto 1fr;">
	<header class="flex items-center gap-3 border-b border-base-300 px-4 py-2">
		<a href="/dashboard" class="text-lg font-bold">RSS Reader</a>
		<div class="flex-1"></div>
		<form method="POST" action="/dashboard/r?/refreshAll" use:enhance class="inline">
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
			<form method="POST" action="/dashboard/r?/addFeed" use:enhance class="join w-full">
				<input
					bind:value={urlInput}
					name="url"
					type="url"
					placeholder="Add feed URL"
					required
					class="input input-bordered input-xs join-item flex-1"
				/>
				<button type="submit" class="btn btn-primary btn-xs join-item">+</button>
			</form>

			{#if data.feeds.length === 0}
				<p class="text-xs text-base-content/40">No feeds yet.</p>
			{/if}

			<ul class="flex flex-col gap-1">
				{#each data.feeds as feed (feed.id)}
					<li>
						<a href="/dashboard/r/{feed.slug}" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-base-300 border-l border-l-transparent pl-3 {($page.url.pathname + $page.url.search).includes(feed.slug) ? 'bg-base-300 border-l-accent!' : ''}">
							<span class="inline-block size-4 shrink-0">
								{#if feed.icon}
									<img src={feed.icon} alt="" class="size-4 rounded" onerror={e => (e.currentTarget as HTMLImageElement).hidden = true} />
								{/if}
							</span>
							<span class="min-w-0 flex-1 truncate">{feed.title || feed.url}</span>
							{#if feed.unread > 0}
								<span class="badge badge-primary badge-xs">{feed.unread}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</aside>

		{@render children()}
	</div>
</div>