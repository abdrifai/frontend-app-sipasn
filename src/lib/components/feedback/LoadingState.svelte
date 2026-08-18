<script>
	let { message = 'Memuat...' } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 gap-3">
	<div class="h-8 w-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
	<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">{message}</p>
</div>
