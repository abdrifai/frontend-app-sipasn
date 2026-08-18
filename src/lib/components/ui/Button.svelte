<script>
	let {
		type = 'button',
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		children,
		onclick,
		class: className = ''
	} = $props();

	const variants = {
		primary: 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md shadow-indigo-600/20 active:shadow-sm',
		secondary: 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-xs',
		danger: 'bg-rose-600 dark:bg-rose-600 text-white hover:bg-rose-700 dark:hover:bg-rose-500 shadow-md shadow-rose-600/20 active:shadow-sm',
		ghost: 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70',
		success: 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:shadow-sm',
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs rounded-xl font-semibold',
		md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl font-bold',
		lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl font-black',
	};
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 {sizes[size]} {variants[variant]} {className}"
>
	{#if loading}
		<span class="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full shrink-0"></span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
