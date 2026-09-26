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
	let filterLevel = $state('all'); // 'all' | 'induk'
	let container = $state(null);
	let inputElement = $state(null);
	let expandedNodeIds = $state(new Set());
	let lastSearchQuery = $state('');

	function isItemActive(item) {
		if (!item) return false;
		if (item.isAktif === undefined) return true;
		return item.isAktif === 1 || item.isAktif === true || item.isAktif === '1';
	}

	function cleanText(str) {
		if (!str) return '';
		return String(str)
			.replace(/[\r\n\t]+/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/\s*\(Non-Aktif\)$/i, '')
			.trim();
	}

	// Flatten options / tree to Map for O(1) parent & item lookups
	let flatMap = $derived.by(() => {
		const map = new Map();

		// Masukkan data dari flatOptions (hanya yang aktif)
		for (const opt of flatOptions) {
			const optId = opt.value || opt.id;
			if (optId && isItemActive(opt)) {
				const cName = cleanText(opt.nmUnor || opt.label);
				map.set(optId, {
					...opt,
					id: optId,
					isAktif: 1,
					nmUnor: cName,
					label: cName,
				});
			}
		}

		// Masukkan rekursif dari tree (hanya yang aktif)
		function addTreeNodes(nodes, parentId = null) {
			for (const n of nodes) {
				if (!isItemActive(n)) continue;

				if (!map.has(n.id)) {
					const cName = cleanText(n.nmUnor || n.label);
					map.set(n.id, {
						...n,
						id: n.id,
						isAktif: 1,
						parent_id: n.parent_id || parentId,
						nmUnor: cName,
						label: cName,
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
			const cleanName = cleanText(curr.nmUnor || curr.label);
			if (cleanName) {
				crumbs.unshift(cleanName);
			}
		}
		return crumbs;
	}

	// Helper badge tingkatan unit organisasi
	function getLevelBadge(item) {
		if (!item) return { label: 'Unit', class: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700' };
		const lvl = (item.level || '').toLowerCase();
		const depth = item.breadcrumbs ? item.breadcrumbs.length : getBreadcrumbs(item.id).length;
		if (lvl === 'induk' || depth === 0) {
			return { 
				label: 'OPD Induk', 
				class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60' 
			};
		}
		if (lvl === 'unor' || depth === 1) {
			return { 
				label: 'Unit / UPTD', 
				class: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60' 
			};
		}
		if (lvl === 'sub' || depth === 2) {
			return { 
				label: 'Sub-Unit / Bidang', 
				class: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60' 
			};
		}
		return { 
			label: 'Seksi / Sub', 
			class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60' 
		};
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

	// Filter tree hierarki: tetap berupa hierarki tree dan anak-anaknya tetap bisa dibuka!
	function filterTreeHierarchy(nodes, query, levelFilter = 'all') {
		const q = (query || '').toLowerCase().trim();
		const qParts = q.split(/\s+/).filter(Boolean);

		function processNode(node) {
			if (!isItemActive(node)) return null;

			const crumbs = getBreadcrumbs(node.id);
			const isInduk = node.level === 'induk' || crumbs.length === 0;

			// Jika filter hanya OPD Induk pada root
			if (levelFilter === 'induk' && crumbs.length === 0 && !isInduk) {
				return null;
			}

			const name = cleanText(node.nmUnor || node.label);
			const fullSearchStr = `${name} ${crumbs.join(' ')} ${node.kode || ''}`.toLowerCase();
			const isSelfMatch = !q || qParts.every(p => fullSearchStr.includes(p));

			// Proses rekursif anak-anaknya
			const processedChildren = [];
			if (node.children && node.children.length > 0) {
				for (const child of node.children) {
					const childResult = processNode(child);
					if (childResult) {
						processedChildren.push(childResult);
					}
				}
			}

			// 1. Jika node ini cocok langsung:
			//    Sertakan node ini dan sediakan seluruh anak aslinya (atau matching children jika ada)
			//    sehingga pengguna TETAP BISA MENGKLIK CHEVRON UNTUK MEMBUKA ANAK DI BAWAHNYA!
			if (isSelfMatch) {
				const childrenToKeep = (processedChildren.length > 0) 
					? processedChildren 
					: (node.children ? node.children.filter(isItemActive) : []);

				return {
					...node,
					isMatch: Boolean(q),
					children: childrenToKeep
				};
			}

			// 2. Jika node ini tidak cocok langsung tapi ada anak/cucu yang cocok:
			if (processedChildren.length > 0) {
				return {
					...node,
					isMatch: false,
					children: processedChildren
				};
			}

			return null;
		}

		const result = [];
		for (const node of nodes) {
			const res = processNode(node);
			if (res) result.push(res);
		}
		return result;
	}

	let filteredTree = $derived(filterTreeHierarchy(tree, searchQuery, filterLevel));

	// Secara default saat pencarian maupun pembukaan, tutup semua (jangan buka semua)
	$effect(() => {
		const currentQ = (searchQuery || '').trim();
		if (currentQ !== lastSearchQuery) {
			lastSearchQuery = currentQ;
			// Default saat pencarian: tutup semua
			expandedNodeIds = new Set();
		}
	});

	function toggle() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			expandedNodeIds = new Set(); // Tutup semua saat dibuka
			setTimeout(() => inputElement?.focus(), 20);
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
		// Setelah unit kerja dipilih, pencarian langsung otomatis tertutup
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
	{@const badge = getLevelBadge(node)}

	<div class="flex flex-col">
		<!-- Node Row -->
		<div 
			class="group flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer
				{isSelected ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200'}"
			style="padding-left: {Math.max(8, depth * 14 + 8)}px"
		>
			<!-- Expand/Collapse Button (Bisa diklik untuk membuka anak di bawahnya) -->
			{#if hasChildren}
				<button
					type="button"
					onclick={(e) => toggleExpand(node.id, e)}
					class="w-5 h-5 flex items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-transform cursor-pointer shrink-0"
					aria-label={isExpanded ? 'Tutup cabang' : 'Buka cabang'}
					title={isExpanded ? 'Tutup cabang' : 'Buka anak di bawahnya'}
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

			<!-- Node Label / Select Trigger (Klik untuk memilih unit & otomatis tutup dropdown) -->
			<button
				type="button"
				class="flex-1 text-left truncate py-0.5 bg-transparent border-none cursor-pointer outline-none flex items-center gap-1.5 min-w-0"
				onclick={() => select(node)}
			>
				<span class="truncate {node.isMatch ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
					{cleanText(node.label || node.nmUnor)}
				</span>
				<span class="px-1.5 py-0.2 text-[9px] font-medium rounded border shrink-0 {badge.class}">
					{badge.label}
				</span>
				{#if node.kode}
					<span class="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 shrink-0">
						({node.kode})
					</span>
				{/if}
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
		<!-- Trigger Button Select Option -->
		<button
			type="button"
			id={id || undefined}
			disabled={disabled}
			class="w-full flex items-center justify-between bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-left outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			onclick={toggle}
		>
			<div class="flex items-center gap-2 truncate pr-2 min-w-0">
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-blue-500"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
				<div class="truncate flex flex-col min-w-0 text-left">
					<div class="flex items-center gap-1.5 truncate">
						<span class="truncate {selectedNode ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500'}">
							{displayLabel}
						</span>
						{#if selectedNode}
							{@const badge = getLevelBadge(selectedNode)}
							<span class="px-1.5 py-0.2 text-[9px] font-medium rounded border shrink-0 {badge.class}">
								{badge.label}
							</span>
						{/if}
					</div>
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
						class="p-0.5 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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

		<!-- Dropdown Menu (Tree Hierarkis Selalu, dengan Kemampuan Buka Anak) -->
		{#if isOpen}
			<div 
				class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-96"
				transition:slide={{ duration: 120 }}
			>
				<!-- Search Bar & Controls Header -->
				<div class="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 space-y-2 shrink-0">
					<div class="relative flex items-center">
						<svg class="absolute left-2.5 w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							bind:this={inputElement}
							type="text"
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-8 pr-8 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
							placeholder={filterLevel === 'induk' ? 'Cari OPD Induk...' : 'Cari nama unit, dinas, kecamatan, puskesmas...'}
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

					<!-- Header bar: Filter Level & Mode Buka/Tutup Tree -->
					<div class="flex items-center justify-between gap-1 pt-0.5 text-[11px] flex-wrap">
						<!-- Filter Level Toggle -->
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => filterLevel = 'all'}
								class="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border
									{filterLevel === 'all' 
										? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
										: 'bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border-zinc-200 dark:border-zinc-700'}"
							>
								Semua Unit
							</button>
							<button
								type="button"
								onclick={() => filterLevel = 'induk'}
								class="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border flex items-center gap-1
									{filterLevel === 'induk' 
										? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
										: 'bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border-zinc-200 dark:border-zinc-700'}"
							>
								<span class="w-1.5 h-1.5 rounded-full {filterLevel === 'induk' ? 'bg-white' : 'bg-emerald-500'}"></span>
								Hanya OPD Induk
							</button>
						</div>

						<!-- Buka Semua / Tutup Semua Kontrol Pohon -->
						<div class="flex items-center gap-1.5 text-[10px]">
							<button 
								type="button" 
								onclick={expandAll} 
								class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0"
							>
								Buka Semua
							</button>
							<span class="text-zinc-300 dark:text-zinc-700">•</span>
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

				<!-- Content Tree Container: Selalu Tree View dengan Kemampuan Buka Anak -->
				<div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-72">
					{#if filteredTree.length === 0}
						<div class="px-4 py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-1.5">
							<div class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-1">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
							</div>
							<p class="font-semibold text-zinc-700 dark:text-zinc-300">
								Tidak ada unit kerja yang cocok dengan {searchQuery ? `"${searchQuery}"` : 'filter saat ini'}
							</p>
							<p class="text-[11px] text-zinc-400 max-w-xs mx-auto">
								Pastikan kata kunci benar atau gunakan tombol <button type="button" onclick={() => { filterLevel = 'all'; searchQuery = ''; }} class="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">"Semua Unit"</button>.
							</p>
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
