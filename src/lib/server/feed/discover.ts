import { discoverFeeds, type DiscoverFetchFnResponse } from 'feedscout';
import { addFeed } from './actions';
import { resolve } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateIP(ip: string): boolean {
	if (isIP(ip) !== 4) {
		return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80');
	}
	const octets = ip.split('.').map(Number);
	if (octets[0] === 10) return true;
	if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
	if (octets[0] === 192 && octets[1] === 168) return true;
	if (octets[0] === 127) return true;
	if (octets[0] === 169 && octets[1] === 254) return true;
	return false;
}

async function isPrivateHost(urlStr: string): Promise<boolean> {
	try {
		const url = new URL(urlStr);
		const hostname = url.hostname;
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
		if (isIP(hostname)) return isPrivateIP(hostname);
		const addresses = await resolve(hostname);
		return addresses.some((addr) => isPrivateIP(addr));
	} catch {
		return false;
	}
}

async function customFetchFn(url: string, options?: { method?: string; headers?: Record<string, string> }): Promise<DiscoverFetchFnResponse> {
	const response = await fetch(url, {
		method: (options?.method as 'GET' | 'HEAD') || 'GET',
		headers: options?.headers,
		signal: AbortSignal.timeout(15_000),
	});
	return {
		headers: response.headers,
		body: await response.text(),
		url: response.url,
		status: response.status,
		statusText: response.statusText,
	};
}

export interface DiscoveredFeed {
	url: string;
	format: 'rss' | 'atom' | 'json' | 'rdf';
	title?: string;
	description?: string;
	siteUrl?: string;
}

export async function discover(urlStr: string): Promise<{
	feeds: DiscoveredFeed[];
	error?: string;
}> {
	try {
		new URL(urlStr);
	} catch {
		return { feeds: [], error: 'Invalid URL' };
	}

	const isPrivate = await isPrivateHost(urlStr);
	if (isPrivate) {
		return { feeds: [], error: 'Cannot discover feeds on private networks' };
	}

	try {
		const results = await discoverFeeds(urlStr, {
			fetchFn: customFetchFn,
			stopOnFirstMethod: false,
			includeInvalid: false,
		});

			const dedup = new Map<string, DiscoveredFeed>();
		for (const r of results) {
			if (!r.isValid) continue;
			const normal = r.url.replace(/\/+$/, '');
			if (dedup.has(normal)) continue;
			dedup.set(normal, {
				url: normal,
				format: r.format,
				title: r.title || undefined,
				description: r.description || undefined,
				siteUrl: r.siteUrl || undefined,
			});
		}

		const feeds = [...dedup.values()].sort((a, b) => a.url.length - b.url.length);

		return { feeds };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return { feeds: [], error: msg };
	}
}

export async function discoverAndSubscribe(
	userId: string,
	urlStr: string,
): Promise<{
	subscribed?: { feedId: string };
	discovered?: DiscoveredFeed[];
	error?: string;
}> {
	const { feeds, error } = await discover(urlStr);
	if (error) return { error };
	if (feeds.length === 0) return { error: 'No feeds found at this URL' };
	if (feeds.length === 1) {
		const result = await addFeed(userId, feeds[0].url);
		if ('error' in result || 'message' in result) {
			const msg = (result as { message?: string }).message || 'Failed to add feed';
			return { error: msg };
		}
		return { subscribed: { feedId: (result as { feedId?: string }).feedId || '' } };
	}
	return { discovered: feeds };
}
