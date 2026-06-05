<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	interface Feed {
		id: string; url: string; title: string | null;
		icon: string | null; siteUrl: string | null;
		errorCount: number; unread: number;
	}

	interface Item {
		id: string; title: string | null; url: string | null;
		summary: string | null; content: string | null;
		author: string | null; publishedAt: Date | null;
		isRead: boolean; isStarred: boolean;
	}

	let { data, form }: {
		data: { feeds: Feed[]; items: Item[]; selectedItem: Item | null; selectedFeedId: string | null };
		form: { message?: string; success?: string } | undefined;
	} = $props();

	let urlInput = $state('');

	function feedUrl(feedId: string) {
		return `?feed=${feedId}`;
	}

	function itemUrl(feedId: string, itemId: string) {
		return `?feed=${feedId}&item=${itemId}`;
	}

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<svelte:head><title>RSS Reader</title></svelte:head>

<div class="grid h-screen overflow-hidden" style="grid-template-rows: auto 1fr;">
	<header class="flex items-center gap-3 border-b border-base-300 px-4 py-2">
		<h1 class="text-lg font-bold">RSS Reader</h1>
		<div class="flex-1"></div>
		<form method="POST" action="?/refreshAll" use:enhance class="inline">
			<button type="submit" class="btn btn-ghost btn-xs">Refresh All</button>
		</form>
		<form method="POST" action="?/signOut" use:enhance class="inline">
			<button type="submit" class="btn btn-ghost btn-xs">Sign Out</button>
		</form>
	</header>

	<div class="grid overflow-hidden" style="grid-template-columns: 240px 1fr 2fr;">
		<aside class="flex flex-col gap-2 overflow-y-auto border-r border-base-300 p-3">
			<form method="POST" action="?/addFeed" use:enhance class="join w-full">
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

			{#if form?.message}
				<p class="text-xs text-error">{form.message}</p>
			{/if}
			{#if form?.success}
				<p class="text-xs text-success">{form.success}</p>
			{/if}

			{#if data.feeds.length === 0}
				<p class="text-xs text-base-content/40">No feeds yet.</p>
			{/if}

			<ul class="flex flex-col gap-1">
				{#each data.feeds as feed (feed.id)}
					<li>
						<a href={feedUrl(feed.id)} class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-300 {data.selectedFeedId === feed.id ? 'bg-base-300' : ''}">
							{#if feed.icon}
								<img src={feed.icon} alt="" class="size-4 rounded" />
							{/if}
							<span class="min-w-0 flex-1 truncate">{feed.title || feed.url}</span>
							{#if feed.unread > 0}
								<span class="badge badge-primary badge-xs">{feed.unread}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</aside>

		<section class="flex flex-col overflow-y-auto">
			{#if data.items.length === 0}
				<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-base-content/40">
					Select a feed to view items
				</div>
			{:else}
				<ul class="flex flex-col">
					{#each data.items as item (item.id)}
						<li>
							<a href={itemUrl(data.selectedFeedId!, item.id)} class="block border-b border-base-200 px-4 py-3 hover:bg-base-200 {data.selectedItem?.id === item.id ? 'bg-base-200' : ''}">
								<div class="flex items-start justify-between gap-2">
									<h3 class="text-sm font-medium {item.isRead ? 'text-base-content/50' : ''}">
										{item.title || 'Untitled'}
									</h3>
									<div class="flex shrink-0 gap-1">
										<span class="text-xs text-base-content/30">
											{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
										</span>
										{#if item.isStarred}
											<span class="text-warning">★</span>
										{/if}
									</div>
								</div>
								{#if item.summary}
									<p class="mt-0.5 line-clamp-2 text-xs text-base-content/40">{item.summary}</p>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="flex flex-col overflow-y-auto border-l border-base-300">
			{#if data.selectedItem}
				{@const item = data.selectedItem}
				<article class="flex flex-col gap-4 p-6">
					<div class="flex items-start justify-between gap-3">
						<h2 class="text-xl font-bold">{item.title || 'Untitled'}</h2>
						<div class="flex shrink-0 gap-1">
							<form method="POST" action="?/toggleStar" use:enhance={handleEnhance} class="inline">
								<input type="hidden" name="itemId" value={item.id} />
								<input type="hidden" name="isStarred" value={String(!item.isStarred)} />
								<button type="submit" class="btn btn-ghost btn-sm">
									{item.isStarred ? '★' : '☆'}
								</button>
							</form>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/40">
						{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
						{#if item.author}<span>by {item.author}</span>{/if}
						<a href={item.url} class="link link-hover" target="_blank">Open original</a>
					</div>

					<form method="POST" action="?/toggleRead" use:enhance={handleEnhance}>
						<input type="hidden" name="itemId" value={item.id} />
						<input type="hidden" name="isRead" value={String(!item.isRead)} />
						<button type="submit" class="btn btn-outline btn-xs">
							{item.isRead ? 'Mark unread' : 'Mark read'}
						</button>
					</form>

					<div class="prose prose-sm max-w-none">
						{@html item.content ?? item.summary ?? '<p class="text-base-content/40">No content</p>'}
					</div>
				</article>
			{:else}
				<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-base-content/40">
					Select an item to read
				</div>
			{/if}
		</section>
	</div>
</div>