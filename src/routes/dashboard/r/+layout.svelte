<script lang="ts">
	import { SITE_NAME } from '$lib/config';
	import FeedIcon from '$lib/components/FeedIcon.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { createFolderState } from '$lib/stores/folderState.svelte';

	interface Feed {
		id: string; slug: string; title: string | null;
		icon: string | null; url: string; unread: number;
	}

	interface Folder {
		id: string; name: string; sortOrder: number; unread: number;
		feeds: Feed[];
	}

	interface DiscoveredFeed {
		url: string; format: string;
		title?: string; siteUrl?: string;
	}

	let { data, children }: {
		data: {
			feeds: Feed[];
			folders: Folder[];
			uncategorizedFeeds: Feed[];
			totalUnread: number;
			starredCount: number;
		};
		children: import('svelte').Snippet;
	} = $props();

	let urlInput = $state('');
	let theme = $state(browser && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

	let showModal = $state(false);
	let modalFeeds = $state<DiscoveredFeed[]>([]);
	let feedMsg = $state<string | null>(null);

	let showCreateFolder = $state(false);
	let showRenameFolder = $state<string | null>(null);
	let renameValue = $state('');
	let showMoveFeed = $state<string | null>(null);

	let kebabActive = $state(false);
	let kebabX = $state(0);
	let kebabY = $state(0);
	let kebabItems = $state<{ label: string; action: () => void }[]>([]);

	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);

	let folderState = createFolderState();

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

	function openKebab(e: MouseEvent, items: { label: string; action: () => void }[]) {
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		kebabX = rect.right - 8;
		kebabY = rect.top;
		kebabItems = items;
		kebabActive = true;
	}

	function closeKebab() {
		kebabActive = false;
	}

	function openFolderKebab(e: MouseEvent, folder: Folder, index: number, total: number) {
		openKebab(e, [
			{
				label: 'Rename',
				action: () => {
					closeKebab();
					showRenameFolder = folder.id;
					renameValue = folder.name;
				},
			},
			{
				label: 'Delete',
				action: () => {
					closeKebab();
					if (confirm(`Delete "${folder.name}"? Feeds will move to Uncategorized.`)) {
						submitAction('?/deleteFolder', { folderId: folder.id });
					}
				},
			},
			{ label: 'Move up', action: () => { closeKebab(); submitAction('?/moveFolder', { folderId: folder.id, direction: 'up' }); }, disabled: index === 0 },
			{ label: 'Move down', action: () => { closeKebab(); submitAction('?/moveFolder', { folderId: folder.id, direction: 'down' }); }, disabled: index === total - 1 },
		].filter(i => !i.disabled));
	}

	function openFeedKebab(e: MouseEvent, feedId: string) {
		openKebab(e, [
			{
				label: 'Move to folder...',
				action: () => {
					closeKebab();
					showMoveFeed = feedId;
				},
			},
		]);
	}

	function submitAction(action: string, data_: Record<string, string>) {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = action;
		form.style.display = 'none';
		for (const [key, value] of Object.entries(data_)) {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = key;
			input.value = value;
			form.appendChild(input);
		}
		document.body.appendChild(form);
		fetch(form.action, {
			method: 'POST',
			body: new FormData(form),
		}).then(() => {
			form.remove();
			invalidateAll();
		}).catch(() => {
			form.remove();
		});
	}

	function handleDragStart(e: DragEvent, folderId: string) {
		draggedId = folderId;
		e.dataTransfer?.setData('text/plain', folderId);
		e.dataTransfer!.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent, folderId: string) {
		e.preventDefault();
		dragOverId = folderId;
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		const fromId = e.dataTransfer?.getData('text/plain');
		if (!fromId || fromId === targetId) return;

		const ids = data.folders.map(f => f.id);
		const fromIdx = ids.indexOf(fromId);
		const toIdx = ids.indexOf(targetId);
		if (fromIdx === -1 || toIdx === -1) return;

		ids.splice(fromIdx, 1);
		ids.splice(toIdx, 0, fromId);

		submitAction('?/reorderFolders', { folderIds: ids.join(',') });

		draggedId = null;
		dragOverId = null;
	}

	function handleDragEnd() {
		draggedId = null;
		dragOverId = null;
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

			{#if data.totalUnread > 0 || data.feeds.length > 0}
				<div class="flex flex-col gap-0.5">
					<a href="/dashboard/r" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-base-300 rounded">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4 4.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM13 4.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM4 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM13 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM4 15.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM13 15.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/></svg>
						<span class="flex-1 truncate">All Items</span>
						{#if data.totalUnread > 0}
							<span class="badge badge-xs badge-ghost">{data.totalUnread}</span>
						{/if}
					</a>
					<a href="/dashboard/r?starred=1" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-base-300 rounded">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
						<span class="flex-1 truncate">Starred</span>
						{#if data.starredCount > 0}
							<span class="badge badge-xs badge-ghost">{data.starredCount}</span>
						{/if}
					</a>
				</div>
			{/if}

			<div class="flex items-center justify-between px-2">
				<span class="text-xs font-semibold text-base-content/60">My Folders</span>
				<button onclick={() => showCreateFolder = true} class="btn btn-ghost btn-xs btn-square" aria-label="Create folder">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
				</button>
			</div>

			<ul class="flex flex-col">
				{#each data.folders as folder, i (folder.id)}
					<details
						class="collapse"
						open={folderState.isExpanded(folder.id)}
						ontoggle={(e) => folderState.setExpanded(folder.id, (e.currentTarget as HTMLDetailsElement).open)}
					>
						<summary
							draggable="true"
							ondragstart={(e) => handleDragStart(e, folder.id)}
							ondragover={(e) => handleDragOver(e, folder.id)}
							ondrop={(e) => handleDrop(e, folder.id)}
							ondragend={handleDragEnd}
							class="collapse-title flex items-center gap-2 px-2 py-1.5 text-sm min-h-0 rounded cursor-grab active:cursor-grabbing"
							class:dragging={draggedId === folder.id}
							class:border-t-2={dragOverId === folder.id && draggedId !== folder.id}
							class:border-t-accent={dragOverId === folder.id && draggedId !== folder.id}
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3 shrink-0 transition-transform" class:rotate-90={folderState.isExpanded(folder.id)}><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
							<span class="flex-1 min-w-0 truncate">{folder.name}</span>
							{#if folder.unread > 0}
								<span class="badge badge-xs badge-ghost">{folder.unread}</span>
							{/if}
							<button onclick={(e) => openFolderKebab(e, folder, i, data.folders.length)} class="btn btn-ghost btn-xs btn-square shrink-0" aria-label="Folder actions">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"/></svg>
							</button>
						</summary>
						<div class="collapse-content p-0">
							{#if folder.feeds.length === 0}
								<p class="px-6 py-1 text-xs text-base-content/40">No feeds</p>
							{:else}
								<ul class="flex flex-col">
									{#each folder.feeds as feed (feed.id)}
										<li class="group flex items-center gap-1 px-2 py-1 text-sm hover:bg-base-300 rounded ml-4 {($page.url.pathname + $page.url.search).includes(feed.slug) ? 'bg-base-300' : ''}">
											<a href="/dashboard/r/{feed.slug}" class="flex items-center gap-2 min-w-0 flex-1">
												<span class="inline-block size-4 shrink-0">
													<FeedIcon src={feed.icon} />
												</span>
												<span class="min-w-0 flex-1 truncate">{feed.title || feed.url}</span>
												{#if feed.unread > 0}
													<span class="badge badge-xs badge-ghost">{feed.unread}</span>
												{/if}
											</a>
											<button onclick={(e) => openFeedKebab(e, feed.id)} class="btn btn-ghost btn-xs btn-square shrink-0 opacity-0 group-hover:opacity-100" aria-label="Feed actions">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"/></svg>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</details>
				{/each}

				{#if data.uncategorizedFeeds.length > 0}
					<details class="collapse">
						<summary class="collapse-title flex items-center gap-2 px-2 py-1.5 text-sm min-h-0 text-base-content/60">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3 shrink-0"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
							<span class="flex-1 min-w-0 truncate">Uncategorized</span>
							{#if data.uncategorizedFeeds.reduce((s, f) => s + f.unread, 0) > 0}
								<span class="badge badge-xs badge-ghost">{data.uncategorizedFeeds.reduce((s, f) => s + f.unread, 0)}</span>
							{/if}
						</summary>
						<div class="collapse-content p-0">
							<ul class="flex flex-col">
								{#each data.uncategorizedFeeds as feed (feed.id)}
									<li class="group flex items-center gap-1 px-2 py-1 text-sm hover:bg-base-300 rounded ml-4 {($page.url.pathname + $page.url.search).includes(feed.slug) ? 'bg-base-300' : ''}">
										<a href="/dashboard/r/{feed.slug}" class="flex items-center gap-2 min-w-0 flex-1">
											<span class="inline-block size-4 shrink-0">
												<FeedIcon src={feed.icon} />
											</span>
											<span class="min-w-0 flex-1 truncate">{feed.title || feed.url}</span>
											{#if feed.unread > 0}
												<span class="badge badge-xs badge-ghost">{feed.unread}</span>
											{/if}
										</a>
										<button onclick={(e) => openFeedKebab(e, feed.id)} class="btn btn-ghost btn-xs btn-square shrink-0 opacity-0 group-hover:opacity-100" aria-label="Feed actions">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"/></svg>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					</details>
				{/if}
			</ul>
		</aside>

		{@render children()}
	</div>
</div>

<!-- Kebab portal -->
{#if kebabActive}
	<div class="fixed inset-0 z-[9998]" onclick={closeKebab} onkeydown={(e) => e.key === 'Enter' && closeKebab()} role="button" tabindex="-1"></div>
	<div
		class="fixed z-[9999] min-w-36 rounded-lg border border-base-300 bg-base-100 shadow-xl py-1"
		style="left: {kebabX}px; top: {kebabY}px;"
	>
		{#each kebabItems as item}
			<button onclick={item.action} class="block w-full text-left px-3 py-1.5 text-sm hover:bg-base-200">{item.label}</button>
		{/each}
	</div>
{/if}

<!-- Create folder modal -->
<dialog class="modal" class:modal-open={showCreateFolder}>
	<div class="modal-box max-w-sm">
		<h3 class="font-bold text-lg mb-4">Create Folder</h3>
		<form method="POST" action="?/createFolder" use:enhance={() => {
			return ({ result, update }: { result: { type: string }; update: (opts?: { reset: boolean }) => Promise<void> }) => {
				update({ reset: true });
				if (result.type === 'success') {
					showCreateFolder = false;
					invalidateAll();
				}
			};
		}}>
			<input name="name" type="text" class="input input-bordered w-full" required placeholder="Folder name" />
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={() => showCreateFolder = false}>Cancel</button>
				<button type="submit" class="btn btn-primary">Create</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => showCreateFolder = false}>close</button>
	</form>
</dialog>

<!-- Rename folder modal -->
<dialog class="modal" class:modal-open={showRenameFolder !== null}>
	<div class="modal-box max-w-sm">
		<h3 class="font-bold text-lg mb-4">Rename Folder</h3>
		<form method="POST" action="?/renameFolder" use:enhance={() => {
			return ({ result, update }: { result: { type: string }; update: (opts?: { reset: boolean }) => Promise<void> }) => {
				update({ reset: true });
				if (result.type === 'success') {
					showRenameFolder = null;
					invalidateAll();
				}
			};
		}}>
			<input type="hidden" name="folderId" value={showRenameFolder ?? ''} />
			<input name="name" type="text" class="input input-bordered w-full" required bind:value={renameValue} />
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={() => showRenameFolder = null}>Cancel</button>
				<button type="submit" class="btn btn-primary">Rename</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => showRenameFolder = null}>close</button>
	</form>
</dialog>

<!-- Move feed to folder modal -->
<dialog class="modal" class:modal-open={showMoveFeed !== null}>
	<div class="modal-box max-w-sm">
		<h3 class="font-bold text-lg mb-4">Move Feed to Folder</h3>
		<ul class="flex flex-col gap-1">
			<li>
				<button onclick={() => {
					const feedId = showMoveFeed;
					showMoveFeed = null;
					if (feedId) submitAction('?/assignFeedToFolder', { feedId, folderId: '' });
				}} class="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded">
					(No folder)
				</button>
			</li>
			{#each data.folders as folder}
				<li>
					<button onclick={() => {
						const feedId = showMoveFeed;
						showMoveFeed = null;
						if (feedId) submitAction('?/assignFeedToFolder', { feedId, folderId: folder.id });
					}} class="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded">
						{folder.name}
					</button>
				</li>
			{/each}
		</ul>
		<div class="modal-action">
			<button onclick={() => showMoveFeed = null} class="btn btn-ghost btn-sm">Cancel</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => showMoveFeed = null}>close</button>
	</form>
</dialog>

<!-- Discover modal -->
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
