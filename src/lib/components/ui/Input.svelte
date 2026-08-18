<script>
	let {
		label = '',
		name = '',
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		error = '',
		required = false,
		disabled = false,
		onblur = null,
		oninput = null,
		onchange = null,
		class: className = '',
		...restProps
	} = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<label for={name} class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
			{label}{#if required}<span class="text-rose-500 ml-1 font-bold">*</span>{/if}
		</label>
	{/if}
	<input
		id={name}
		{name}
		{type}
		{placeholder}
		{required}
		{disabled}
		{onblur}
		{oninput}
		{onchange}
		bind:value
		{...restProps}
		class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed
           {error ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20' : ''}"
	/>
	{#if error}
		<p class="text-xs text-rose-500 font-semibold">{error}</p>
	{/if}
</div>
