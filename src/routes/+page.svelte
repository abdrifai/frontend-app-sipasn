<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { authStore } from '$lib/stores/authStore';

	onMount(async () => {
		try {
			const res = await api('/auth/me');
			if (res && res.data) {
				authStore.setUser(res.data);
				goto('/dashboard');
				return;
			}
		} catch (err) {
			// Not authenticated
		}
		goto('/login');
	});
</script>
