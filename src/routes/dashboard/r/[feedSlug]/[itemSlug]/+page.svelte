<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import RssEmbedHandler from '$lib/components/RssEmbedHandler.svelte';

	let { data }: {
		data: {
			item: { id: string; title: string | null; url: string | null; summary: string | null; content: string | null; author: string | null; publishedAt: Date | null; isRead: boolean; isStarred: boolean };
		}
	} = $props();

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<RssEmbedHandler />

<article class="flex flex-col gap-4 p-6">
	<div class="flex items-start justify-between gap-3">
		<h2 class="text-xl font-bold">{data.item.title || 'Untitled'}</h2>
		<div class="flex shrink-0 gap-1">
			<form method="POST" action="?/toggleStar" use:enhance={handleEnhance} class="inline">
				<input type="hidden" name="itemId" value={data.item.id} />
				<input type="hidden" name="isStarred" value={String(!data.item.isStarred)} />
				<button type="submit" class="btn btn-ghost btn-sm">
					{data.item.isStarred ? '★' : '☆'}
				</button>
			</form>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/40">
		{data.item.publishedAt ? new Date(data.item.publishedAt).toLocaleDateString() : ''}
		{#if data.item.author}<span>by {data.item.author}</span>{/if}
		<a href={data.item.url} class="link link-hover" target="_blank">Open original</a>
	</div>

	<form method="POST" action="?/toggleRead" use:enhance={handleEnhance}>
		<input type="hidden" name="itemId" value={data.item.id} />
		<input type="hidden" name="isRead" value={String(!data.item.isRead)} />
		<button type="submit" class="btn btn-outline btn-xs">
			{data.item.isRead ? 'Mark unread' : 'Mark read'}
		</button>
	</form>

	<div class="prose prose-sm max-w-none">
		{@html data.item.content ?? data.item.summary ?? '<p class="text-base-content/40">No content</p>'}
	</div>
</article>