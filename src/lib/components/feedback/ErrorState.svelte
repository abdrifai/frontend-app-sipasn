<script>
	import Button from '../ui/Button.svelte';
	let { message = 'Terjadi kesalahan.', onRetry = null } = $props();
</script>

<div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 flex flex-col items-center text-center gap-4">
	<div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
	</div>
	<div class="space-y-1">
		<h3 class="text-rose-800 dark:text-rose-300 font-semibold">Gagal Memuat Data</h3>
		<p class="text-sm text-rose-600 dark:text-rose-400 max-w-xs">{message}</p>
	</div>
	{#if onRetry}
		<Button variant="secondary" onclick={onRetry} class="text-xs">
			Coba Lagi
		</Button>
	{/if}
</div>
