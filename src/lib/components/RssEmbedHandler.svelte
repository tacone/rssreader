<script lang="ts">
	import { onMount } from 'svelte';

	function handleEmbedClick(e: MouseEvent) {
		const target = (e.target as Element).closest('[data-provider]');
		if (!target || !(target instanceof HTMLAnchorElement)) return;
		e.preventDefault();

		const provider = target.getAttribute('data-provider');

		if (provider === 'youtube') {
			const videoId = target.getAttribute('data-videoid');
			if (!videoId) return;
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			iframe.width = '560';
			iframe.height = '315';
			iframe.classList.add('w-full', 'aspect-video');
			target.replaceWith(iframe);
		}
	}

	onMount(() => {
		document.addEventListener('click', handleEmbedClick);
		return () => document.removeEventListener('click', handleEmbedClick);
	});
</script>
