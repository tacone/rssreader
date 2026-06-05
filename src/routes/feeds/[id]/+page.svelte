<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data }: {
		data: {
			feed: { id: string; url: string; title: string | null; siteUrl: string | null; icon: string | null };
			items: Array<{ id: string; title: string | null; url: string | null; summary: string | null; content: string | null; author: string | null; publishedAt: Date | null; isRead: boolean; isStarred: boolean }>;
		}
	} = $props();

	let expandedId = $state<string | null>(null);

	function toggleExpanded(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<svelte:head>
	<title>{data.feed.title ?? 'Feed'} — RSS Reader</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-4 p-6">
	<div class="flex items-center gap-3">
		<a href="/dashboard" class="link link-hover text-sm">&larr; Dashboard</a>
	</div>

	<div class="flex items-center gap-3">
		{#if data.feed.icon}
			<img src={data.feed.icon} alt="" class="size-8 rounded" />
		{/if}
		<div>
			<h1 class="text-2xl font-bold">{data.feed.title ?? data.feed.url}</h1>
			<a href={data.feed.siteUrl ?? data.feed.url} class="link link-hover text-sm text-base-content/60">{data.feed.url}</a>
		</div>
	</div>

	<p class="text-base-content/60">{data.items.length} item(s)</p>

	{#if data.items.length === 0}
		<p class="text-base-content/40">No items yet.</p>
	{/if}

	<ul class="flex flex-col gap-2">
		{#each data.items as item (item.id)}
			<li class="card card-border bg-base-200">
				<div class="card-body p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<button onclick={() => toggleExpanded(item.id)} class="text-left">
								<h3 class="font-medium {item.isRead ? 'text-base-content/60' : ''}">
									{item.title || 'Untitled'}
									{#if !item.isRead}
										<span class="badge badge-primary badge-xs ml-1"></span>
									{/if}
								</h3>
							</button>
							{#if !expandedId || expandedId !== item.id}
								<p class="mt-1 line-clamp-2 text-sm text-base-content/50">
									{item.summary ?? ''}
								</p>
							{/if}
						</div>

						<div class="flex items-center gap-1">
							<form method="POST" action="?/toggleStar" use:enhance={handleEnhance} class="inline">
								<input type="hidden" name="itemId" value={item.id} />
								<input type="hidden" name="feedId" value={data.feed.id} />
								<input type="hidden" name="isStarred" value={String(!item.isStarred)} />
								<button type="submit" class="btn btn-ghost btn-xs">
									{item.isStarred ? '★' : '☆'}
								</button>
							</form>
						</div>
					</div>

					<div class="flex items-center gap-2 text-xs text-base-content/40">
						{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
						{#if item.author}<span>{item.author}</span>{/if}
						<a href={item.url} class="link link-hover" target="_blank">Open original</a>
					</div>

					{#if expandedId === item.id}
						<div class="prose prose-sm max-w-none pt-2">
							{@html item.content ?? item.summary ?? ''}
						</div>
					{/if}

					<div class="flex gap-2">
						<form method="POST" action="?/toggleRead" use:enhance={handleEnhance} class="inline">
							<input type="hidden" name="itemId" value={item.id} />
							<input type="hidden" name="feedId" value={data.feed.id} />
							<input type="hidden" name="isRead" value={String(!item.isRead)} />
							<button type="submit" class="btn btn-ghost btn-xs">
								{item.isRead ? 'Mark unread' : 'Mark read'}
							</button>
						</form>
					</div>
				</div>
			</li>
		{/each}
	</ul>
</div>