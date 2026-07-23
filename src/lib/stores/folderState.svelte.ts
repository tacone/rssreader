import { z } from 'zod';
import { browser } from '$app/environment';

const STORAGE_KEY = 'rssreader:folderState';

const schema = z.record(z.string(), z.boolean());

type FolderState = z.infer<typeof schema>;

function load(): FolderState {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		return schema.parse(JSON.parse(raw));
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {};
	}
}

function save(state: FolderState): void {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* quota exceeded or unavailable */
	}
}

export function createFolderState() {
	let state = $state<FolderState>(load());

	function isExpanded(folderId: string): boolean {
		return state[folderId] ?? true;
	}

	function setExpanded(folderId: string, expanded: boolean) {
		state = { ...state, [folderId]: expanded };
		save(state);
	}

	return {
		get state() { return state; },
		isExpanded,
		setExpanded,
	};
}
