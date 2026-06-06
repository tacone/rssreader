<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	function handleEnhance() {
		invalidateAll();
		return () => {};
	}
</script>

<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-base-content/40">
	Select a feed to view items
</div>