<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await authClient.signUp.email({ name, email, password });

		loading = false;
		if (err) {
			error = err.message ?? 'Could not create account.';
			return;
		}
		goto('/');
	}
</script>

<svelte:head><title>Create an account</title></svelte:head>

<div class="hero min-h-screen">
	<div class="card card-border w-full max-w-sm bg-base-200">
		<form onsubmit={handleSubmit} class="card-body">
			<h1 class="card-title">Create an account</h1>

			<label class="form-control">
				<input bind:value={name} placeholder="Name" required class="input input-bordered" />
			</label>
			<label class="form-control">
				<input bind:value={email} type="email" placeholder="Email" required class="input input-bordered" />
			</label>
			<label class="form-control">
				<input bind:value={password} type="password" placeholder="Password" required class="input input-bordered" />
			</label>

			{#if error}<p class="text-sm text-error">{error}</p>{/if}

			<button type="submit" disabled={loading} class="btn btn-primary mt-2">
				{loading ? 'Creating…' : 'Create account'}
			</button>

			<p class="mt-2 text-sm">Already have an account? <a href="/login" class="link link-hover">Log in</a></p>
		</form>
	</div>
</div>
