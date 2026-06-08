function expand(img: HTMLImageElement) {
	const w = img.getAttribute('width');
	if (!w) return;
	if (img.naturalWidth > parseInt(w, 10)) {
		img.removeAttribute('width');
		img.removeAttribute('height');
	}
}

export function expandStandaloneImages(node: HTMLElement) {
	function scan() {
		node.querySelectorAll('img.standalone-image').forEach((img) => {
			const el = img as HTMLImageElement;
			if (el.dataset.expandHandled) return;
			el.dataset.expandHandled = 'true';
			el.addEventListener('load', () => expand(el));
			if (el.complete) expand(el);
		});
	}

	scan();
	const observer = new MutationObserver(scan);
	observer.observe(node, { childList: true, subtree: true });

	return { destroy: () => observer.disconnect() };
}
