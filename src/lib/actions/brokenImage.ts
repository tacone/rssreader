function replace(img: HTMLImageElement) {
	const isStandalone = img.classList.contains('standalone-image');
	const alt = img.getAttribute('alt') || '';
	const width = img.getAttribute('width');
	const height = img.getAttribute('height');

	const div = document.createElement('div');
	div.className = 'broken-image' + (isStandalone ? ' broken-standalone-image' : '');

	if (width) div.style.width = width + 'px';
	if (height) div.style.height = height + 'px';

	const label = document.createElement('span');
	label.className = 'broken-image-label';
	label.textContent = 'broken image';

	const text = document.createElement('span');
	text.className = 'broken-image-text';
	text.textContent = alt;

	div.appendChild(label);
	div.appendChild(text);
	img.replaceWith(div);
}

export function brokenImage(node: HTMLElement) {
	function scan() {
		node.querySelectorAll('img:not(.inline-image)').forEach((img) => {
			if ((img as HTMLImageElement).dataset.brokenHandled) return;
			(img as HTMLImageElement).dataset.brokenHandled = 'true';
			img.addEventListener('error', () => replace(img as HTMLImageElement));
			if ((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth === 0) {
				replace(img as HTMLImageElement);
			}
		});
	}

	scan();
	const observer = new MutationObserver(scan);
	observer.observe(node, { childList: true, subtree: true });

	return { destroy: () => observer.disconnect() };
}
