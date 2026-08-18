<script>
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	let { 
		options = [], 
		value = $bindable(''), 
		label = '', 
		placeholder = 'Pilih atau cari...', 
		disabled = false, 
		required = false, 
		id = '', 
		onchange = null, 
		class: className = '' 
	} = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let container = $state(null);
	let inputElement = $state(null);

	let filteredOptions = $derived(
		options.filter(opt => {
			const text = (opt.label || opt.instansi || opt.name || opt.nmUnor || '').toLowerCase();
			const code = opt.kode ? String(opt.kode).toLowerCase() : '';
			const q = searchQuery.toLowerCase().trim();
			return !q || text.includes(q) || code.includes(q);
		}).slice(0, 100) 
	);

	let selectedOption = $derived(
		options.find(opt => (opt.value === value) || (opt.id === value) || (opt.kode === value))
	);

	let displayLabel = $derived(
		selectedOption ? (selectedOption.label || selectedOption.instansi || selectedOption.name || selectedOption.nmUnor) : placeholder
	);

	function toggle() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			setTimeout(() => inputElement?.focus(), 10);
		}
	}

	function select(opt) {
		value = opt.value !== undefined ? opt.value : (opt.id || opt.kode || '');
		isOpen = false;
		searchQuery = '';
		if (onchange) onchange(value, opt);
	}

	function clearSelection(e) {
		e?.stopPropagation?.();
		value = '';
		searchQuery = '';
		if (onchange) onchange('', null);
	}

	function handleClickOutside(event) {
		if (container && !container.contains(event.target)) {
			isOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleClickOutside);
		return () => window.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="flex flex-col gap-1.5 {className}" bind:this={container}>
	{#if label}
		<label for={id || undefined} class="text-xs font-bold text-zinc-700 dark:text-zinc-300">
			{label} {#if required}<span class="text-rose-500 font-bold">*</span>{/if}
		</label>
	{/if}
  
	<div class="relative">
		<!-- Trigger Button -->
		<button
			type="button"
			id={id || undefined}
			disabled={disabled}
			class="w-full flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-left outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
			onclick={toggle}
		>
			<span class="truncate pr-2 {selectedOption ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}">
				{displayLabel}
			</span>
			<div class="flex items-center gap-1.5 shrink-0 text-zinc-400">
				{#if selectedOption && !disabled}
					<span
						role="button"
						tabindex="0"
						class="p-0.5 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
						onclick={clearSelection}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') clearSelection(e); }}
						title="Hapus pilihan"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</span>
				{/if}
				<svg 
					class="w-4 h-4 transition-transform duration-200 {isOpen ? 'rotate-180 text-indigo-500' : ''}" 
					viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</div>
		</button>

		<!-- Dropdown Menu -->
		{#if isOpen}
			<div 
				class="absolute z-50 w-full mt-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden"
				transition:slide={{ duration: 120 }}
			>
				<!-- Search Bar -->
				<div class="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70">
					<div class="relative">
						<svg class="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							bind:this={inputElement}
							type="text"
							class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder:text-zinc-400"
							placeholder="Ketik untuk mencari..."
							bind:value={searchQuery}
						/>
					</div>
				</div>

				<!-- Options List -->
				<div class="max-h-60 overflow-y-auto p-1.5 divide-y divide-zinc-50 dark:divide-zinc-800/40">
					{#if filteredOptions.length === 0}
						<div class="px-3 py-4 text-center text-xs text-zinc-400">
							Tidak ada hasil yang cocok dengan "{searchQuery}"
						</div>
					{:else}
						{#each filteredOptions as opt}
							{@const isSelected = (opt.value === value || opt.id === value || opt.kode === value)}
							<button
								type="button"
								class="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer
									{isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'}"
								onclick={() => select(opt)}
							>
								<div class="flex flex-col truncate pr-2">
									<span class="truncate">{opt.label || opt.instansi || opt.name || opt.nmUnor}</span>
									{#if opt.kode || opt.tipe}
										<span class="text-[10px] opacity-60 font-mono mt-0.5">
											{opt.tipe ? `[${opt.tipe}] ` : ''}{opt.kode ? `Kode: ${opt.kode}` : ''}
										</span>
									{/if}
								</div>

								{#if isSelected}
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-indigo-600 dark:text-indigo-400"><polyline points="20 6 9 17 4 12"/></svg>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
