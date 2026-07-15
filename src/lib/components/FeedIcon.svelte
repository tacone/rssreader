<script lang="ts">
	let { src, size = 'size-4' }: { src: string | null; size?: string } = $props();
	let failed = $state(false);
</script>

{#if src && !failed}
	<img {src} alt="" class="{size} rounded" onerror={() => failed = true} />
{:else}
	<span class="inline-block {size} rounded bg-white/30"></span>
{/if}
