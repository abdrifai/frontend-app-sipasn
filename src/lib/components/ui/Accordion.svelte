<script>
	let { title, children, open = $bindable(false), class: className = "" } = $props();
	let isOpen = $state(open);

	$effect(() => {
		isOpen = open;
	});

	$effect(() => {
		open = isOpen;
	});
</script>

<div class="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 {className}">
	<button 
		class="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
		onclick={() => isOpen = !isOpen}
	>
		<div class="flex-1">
			{#if title}
				{@render title()}
			{/if}
		</div>
		<div class="ml-4 text-zinc-400 transition-transform duration-300 {isOpen ? 'rotate-180' : ''}">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
		</div>
	</button>
	
	{#if isOpen}
		<div class="px-6 pb-6 border-t border-zinc-100 dark:border-zinc-800 pt-6 bg-zinc-50/30 dark:bg-zinc-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
			{@render children()}
		</div>
	{/if}
</div>
