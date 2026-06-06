export function kebab(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function generateSlug(
	id: string,
	label: string | null | undefined,
	fallbackUrl?: string | null | undefined
): string {
	const base = label
		? kebab(label)
		: fallbackUrl
			? kebab(domainFromUrl(fallbackUrl))
			: 'untitled';
	const suffix = id.slice(-8);
	return `${base || 'untitled'}-${suffix}`;
}

function domainFromUrl(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return 'untitled';
	}
}
