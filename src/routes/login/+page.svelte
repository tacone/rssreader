<script lang="ts">
	import { enhance } from '$app/forms';

	let { form }: { form: { message?: string } | undefined } = $props();
</script>

<svelte:head><title>Log in</title></svelte:head>

<div class="hero min-h-screen">
	<div class="card card-border w-full max-w-sm bg-base-200">
		<form method="POST" use:enhance class="card-body">
			<h1 class="card-title">Log in</h1>

			<label class="form-control">
				<input name="email" type="email" placeholder="Email" required class="input input-bordered" />
			</label>
			<label class="form-control">
				<input name="password" type="password" placeholder="Password" required class="input input-bordered" />
			</label>

			{#if form?.message}
				<p class="text-sm text-error">{form.message}</p>
			{/if}

			<button type="submit" class="btn btn-primary mt-2">Log in</button>

			<p class="mt-2 text-sm">New here? <a href="/signup" class="link link-hover">Create an account</a></p>
		</form>
	</div>
</div>
