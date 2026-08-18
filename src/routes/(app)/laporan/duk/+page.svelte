<script>
	import { onMount, untrack } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import Accordion from '$lib/components/ui/Accordion.svelte';

	// State
	let data = $state([]);
	let stats = $state({ total: 0, page: 1, limit: 10, totalPages: 0, per_jabatan: {} });
	let unorOptions = $state([]);
	let selectedUnorId = $state('');
	let page = $state(1);
	let loading = $state(false);
	let loadingOptions = $state(false);
	let error = $state(null);

	async function loadUnorOptions() {
		loadingOptions = true;
		try {
			// Get Unor Induk for the filter (KAB TOJO UNA-UNA: 7209, isAktif: 1)
			const res = await api('/ref-unor/induk?limit=1000&instansi_kode=7209&isAktif=1');
			unorOptions = (res.data || []).map(item => ({
				value: item.id,
				label: item.nmUnor
			}));
		} catch (err) {
			console.error('Failed to load unor options:', err);
		} finally {
			loadingOptions = false;
		}
	}

	async function loadDUK(newPage = 1) {
		if (!selectedUnorId) return;
		
		const targetPage = typeof newPage === 'number' ? newPage : 1;
		page = targetPage;
		
		loading = true;
		error = null;
		try {
			const res = await api(`/pegawai/duk?unorInduk_id=${selectedUnorId}&page=${targetPage}&limit=10`);
			data = res.data.data;
			stats = res.data.stats;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function handlePageChange(p) {
		if (loading || p < 1 || p > stats.totalPages) return;
		loadDUK(p);
	}

	function handleExport() {
		if (!selectedUnorId) return;
		const url = `${import.meta.env.VITE_API_URL}/pegawai/duk/export?unorInduk_id=${selectedUnorId}`;
		window.open(url, '_blank');
	}

	onMount(() => {
		loadUnorOptions();
	});

	// Auto-load on selection
	$effect(() => {
		if (selectedUnorId) {
			untrack(() => loadDUK(1));
		}
	});

	// Get Top 8 Jabatan for summary
	let topJabatan = $derived(
		Object.entries(stats.per_jabatan || {})
			.sort(([, a], [, b]) => b - a)
			.slice(0, 8)
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Daftar Urut Kepangkatan (DUK)</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Laporan kepegawaian resmi berdasarkan urutan kepangkatan, eselon, dan jabatan per unit kerja
			</p>
		</div>
	</div>

	<!-- Filter / Search Section -->
	<Card>
		<div class="flex flex-col md:flex-row items-end gap-4">
			<div class="flex-1 w-full">
				<Combobox 
					label="Pilih Unit Kerja (OPD Induk Kab. Tojo Una-Una)"
					placeholder={loadingOptions ? "Memuat daftar 90 OPD aktif..." : "Pilih atau cari nama OPD / Unit Kerja..."}
					options={unorOptions}
					bind:value={selectedUnorId}
					disabled={loadingOptions}
					class="w-full"
				/>
			</div>
			<div class="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
				<Button variant="primary" onclick={() => loadDUK(1)} loading={loading} disabled={!selectedUnorId} class="flex-1 md:flex-initial">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					Tampilkan
				</Button>

				<Button variant="secondary" onclick={handleExport} disabled={!selectedUnorId || loading} class="flex-1 md:flex-initial">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
					Export Excel
				</Button>
			</div>
		</div>
	</Card>

	<!-- Table Section -->
	{#if loading && data.length === 0}
		<LoadingState message="Menyusun data DUK unit organisasi..." />
	{:else if error}
		<ErrorState message={error} onRetry={() => loadDUK(page)} />
	{:else if data.length > 0 || loading}
		<!-- Stats Summary Accordion -->
		<Accordion open={false}>
			{#snippet title()}
				<div class="flex items-center gap-6">
					<div class="flex flex-col">
						<span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Total Pegawai Unit</span>
						<div class="flex items-baseline gap-2">
							<span class="text-3xl font-black text-zinc-900 dark:text-white leading-none">{stats.total}</span>
							<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">PNS Aktif</span>
						</div>
					</div>
					<div class="hidden md:block h-10 w-px bg-zinc-200 dark:bg-zinc-800"></div>
					<div class="hidden md:flex flex-col">
						<span class="text-xs font-bold text-zinc-400">Ringkasan Komposisi</span>
						<span class="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">{Object.keys(stats.per_jabatan || {}).length} Ragam Jabatan</span>
					</div>
				</div>
			{/snippet}

			<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
				{#each topJabatan as [name, count]}
					<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors overflow-hidden">
						<div class="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase line-clamp-2 leading-tight mb-2 h-6" title={name}>{name}</div>
						<div class="flex items-center justify-between">
							<div class="text-xl font-black text-zinc-900 dark:text-zinc-50 leading-none">{count}</div>
							<div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
						</div>
					</div>
				{/each}
				
				{#if Object.keys(stats.per_jabatan || {}).length > 8}
					<div class="col-span-full pt-2">
						<p class="text-[10px] text-zinc-400 text-center font-medium italic">Menampilkan 8 jabatan teratas dari total {Object.keys(stats.per_jabatan).length} jabatan pada unit kerja ini.</p>
					</div>
				{/if}
			</div>
		</Accordion>

		<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
			{#if loading}
				<div class="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all">
					<div class="flex flex-col items-center gap-2">
						<span class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full shadow-sm"></span>
						<span class="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest animate-pulse">Memperbarui Urutan DUK...</span>
					</div>
				</div>
			{/if}
			<table class="w-full text-left text-xs sm:text-sm">
				<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
					<tr>
						<th class="px-5 py-4 w-12 text-center">No</th>
						<th class="px-5 py-4">Pegawai</th>
						<th class="px-4 py-4">Pangkat / Golongan</th>
						<th class="px-4 py-4">Jabatan</th>
						<th class="px-5 py-4">Unit Kerja</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
					{#each data as p, i}
						<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
								{(stats.page - 1) * stats.limit + i + 1}
							</td>
							<td class="px-5 py-3.5">
								<a href="/pegawai/{p.id}" class="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug">
									{p.nama}
								</a>
								<div class="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{p.nip}</div>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{p.pangkat_gol}</span>
							</td>
							<td class="px-4 py-3.5">
								<div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{p.jabatan}</div>
							</td>
							<td class="px-5 py-3.5">
								<div class="text-xs text-zinc-600 dark:text-zinc-400 font-medium max-w-[220px] truncate" title={p.unit_kerja}>{p.unit_kerja}</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<!-- Pagination Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/60 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="text-xs font-semibold text-zinc-500">
					Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-100">{(stats.page - 1) * stats.limit + 1}</span> - 
					<span class="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(stats.page * stats.limit, stats.total)}</span> dari 
					<span class="font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</span> pegawai
				</div>
				<div class="flex items-center gap-2">
					<Button 
						variant="secondary" 
						size="sm" 
						disabled={page <= 1} 
						onclick={() => handlePageChange(page - 1)}
					>
						Sebelumnya
					</Button>
					
					<div class="flex items-center gap-1">
						{#each Array.from({ length: Math.min(5, stats.totalPages || 0) }, (_, i) => {
							const totalPages = stats.totalPages || 0;
							const start = Math.max(1, Math.min(page - 2, totalPages - 4));
							return start + i;
						}) as p}
							<button 
								class="w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer {p === page ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
								onclick={() => handlePageChange(p)}
							>
								{p}
							</button>
						{/each}
					</div>

					<Button 
						variant="secondary" 
						size="sm" 
						disabled={page >= stats.totalPages} 
						onclick={() => handlePageChange(page + 1)}
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		</div>
	{:else if !selectedUnorId}
		<div class="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8">
			<div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
			</div>
			<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Siap untuk Menampilkan DUK</h3>
			<p class="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">Silakan pilih OPD / Unit Organisasi Induk di atas untuk menyusun Daftar Urut Kepangkatan.</p>
		</div>
	{:else}
		<EmptyState message="Tidak ada data pegawai untuk unit kerja ini." />
	{/if}
</div>
