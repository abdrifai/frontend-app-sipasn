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
	let viewMode = $state('list'); // 'list' | 'tree' (default list saat mencari)
	let container = $state(null);
	let inputElement = $state(null);
	let expandedNodeIds = $state(new Set());
	let lastSearchQuery = $state('');

	// Flatten options / tree to Map for O(1) parent & item lookups
	let flatMap = $derived.by(() => {
		const map = new Map();

		// Masukkan data dari flatOptions
		for (const opt of flatOptions) {
			const optId = opt.value || opt.id;
			if (optId) {
				map.set(optId, {
					...opt,
					id: optId,
					nmUnor: (opt.nmUnor || opt.label || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
					label: (opt.label || opt.nmUnor || '').trim(),
				});
			}
		}

		// Masukkan rekursif dari tree
		function addTreeNodes(nodes, parentId = null) {
			for (const n of nodes) {
				if (!map.has(n.id)) {
					map.set(n.id, {
						...n,
						id: n.id,
						parent_id: n.parent_id || parentId,
						nmUnor: (n.nmUnor || n.label || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
						label: (n.label || n.nmUnor || '').trim(),
					});
				}
				if (n.children && n.children.length > 0) {
					addTreeNodes(n.children, n.id);
				}
			}
		}
		addTreeNodes(tree);

		return map;
	});

	// Ambil jalur hierarki induk (Breadcrumbs) untuk sebuah ID unit
	function getBreadcrumbs(nodeId) {
		const crumbs = [];
		let curr = flatMap.get(nodeId);
		const visited = new Set();

		while (curr && curr.parent_id && flatMap.has(curr.parent_id) && !visited.has(curr.parent_id)) {
			visited.add(curr.parent_id);
			curr = flatMap.get(curr.parent_id);
			const cleanName = (curr.nmUnor || curr.label || '').replace(/\s*\(Non-Aktif\)$/i, '').trim();
			if (cleanName) {
				crumbs.unshift(cleanName);
			}
		}
		return crumbs;
	}

	// Node terpilih
	let selectedNode = $derived.by(() => {
		if (!value) return null;
		return flatMap.get(value) || null;
	});

	let displayLabel = $derived(
		selectedNode ? (selectedNode.label || selectedNode.nmUnor || '').trim() : placeholder
	);

	let selectedBreadcrumb = $derived(
		selectedNode ? getBreadcrumbs(selectedNode.id).join(' › ') : ''
	);

	// Hasil Pencarian dalam bentuk Flat List (Lengkap dengan Jalur Breadcrumb)
	let searchResults = $derived.by(() => {
		const q = (searchQuery || '').toLowerCase().trim();
		if (!q) return [];

		const qParts = q.split(/\s+/).filter(Boolean);
		const matches = [];

		for (const [nodeId, item] of flatMap.entries()) {
			// Sembunyikan non-aktif kecuali jika sedang dipilih
			if (item.isAktif === 0 && nodeId !== value) continue;

			const crumbs = getBreadcrumbs(nodeId);
			const name = (item.nmUnor || item.label || '').trim();
			const pathStr = crumbs.join(' ');
			const codeStr = item.kode ? String(item.kode) : '';
			const fullSearchStr = `${name} ${pathStr} ${codeStr}`.toLowerCase();

			// Semua potongan kata pencarian harus cocok
			const isMatch = qParts.every(part => fullSearchStr.includes(part));
			if (isMatch) {
				matches.push({
					...item,
					id: nodeId,
					label: (item.label || name) + (item.isAktif === 0 ? ' (Non-Aktif)' : ''),
					breadcrumbs: crumbs,
					pathString: crumbs.join(' › ')
				});
			}
		}

		// Urutkan: Nama yang persis diawali query diutamakan, lalu hierarki terpendek, lalu abjad
		return matches.sort((a, b) => {
			const aName = (a.nmUnor || a.label || '').toLowerCase();
			const bName = (b.nmUnor || b.label || '').toLowerCase();
			const aStarts = aName.startsWith(q) ? -1 : 0;
			const bStarts = bName.startsWith(q) ? -1 : 0;
			if (aStarts !== bStarts) return aStarts - bStarts;

			const pathDiff = a.breadcrumbs.length - b.breadcrumbs.length;
			if (pathDiff !== 0) return pathDiff;

			return aName.localeCompare(bName);
		});
	});

	// Filter tree based on active status and search query (untuk Tree View)
	function filterTree(nodes, query) {
		const q = (query || '').toLowerCase().trim();
		const qParts = q.split(/\s+/).filter(Boolean);

		const result = [];
		for (const node of nodes) {
			if (node.isAktif === 0 && node.id !== value) continue;

			const crumbs = getBreadcrumbs(node.id);
			const name = (node.nmUnor || node.label || '').trim();
			const fullSearchStr = `${name} ${crumbs.join(' ')} ${node.kode || ''}`.toLowerCase();
			const isSelfMatch = !q || qParts.every(p => fullSearchStr.includes(p));

			const matchingChildren = node.children && node.children.length > 0 
				? filterTree(node.children, query) 
				: [];

			if (isSelfMatch || matchingChildren.length > 0) {
				result.push({
					...node,
					children: isSelfMatch && matchingChildren.length === 0 && node.children && !q
						? node.children 
						: matchingChildren
				});
			}
		}
		return result;
	}

	let filteredTree = $derived(filterTree(tree, searchQuery));

	// Auto expand matching branches when search query changes
	$effect(() => {
		const currentQ = (searchQuery || '').trim();
		if (currentQ !== lastSearchQuery) {
			lastSearchQuery = currentQ;
			if (currentQ) {
				const autoExpand = new Set();
				function collectParents(nodes) {
					for (const n of nodes) {
						if (n.children && n.children.length > 0) {
							autoExpand.add(n.id);
							collectParents(n.children);
						}
					}
				}
				collectParents(filteredTree);
				expandedNodeIds = autoExpand;
			}
		}
	});

	function toggle() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			viewMode = 'list';
			setTimeout(() => inputElement?.focus(), 15);
		}
	}

	function toggleExpand(nodeId, e) {
		e?.stopPropagation?.();
		e?.preventDefault?.();
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
		collect(filteredTree);
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

	function clearSearch() {
		searchQuery = '';
		inputElement?.focus();
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
	{@const isExpanded = expandedNodeIds.has(node.id)}
	{@const isSelected = value === node.id}
	{@const hasChildren = node.children && node.children.length > 0}

	<div class="flex flex-col">
		<!-- Node Row -->
		<div 
			class="group flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer
				{isSelected ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200'}"
			style="padding-left: {Math.max(8, depth * 14 + 8)}px"
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
				<div class="truncate flex flex-col min-w-0 text-left">
					<span class="truncate {selectedNode ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500'}">
						{displayLabel}
					</span>
					{#if selectedBreadcrumb}
						<span class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
							{selectedBreadcrumb}
						</span>
					{/if}
				</div>
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
				class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-96"
				transition:slide={{ duration: 120 }}
			>
				<!-- Search Bar & Controls Header -->
				<div class="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 space-y-2">
					<div class="relative flex items-center">
						<svg class="absolute left-2.5 w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							bind:this={inputElement}
							type="text"
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-8 pr-8 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
							placeholder="Cari nama unit, seksi, puskesmas, dinas, atau kata kunci..."
							bind:value={searchQuery}
						/>
						{#if searchQuery}
							<button 
								type="button" 
								onclick={clearSearch}
								class="absolute right-2.5 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full cursor-pointer"
								title="Bersihkan pencarian"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
							</button>
						{/if}
					</div>

					<!-- Header bar: Mode Switcher & Counter -->
					<div class="flex items-center justify-between text-[11px] px-1 text-zinc-400">
						{#if searchQuery}
							<span class="font-medium text-blue-600 dark:text-blue-400">
								Ditemukan {searchResults.length} unit kerja
							</span>
							<div class="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg">
								<button
									type="button"
									onclick={() => viewMode = 'list'}
									class="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer
										{viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
								>
									Daftar
								</button>
								<button
									type="button"
									onclick={() => viewMode = 'tree'}
									class="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer
										{viewMode === 'tree' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
								>
									Pohon
								</button>
							</div>
						{:else}
							<span class="font-medium text-zinc-500 dark:text-zinc-400">Struktur Organisasi (Tojo Una-Una)</span>
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
						{/if}
					</div>
				</div>

				<!-- Content List Container -->
				<div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-72">
					{#if searchQuery && viewMode === 'list'}
						<!-- Tampilan Hasil Pencarian (List View Lengkap dengan Breadcrumbs) -->
						{#if searchResults.length === 0}
							<div class="px-4 py-8 text-center text-xs text-zinc-400">
								Tidak ada unit kerja yang cocok dengan "{searchQuery}"
							</div>
						{:else}
							{#each searchResults.slice(0, 100) as item (item.id)}
								{@const isSelected = value === item.id}
								<button
									type="button"
									class="w-full text-left p-2 rounded-xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer group
										{isSelected ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50' : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200'}"
									onclick={() => select(item)}
								>
									<div class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5
										{isSelected ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-blue-500'}">
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
									</div>

									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between gap-1">
											<span class="font-semibold text-xs truncate {isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-900 dark:text-zinc-100'}">
												{item.nmUnor || item.label}
											</span>
											{#if isSelected}
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-blue-600 dark:text-blue-400"><polyline points="20 6 9 17 4 12"/></svg>
											{/if}
										</div>

										{#if item.pathString}
											<div class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 flex items-center gap-1">
												<span class="truncate">{item.pathString}</span>
											</div>
										{/if}
									</div>
								</button>
							{/each}

							{#if searchResults.length > 100}
								<div class="px-3 py-2 text-center text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
									Menampilkan 100 dari total {searchResults.length} unit yang cocok. Ketik lebih spesifik untuk mempersempit.
								</div>
							{/if}
						{/if}
					{:else}
						<!-- Tampilan Pohon (Tree View) -->
						{#if filteredTree.length === 0}
							<div class="px-4 py-8 text-center text-xs text-zinc-400">
								Tidak ada unit kerja yang cocok dengan "{searchQuery}"
							</div>
						{:else}
							{#each filteredTree as rootNode (rootNode.id)}
								{@render treeNode(rootNode, 0)}
							{/each}
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
