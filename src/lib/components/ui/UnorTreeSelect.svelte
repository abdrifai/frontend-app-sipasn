<script>
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		tree = [],
		flatOptions = [],
		value = $bindable(''),
		label = '',
		placeholder = 'Pilih atau cari Unit Organisasi...',
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
	let expandedNodeIds = $state(new Set());

	// Flatten tree to find label of selected value if not in flatOptions
	function findNodeById(nodes, targetId) {
		for (const node of nodes) {
			if (node.id === targetId) return node;
			if (node.children && node.children.length > 0) {
				const found = findNodeById(node.children, targetId);
				if (found) return found;
			}
		}
		return null;
	}

	let selectedNode = $derived.by(() => {
		if (!value) return null;
		if (flatOptions && flatOptions.length > 0) {
			const found = flatOptions.find(o => (o.value === value || o.id === value));
			if (found) return { id: value, label: (found.label || found.nmUnor || '').trim() };
		}
		return findNodeById(tree, value);
	});

	let displayLabel = $derived(
		selectedNode ? (selectedNode.label || selectedNode.nmUnor || '').trim() : placeholder
	);

	// Filter tree based on active status and search query
	function filterTree(nodes, query) {
		const q = (query || '').toLowerCase().trim();

		const result = [];
		for (const node of nodes) {
			// Sembunyikan unit non-aktif dari daftar default maupun pencarian, KECUALI jika unit tersebut sedang terpilih pada data yang diedit
			if (node.isAktif === 0 && node.id !== value) continue;

			const labelMatch = !q || (node.label || node.nmUnor || '').toLowerCase().includes(q);
			const matchingChildren = node.children && node.children.length > 0 
				? filterTree(node.children, query) 
				: [];

			if (labelMatch || matchingChildren.length > 0) {
				result.push({
					...node,
					children: matchingChildren,
					// Force expand if matched via search
					forceExpand: Boolean(q)
				});
			}
		}
		return result;
	}

	let filteredTree = $derived(filterTree(tree, searchQuery));

	function toggle() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			setTimeout(() => inputElement?.focus(), 15);
		}
	}

	function toggleExpand(nodeId, e) {
		e?.stopPropagation();
		const next = new Set(expandedNodeIds);
		if (next.has(nodeId)) {
			next.delete(nodeId);
		} else {
			next.add(nodeId);
		}
		expandedNodeIds = next;
	}

	function expandAll() {
		const allIds = new Set();
		function collect(nodes) {
			for (const n of nodes) {
				if (n.children && n.children.length > 0) {
					allIds.add(n.id);
					collect(n.children);
				}
			}
		}
		collect(tree);
		expandedNodeIds = allIds;
	}

	function collapseAll() {
		expandedNodeIds = new Set();
	}

	function select(node) {
		value = node.id;
		isOpen = false;
		searchQuery = '';
		if (onchange) onchange(value, node);
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

{#snippet treeNode(node, depth)}
	{@const isExpanded = searchQuery ? true : (expandedNodeIds.has(node.id) || node.forceExpand)}
	{@const isSelected = value === node.id}
	{@const hasChildren = node.children && node.children.length > 0}

	<div class="flex flex-col">
		<!-- Node Row -->
		<div 
			class="group flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer
				{isSelected ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200'}"
			style="padding-left: {Math.max(8, depth * 16 + 8)}px"
		>
			<!-- Expand/Collapse Button (If has children) -->
			{#if hasChildren}
				<button
					type="button"
					onclick={(e) => toggleExpand(node.id, e)}
					class="w-5 h-5 flex items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-transform cursor-pointer shrink-0"
					aria-label={isExpanded ? 'Tutup cabang' : 'Buka cabang'}
				>
					<svg 
						class="w-3.5 h-3.5 transition-transform duration-150 {isExpanded ? 'rotate-90 text-blue-500' : ''}" 
						viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
					>
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</button>
			{:else}
				<div class="w-5 h-5 flex items-center justify-center shrink-0">
					<div class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
				</div>
			{/if}

			<!-- Node Label / Select Trigger -->
			<button
				type="button"
				class="flex-1 text-left truncate py-0.5 bg-transparent border-none cursor-pointer outline-none flex items-center gap-1.5"
				onclick={() => select(node)}
			>
				<span class="truncate">{node.label || node.nmUnor}</span>
				{#if isSelected}
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 ml-auto text-blue-600 dark:text-blue-400"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</button>
		</div>

		<!-- Recursive Children -->
		{#if hasChildren && isExpanded}
			<div class="flex flex-col border-l border-zinc-100 dark:border-zinc-800 ml-4.5" transition:slide={{ duration: 120 }}>
				{#each node.children as child (child.id)}
					{@render treeNode(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-1.5 {className}" bind:this={container}>
	{#if label}
		<label for={id || undefined} class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
			{label} {#if required}<span class="text-rose-500">*</span>{/if}
		</label>
	{/if}

	<div class="relative">
		<!-- Trigger Button -->
		<button
			type="button"
			id={id || undefined}
			disabled={disabled}
			class="w-full flex items-center justify-between bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-left outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			onclick={toggle}
		>
			<div class="flex items-center gap-2 truncate pr-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-blue-500"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
				<span class="truncate {selectedNode ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500'}">
					{displayLabel}
				</span>
			</div>

			<div class="flex items-center gap-1 shrink-0 text-zinc-400">
				{#if selectedNode && !disabled}
					<span
						role="button"
						tabindex="0"
						class="p-0.5 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
						onclick={clearSelection}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') clearSelection(e); }}
						title="Hapus pilihan"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</span>
				{/if}
				<svg 
					class="w-4 h-4 transition-transform duration-200 {isOpen ? 'rotate-180 text-blue-500' : ''}" 
					viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</div>
		</button>

		<!-- Dropdown Menu -->
		{#if isOpen}
			<div 
				class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-80"
				transition:slide={{ duration: 120 }}
			>
				<!-- Search Bar & Controls Header -->
				<div class="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 space-y-2">
					<div class="relative">
						<svg class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							bind:this={inputElement}
							type="text"
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
							placeholder="Cari Unit Organisasi..."
							bind:value={searchQuery}
						/>
					</div>

					<div class="flex items-center justify-between text-[11px] px-1 text-zinc-400">
						<span class="font-medium text-zinc-500 dark:text-zinc-400">Pohon Unit Kerja (Tojo Una-Una)</span>
						<div class="flex items-center gap-2">
							<button 
								type="button" 
								onclick={expandAll} 
								class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0"
							>
								Buka Semua
							</button>
							<span>•</span>
							<button 
								type="button" 
								onclick={collapseAll} 
								class="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:underline cursor-pointer bg-transparent border-none p-0"
							>
								Tutup Semua
							</button>
						</div>
					</div>
				</div>

				<!-- Tree List Container -->
				<div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-60">
					{#if filteredTree.length === 0}
						<div class="px-4 py-8 text-center text-xs text-zinc-400">
							Tidak ada unit kerja yang cocok dengan "{searchQuery}"
						</div>
					{:else}
						{#each filteredTree as rootNode (rootNode.id)}
							{@render treeNode(rootNode, 0)}
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
