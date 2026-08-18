<script>
	let {
		size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
		iconOnly = false,
		showSubtitle = true,
		subtitle = 'Kab. Tojo Una-Una',
		variant = 'default', // 'default' | 'glow' | 'hero' | 'glass'
		class: customClass = ''
	} = $props();

	const iconSizes = {
		xs: 'w-7 h-7 p-1 rounded-lg',
		sm: 'w-9 h-9 p-1.5 rounded-xl',
		md: 'w-11 h-11 p-1.5 rounded-2xl',
		lg: 'w-14 h-14 p-2 rounded-2xl',
		xl: 'w-20 h-20 p-2.5 rounded-3xl',
		'2xl': 'w-28 h-28 p-3.5 rounded-[2rem]'
	};

	const titleSizes = {
		xs: 'text-sm font-black',
		sm: 'text-base font-black',
		md: 'text-lg font-black',
		lg: 'text-xl font-black',
		xl: 'text-3xl font-black',
		'2xl': 'text-4xl sm:text-5xl font-black'
	};

	const subSizes = {
		xs: 'text-[9px]',
		sm: 'text-[10px]',
		md: 'text-[11px]',
		lg: 'text-xs',
		xl: 'text-sm',
		'2xl': 'text-base'
	};
</script>

<div class="inline-flex items-center gap-3 select-none group {customClass}">
	<!-- Emblem Icon Container with Premium Styling -->
	<div class="relative shrink-0 flex items-center justify-center">
		<!-- Subtle ambient glow in background -->
		{#if variant === 'glow' || variant === 'hero'}
			<div class="absolute inset-0 bg-gradient-to-tr from-amber-500/30 via-indigo-500/30 to-blue-500/30 rounded-full blur-xl scale-125 opacity-70 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500"></div>
		{/if}

		<div class="relative {iconSizes[size]} bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 shadow-md shadow-zinc-950/5 dark:shadow-indigo-950/30 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:border-indigo-300 dark:group-hover:border-indigo-500/50">
			<!-- Inner gentle shine -->
			<div class="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/60 via-transparent to-black/5 pointer-events-none"></div>

			<!-- Official Tojo Una-Una Emblem -->
			<img 
				src="/logo-touna.png" 
				alt="Logo Kabupaten Tojo Una-Una" 
				class="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-300 group-hover:scale-105" 
				loading="eager"
			/>
		</div>
	</div>

	<!-- Brand Typography (if not iconOnly) -->
	{#if !iconOnly}
		<div class="min-w-0 flex flex-col justify-center">
			<div class="flex items-center gap-1.5">
				<span class="{titleSizes[size]} tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
					SIP<span class="text-indigo-600 dark:text-indigo-400">ASN</span>
				</span>
				{#if variant === 'hero'}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 tracking-wider">
						SIVIA PATUJU
					</span>
				{/if}
			</div>

			{#if showSubtitle}
				<span class="{subSizes[size]} font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate block leading-tight mt-0.5">
					{subtitle}
				</span>
			{/if}
		</div>
	{/if}
</div>
