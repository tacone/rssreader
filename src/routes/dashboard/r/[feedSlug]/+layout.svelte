<script lang="ts">
	import { page } from '$app/stores';

	interface Item {
		id: string; slug: string; title: string | null;
		url: string | null; summary: string | null;
		author: string | null; publishedAt: Date | null;
		isRead: boolean; isStarred: boolean;
	}

	let { data, children }: {
		data: { items: Item[]; feedSlug: string };
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="grid overflow-hidden" style="grid-template-columns: 1fr 2fr;">
	<section class="flex flex-col overflow-y-auto border-r border-base-300">
		{#if data.items.length === 0}
			<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-base-content/40">
				No items yet
			</div>
		{:else}
			<ul class="flex flex-col">
				{#each data.items as item (item.id)}
					<li>
						<a href="/dashboard/r/{data.feedSlug}/{item.slug}" class="block border-b border-base-200 px-4 py-3 hover:bg-base-200 ml-1 border-l-4 {($page.url.pathname + $page.url.search).includes(item.slug) ? 'bg-base-200 border-l-accent' : 'border-l-transparent'}">
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

	<section class="flex flex-col overflow-y-auto">
		{@render children()}
	</section>
</div>