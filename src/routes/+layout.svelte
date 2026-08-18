<script>
	import '../app.css';
	import { themeStore } from '$lib/stores/themeStore';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	
	let { children } = $props();

	onMount(() => {
		themeStore.init();
	});
</script>

<Toast />

{@render children()}
