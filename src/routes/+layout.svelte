<script lang="ts">
	import { SITE_NAME } from '$lib/config';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{SITE_NAME}</title>
</svelte:head>

{@render children()}
