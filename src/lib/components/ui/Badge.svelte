<script>
	let { children, variant = 'neutral' } = $props();

	const variants = {
		neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
		success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
		warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
		danger: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
		indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
	};
</script>

<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider {variants[variant]}">
	{@render children()}
</span>
