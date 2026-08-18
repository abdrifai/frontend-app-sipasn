<script>
	let {
		title = '',
		subtitle = '',
		children,
		headerAction = null,
		class: className = ''
	} = $props();
</script>

<div class="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-7 {className}">
	{#if title || headerAction}
		<div class="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
			<div>
				{#if title}
					<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
						<span class="w-1.5 h-4.5 bg-indigo-600 dark:bg-indigo-500 rounded-full"></span>
						{title}
					</h2>
				{/if}
				{#if subtitle}
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 pl-4">
						{subtitle}
					</p>
				{/if}
			</div>
			{#if headerAction}
				<div>
					{@render headerAction()}
				</div>
			{/if}
		</div>
	{/if}
	{@render children()}
</div>
