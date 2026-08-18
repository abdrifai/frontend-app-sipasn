<script>
	let { src = '', name = '', size = 'md' } = $props();

	const sizes = {
		xs: 'w-6 h-6 text-[10px]',
		sm: 'w-8 h-8 text-xs',
		md: 'w-10 h-10 text-sm',
		lg: 'w-12 h-12 text-base',
		xl: 'w-16 h-16 text-xl',
		'2xl': 'w-20 h-20 text-2xl'
	};

	const fallbackUrl = $derived(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4f4f5&color=71717a&bold=true&length=1`);

	let imageError = $state(false);
</script>

<div class="{sizes[size]} shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center font-bold text-zinc-400 border border-zinc-100 dark:border-zinc-800 shadow-sm group-hover:scale-105 transition-all duration-500">
	{#if src && !imageError}
		<img 
			{src} 
			alt={name} 
			class="w-full h-full object-cover" 
			onerror={() => imageError = true}
		/>
	{:else}
		<img 
			src={fallbackUrl} 
			alt={name} 
			class="w-full h-full object-cover opacity-80" 
		/>
	{/if}
</div>
