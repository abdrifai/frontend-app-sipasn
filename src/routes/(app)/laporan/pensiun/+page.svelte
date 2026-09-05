<script>
	import { onMount, untrack } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { debounce } from '$lib/utils/debounce.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';

	// State
	let data = $state([]);
	let stats = $state({
		total_pns: 0,
		tahun_ini: 0,
		tahun_depan: 0,
		lima_tahun: 0,
		sudah_bup: 0,
		distribusi_tahun: {},
		distribusi_kategori: { STRUKTURAL: 0, FUNGSIONAL: 0, PELAKSANA: 0 },
		distribusi_bulan: {}
	});
	let meta = $state({ page: 1, limit: 15, total: 0, totalPages: 1 });

	// Filter state
	const currentYear = new Date().getFullYear();
	let selectedTahun = $state(currentYear.toString());
	let selectedBulan = $state('all');
	let selectedRentang = $state('');
	let selectedJnsJabId = $state('all');
	let selectedUnorId = $state('');
	let search = $state('');
	let page = $state(1);

	let loading = $state(true);
	let loadingOptions = $state(false);
	let exporting = $state(false);
	let error = $state(null);
	let unorOptions = $state([]);
	let jenisJabatanOptions = $state([]);

	const months = [
		{ val: 'all', label: 'Semua Bulan' },
		{ val: '1', label: 'Januari' },
		{ val: '2', label: 'Februari' },
		{ val: '3', label: 'Maret' },
		{ val: '4', label: 'April' },
		{ val: '5', label: 'Mei' },
		{ val: '6', label: 'Juni' },
		{ val: '7', label: 'Juli' },
		{ val: '8', label: 'Agustus' },
		{ val: '9', label: 'September' },
		{ val: '10', label: 'Oktober' },
		{ val: '11', label: 'November' },
		{ val: '12', label: 'Desember' },
	];

	const yearTabs = [
		{ id: currentYear.toString(), label: `Tahun ${currentYear}` },
		{ id: (currentYear + 1).toString(), label: `Tahun ${currentYear + 1}` },
		{ id: (currentYear + 2).toString(), label: `Tahun ${currentYear + 2}` },
		{ id: (currentYear + 3).toString(), label: `Tahun ${currentYear + 3}` },
		{ id: '5_tahun', label: '5 Tahun (2026-2030)' },
		{ id: 'sudah_bup', label: 'Sudah BUP' },
		{ id: 'all', label: 'Semua Proyeksi' },
	];

	async function loadUnorOptions() {
		loadingOptions = true;
		try {
			const res = await api('/ref-unor/induk?limit=1000&instansi_kode=7209&isAktif=1');
			unorOptions = (res.data || []).map(item => ({
				value: item.id,
				label: item.nmUnor
			}));
		} catch (err) {
			console.error('Gagal memuat opsi OPD:', err);
		} finally {
			loadingOptions = false;
		}
	}

	async function loadJenisJabatanOptions() {
		try {
			const res = await api('/ref-jabatan/jenis?is_aktif=1&limit=100');
			jenisJabatanOptions = res.data || [];
		} catch (err) {
			console.error('Gagal memuat opsi jenis jabatan:', err);
		}
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const queryParams = new URLSearchParams({
				page: page.toString(),
				limit: '15',
				search: search.trim(),
				...(selectedUnorId ? { unorInduk_id: selectedUnorId } : {}),
				...(selectedJnsJabId && selectedJnsJabId !== 'all' ? { jns_jab_id: selectedJnsJabId } : {}),
				...(selectedBulan && selectedBulan !== 'all' ? { bulan: selectedBulan } : {}),
			});

			if (selectedTahun === '5_tahun') {
				queryParams.set('rentang', '5_tahun');
				queryParams.set('tahun', 'all');
			} else if (selectedTahun === 'sudah_bup') {
				queryParams.set('rentang', 'sudah_bup');
				queryParams.set('tahun', 'all');
			} else {
				queryParams.set('tahun', selectedTahun);
			}

			const res = await api(`/pensiun/proyeksi?${queryParams.toString()}`);
			data = res.data.data;
			stats = res.data.stats;
			meta = res.meta;
		} catch (err) {
			error = err.message || 'Gagal memuat data estimasi pensiun';
		} finally {
			loading = false;
		}
	}

	const debouncedSearch = debounce(() => {
		page = 1;
		loadData();
	}, 400);

	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});

	function handleYearTab(tabId) {
		selectedTahun = tabId;
		page = 1;
		loadData();
	}

	function handleFilterChange() {
		page = 1;
		loadData();
	}

	function handlePageChange(newPage) {
		if (loading || newPage < 1 || newPage > meta.totalPages) return;
		page = newPage;
		loadData();
	}

	function handleExport() {
		const queryParams = new URLSearchParams({
			...(search ? { search: search.trim() } : {}),
			...(selectedUnorId ? { unorInduk_id: selectedUnorId } : {}),
			...(selectedJnsJabId && selectedJnsJabId !== 'all' ? { jns_jab_id: selectedJnsJabId } : {}),
			...(selectedBulan && selectedBulan !== 'all' ? { bulan: selectedBulan } : {}),
		});

		if (selectedTahun === '5_tahun') {
			queryParams.set('rentang', '5_tahun');
			queryParams.set('tahun', 'all');
		} else if (selectedTahun === 'sudah_bup') {
			queryParams.set('rentang', 'sudah_bup');
			queryParams.set('tahun', 'all');
		} else {
			queryParams.set('tahun', selectedTahun);
		}

		const url = `${import.meta.env.VITE_API_URL}/pensiun/proyeksi/export?${queryParams.toString()}`;
		window.open(url, '_blank');
	}

	function formatTglIndo(tglStr) {
		if (!tglStr) return '-';
		const d = new Date(tglStr);
		if (isNaN(d.getTime())) return tglStr;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getKategoriBadge(kat) {
		switch (kat) {
			case 'STRUKTURAL':
				return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
			case 'FUNGSIONAL':
				return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
			case 'PELAKSANA':
			default:
				return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
		}
	}

	function getStatusBadge(status) {
		switch (status) {
			case 'SUDAH_BUP':
				return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse';
			case 'SEGERA':
				return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold';
			case 'MENDEKATI':
				return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
			case 'PERSIAPAN':
				return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
			default:
				return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
		}
	}

	onMount(() => {
		loadUnorOptions();
		loadJenisJabatanOptions();
		loadData();
	});
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Laporan Estimasi Pensiun Pegawai</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Proyeksi Batas Usia Pensiun (BUP) Pegawai Negeri Sipil Pemerintah Kabupaten Tojo Una-Una
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="secondary" onclick={handleExport} disabled={loading || meta.total === 0}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
				Export Excel ({meta.total})
			</Button>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl p-5 shadow-lg shadow-rose-500/10 relative overflow-hidden">
			<div class="flex justify-between items-start">
				<div>
					<p class="text-xs font-bold uppercase tracking-wider text-rose-100">Pensiun Tahun Ini</p>
					<h3 class="text-3xl font-black mt-1 tracking-tight">{stats.tahun_ini}</h3>
				</div>
				<div class="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
				</div>
			</div>
			<div class="mt-3 flex items-center justify-between text-xs text-rose-100 font-medium">
				<span>TMT Thn {currentYear}</span>
				<span class="font-bold">{((stats.tahun_ini / (stats.total_pns || 1)) * 100).toFixed(1)}% ASN</span>
			</div>
		</div>

		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
			<div class="flex justify-between items-start">
				<div>
					<p class="text-xs font-bold uppercase tracking-wider text-zinc-400">Pensiun Tahun Depan</p>
					<h3 class="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tracking-tight">{stats.tahun_depan}</h3>
				</div>
				<div class="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
				</div>
			</div>
			<div class="mt-3 text-xs text-zinc-500 font-medium">
				Proyeksi TMT Tahun {currentYear + 1}
			</div>
		</div>

		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
			<div class="flex justify-between items-start">
				<div>
					<p class="text-xs font-bold uppercase tracking-wider text-zinc-400">Proyeksi 5 Tahun</p>
					<h3 class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">{stats.lima_tahun}</h3>
				</div>
				<div class="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
				</div>
			</div>
			<div class="mt-3 text-xs text-zinc-500 font-medium">
				Periode {currentYear} – {currentYear + 4}
			</div>
		</div>

		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
			<div class="flex justify-between items-start">
				<div>
					<p class="text-xs font-bold uppercase tracking-wider text-zinc-400">Sudah Mencapai BUP</p>
					<h3 class="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 tracking-tight">{stats.sudah_bup}</h3>
				</div>
				<div class="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
				</div>
			</div>
			<div class="mt-3 text-xs text-zinc-500 font-medium">
				Telah Memasuki Usia Pensiun
			</div>
		</div>
	</div>

	<!-- Year Selection Tabs -->
	<div class="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-2xl w-full overflow-x-auto border border-zinc-200/80 dark:border-zinc-800/80 scrollbar-none">
		{#each yearTabs as tab}
			<button
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all
					{selectedTahun === tab.id 
						? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-800 font-extrabold' 
						: 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}"
				onclick={() => handleYearTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Main Filter & Search Section -->
	<Card>
		<div class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
				<!-- Search Name / NIP -->
				<div class="relative md:col-span-2">
					<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</span>
					<input
						type="text"
						bind:value={search}
						placeholder="Cari Nama Pegawai atau NIP..."
						class="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-zinc-400"
					/>
				</div>

				<!-- Bulan Filter -->
				<div>
					<select
						bind:value={selectedBulan}
						onchange={handleFilterChange}
						class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
					>
						{#each months as m}
							<option value={m.val}>{m.label}</option>
						{/each}
					</select>
				</div>

				<!-- Jenis Jabatan Filter -->
				<div>
					<select
						bind:value={selectedJnsJabId}
						onchange={handleFilterChange}
						class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
					>
						<option value="all">Semua Jenis Jabatan</option>
						{#each jenisJabatanOptions as opt}
							<option value={opt.id}>{opt.jnsjab}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Combobox OPD / Unor Induk -->
			<div class="pt-1">
				<Combobox 
					label="Filter Berdasarkan Unit Organisasi (OPD Induk Kab. Tojo Una-Una)"
					placeholder={loadingOptions ? "Memuat 90 OPD aktif..." : "Pilih atau cari nama OPD / Unit Kerja..."}
					options={unorOptions}
					bind:value={selectedUnorId}
					disabled={loadingOptions}
					class="w-full"
				/>
			</div>
		</div>
	</Card>

	<!-- Table Area -->
	{#if loading && data.length === 0}
		<LoadingState message="Menghitung estimasi pensiun pegawai..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadData} />
	{:else if data.length === 0}
		<EmptyState message="Tidak ada data pegawai yang sesuai dengan kriteria pensiun terpilih." />
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
			{#if loading}
				<div class="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all">
					<div class="flex flex-col items-center gap-2">
						<span class="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full shadow-sm"></span>
						<span class="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest animate-pulse">Memperbarui Data...</span>
					</div>
				</div>
			{/if}

			<table class="w-full text-left text-xs sm:text-sm">
				<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
					<tr>
						<th class="px-5 py-4 w-12 text-center">No</th>
						<th class="px-5 py-4">Pegawai</th>
						<th class="px-4 py-4">Tgl Lahir & Usia</th>
						<th class="px-3 py-4 text-center">BUP</th>
						<th class="px-5 py-4">TMT Estimasi Pensiun</th>
						<th class="px-4 py-4">Jabatan & Kategori</th>
						<th class="px-4 py-4">Pangkat / Gol</th>
						<th class="px-5 py-4">Unit Kerja (OPD)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
					{#each data as p, idx}
						<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
								{(meta.page - 1) * meta.limit + idx + 1}
							</td>
							<td class="px-5 py-3.5">
								<a href="/pegawai/{p.id}" class="font-bold text-zinc-900 dark:text-zinc-100 hover:text-rose-600 dark:hover:text-rose-400 transition-colors leading-snug">
									{p.nama}
								</a>
								<div class="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
									{p.nip}
								</div>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<div class="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
									{formatTglIndo(p.tgl_lahir)}
								</div>
								<div class="text-[11px] text-zinc-500 mt-0.5">
									{p.usia_sekarang}
								</div>
							</td>
							<td class="px-3 py-3.5 text-center whitespace-nowrap">
								<span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
									{p.bup} Thn
								</span>
							</td>
							<td class="px-5 py-3.5 whitespace-nowrap">
								<div class="font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
									{formatTglIndo(p.tmt_pensiun)}
								</div>
								<div class="mt-1">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight {getStatusBadge(p.status_pensiun)}">
										{p.sisa_waktu}
									</span>
								</div>
							</td>
							<td class="px-4 py-3.5">
								<div class="font-semibold text-zinc-800 dark:text-zinc-200 text-xs leading-snug">
									{p.jabatan}
								</div>
								<div class="mt-1">
									<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider {getKategoriBadge(p.kategori)}">
										{p.kategori}
									</span>
								</div>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									{p.pangkat_gol}
								</span>
							</td>
							<td class="px-5 py-3.5">
								<div class="text-xs text-zinc-600 dark:text-zinc-400 font-medium max-w-[220px] truncate" title={p.unit_kerja}>
									{p.unit_kerja}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
			<p class="text-xs font-semibold text-zinc-500">
				Menampilkan <span class="text-zinc-900 dark:text-zinc-100 font-bold">{(meta.page - 1) * meta.limit + 1}</span> - 
				<span class="text-zinc-900 dark:text-zinc-100 font-bold">{Math.min(meta.page * meta.limit, meta.total)}</span> dari 
				<span class="text-zinc-900 dark:text-zinc-100 font-bold">{meta.total}</span> pegawai akan pensiun
			</p>
			<div class="flex items-center gap-2">
				<Button variant="secondary" disabled={page <= 1} onclick={() => handlePageChange(page - 1)}>
					Sebelumnya
				</Button>
				<div class="flex items-center gap-1">
					{#each Array.from({ length: Math.min(5, meta.totalPages || 0) }, (_, i) => {
						const totalPages = meta.totalPages || 0;
						const start = Math.max(1, Math.min(page - 2, totalPages - 4));
						return start + i;
					}) as p}
						<button 
							class="w-8 h-8 rounded-lg text-xs font-bold transition-colors {p === page ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
							onclick={() => handlePageChange(p)}
						>
							{p}
						</button>
					{/each}
				</div>
				<Button variant="secondary" disabled={page >= meta.totalPages} onclick={() => handlePageChange(page + 1)}>
					Selanjutnya
				</Button>
			</div>
		</div>
	{/if}
</div>
