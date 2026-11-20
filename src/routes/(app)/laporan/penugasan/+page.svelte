<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import { toastStore } from '$lib/stores/toastStore.js';

	const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
	const toast = toastStore;

	// State Data Utama
	let dataList = $state([]);
	let stats = $state({
		total: 0,
		totalAktif: 0,
		totalSelesai: 0,
		byJenis: {
			KEPALA_SEKOLAH: 0,
			KEPALA_PUSKESMAS: 0,
			PLT: 0,
			PLH: 0,
			KOORDINATOR: 0,
			LAINNYA: 0
		}
	});

	let meta = $state({
		page: 1,
		limit: 15,
		total: 0,
		totalPages: 1
	});

	// Filter States
	let activeCategory = $state(''); // '' = Semua, 'KEPALA_SEKOLAH', 'KEPALA_PUSKESMAS', 'PLT', 'PLH', 'KOORDINATOR', 'LAINNYA'
	let selectedStatus = $state(''); // '' = Semua, 'true' = Aktif, 'false' = Selesai
	let selectedUnorId = $state('');
	let searchQuery = $state('');
	let page = $state(1);
	let limit = $state(15);

	// Option States
	let unorOptions = $state([]);
	let loadingUnor = $state(false);
	let loadingData = $state(true);
	let loadingStats = $state(true);
	let error = $state(null);
	let exportingCsv = $state(false);

	const categoryTabs = [
		{ id: '', label: 'Semua Penugasan', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
		{ id: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah', icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z' },
		{ id: 'KEPALA_PUSKESMAS', label: 'Kepala Puskesmas', icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' },
		{ id: 'PLT', label: 'Plt. (Pelaksana Tugas)', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
		{ id: 'PLH', label: 'Plh. (Pelaksana Harian)', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
		{ id: 'KOORDINATOR', label: 'Koordinator', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
		{ id: 'LAINNYA', label: 'Lainnya', icon: 'M12 12h.01M16 12h.01M8 12h.01' },
	];

	async function loadUnorOptions() {
		if (unorOptions.length > 0) return;
		loadingUnor = true;
		try {
			const res = await api('/ref-unor/induk?limit=1000&instansi_kode=7209&isAktif=1');
			unorOptions = (res.data || []).map((item) => ({
				value: String(item.id),
				label: item.nmUnor
			}));
		} catch (err) {
			console.error('Gagal memuat daftar unit kerja:', err);
		} finally {
			loadingUnor = false;
		}
	}

	async function loadStats() {
		loadingStats = true;
		try {
			const params = new URLSearchParams();
			if (selectedUnorId) params.append('unor_id', selectedUnorId);
			const res = await api(`/laporan/penugasan/statistik?${params.toString()}`);
			if (res.data) {
				stats = res.data;
			}
		} catch (err) {
			console.error('Gagal memuat statistik penugasan:', err);
		} finally {
			loadingStats = false;
		}
	}

	async function loadData(targetPage = 1) {
		page = targetPage;
		loadingData = true;
		error = null;

		try {
			const params = new URLSearchParams({
				page: String(targetPage),
				limit: String(limit),
				search: searchQuery.trim()
			});

			if (activeCategory) {
				params.append('jenis_tugas_tambahan', activeCategory);
			}
			if (selectedStatus !== '') {
				params.append('is_aktif', selectedStatus);
			}
			if (selectedUnorId) {
				params.append('unor_id', selectedUnorId);
			}

			const res = await api(`/laporan/penugasan?${params.toString()}`);
			dataList = res.data || [];
			meta = res.meta || { page: 1, limit: 15, total: 0, totalPages: 1 };
		} catch (err) {
			error = err.message || 'Gagal memuat data laporan penugasan';
			toast.error(error);
		} finally {
			loadingData = false;
		}
	}

	function handleCategoryClick(catId) {
		activeCategory = catId;
		loadData(1);
	}

	function handleSearch(e) {
		e?.preventDefault?.();
		loadData(1);
	}

	function handleResetFilter() {
		activeCategory = '';
		selectedStatus = '';
		selectedUnorId = '';
		searchQuery = '';
		loadStats();
		loadData(1);
	}

	async function handleExportCsv() {
		exportingCsv = true;
		try {
			const params = new URLSearchParams({
				search: searchQuery.trim()
			});
			if (activeCategory) params.append('jenis_tugas_tambahan', activeCategory);
			if (selectedStatus !== '') params.append('is_aktif', selectedStatus);
			if (selectedUnorId) params.append('unor_id', selectedUnorId);

			const downloadUrl = `${import.meta.env.VITE_API_URL || ''}/laporan/penugasan/export?${params.toString()}`;
			window.open(downloadUrl, '_blank');
			toast.success('Unduhan berkas CSV penugasan dimulai');
		} catch (err) {
			toast.error(err.message || 'Gagal mengunduh berkas CSV');
		} finally {
			exportingCsv = false;
		}
	}

	function handlePrint() {
		window.print();
	}

	onMount(() => {
		loadUnorOptions();
		loadStats();
		loadData(1);
	});
</script>

<svelte:head>
	<title>Laporan Penugasan & Tugas Tambahan — SIPASN</title>
</svelte:head>

<div class="space-y-6 print:p-0">
	<!-- Page Header (Screen Only) -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</span>
				<div>
					<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
						Laporan Penugasan & Tugas Tambahan
					</h1>
					<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
						Rekapitulasi penugasan khusus ASN (Kepala Sekolah, Kepala Puskesmas, Plt., Plh., Koordinator) tanpa mengubah jabatan pokok definitif.
					</p>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2.5 self-start md:self-center">
			<Button
				variant="secondary"
				onclick={handlePrint}
				class="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
				<span>Cetak Laporan</span>
			</Button>

			<Button
				variant="primary"
				onclick={handleExportCsv}
				loading={exportingCsv}
				class="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
				<span>Ekspor CSV</span>
			</Button>
		</div>
	</div>

	<!-- Kop Laporan Resmi (Print Mode Only) -->
	<div class="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
		<h2 class="text-base font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN TOJO UNA-UNA</h2>
		<h1 class="text-xl font-black uppercase tracking-tight">BADAN KEPEGAWAIAN DAN PENGEMBANGAN SDM DAERAH</h1>
		<p class="text-xs text-zinc-600 mt-1">Jalan Tanjumbulu No. 1, Ampana, Sulawesi Tengah</p>
		<div class="mt-4 pt-2 border-t border-zinc-400">
			<h3 class="text-sm font-bold uppercase">LAPORAN PENUGASAN & TUGAS TAMBAHAN PEGAWAI NEGERI SIPIL</h3>
			<p class="text-[11px] text-zinc-600">Per Tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
		</div>
	</div>

	<!-- Ringkasan Statistik Cards (Screen Only) -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
		<!-- Card 1: Total -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Total Penugasan</span>
				<span class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-zinc-900 dark:text-zinc-50 font-mono">
				{stats.total.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 flex items-center gap-1 font-medium">
				<span class="text-emerald-600 font-bold">{stats.totalAktif} Aktif</span> • {stats.totalSelesai} Selesai
			</div>
		</div>

		<!-- Card 2: Kepala Sekolah -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Kepala Sekolah</span>
				<span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
				{stats.byJenis.KEPALA_SEKOLAH.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 font-medium">
				Guru Fungsional
			</div>
		</div>

		<!-- Card 3: Kepala Puskesmas -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Kepala Puskesmas</span>
				<span class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
				{stats.byJenis.KEPALA_PUSKESMAS.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 font-medium">
				Tenaga Kesehatan
			</div>
		</div>

		<!-- Card 4: Plt. -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Pelaksana Tugas</span>
				<span class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
				{stats.byJenis.PLT.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 font-medium">
				Plt. Jabatan Kosong
			</div>
		</div>

		<!-- Card 5: Plh. -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Pelaksana Harian</span>
				<span class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
				{stats.byJenis.PLH.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 font-medium">
				Plh. Pejabat Berhalangan
			</div>
		</div>

		<!-- Card 6: Koordinator & Lainnya -->
		<div class="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-1">
			<div class="flex items-center justify-between text-zinc-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Koordinator / Lainnya</span>
				<span class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
				</span>
			</div>
			<div class="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
				{(stats.byJenis.KOORDINATOR + stats.byJenis.LAINNYA).toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] text-zinc-500 font-medium">
				Subkoordinator & Tim Kerja
			</div>
		</div>
	</div>

	<!-- Kategori Tabs Navigation (Screen Only) -->
	<div class="border-b border-zinc-200 dark:border-zinc-800 print:hidden overflow-x-auto no-scrollbar">
		<div class="flex items-center gap-1.5 min-w-max pb-1">
			{#each categoryTabs as tab}
				<button
					type="button"
					onclick={() => handleCategoryClick(tab.id)}
					class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 {activeCategory === tab.id
						? 'bg-amber-600 text-white shadow-xs'
						: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={tab.icon}/></svg>
					<span>{tab.label}</span>
					{#if tab.id === ''}
						<span class="px-1.5 py-0.2 rounded-full text-[10px] {activeCategory === '' ? 'bg-amber-700 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}">
							{stats.total}
						</span>
					{:else if stats.byJenis[tab.id] !== undefined}
						<span class="px-1.5 py-0.2 rounded-full text-[10px] {activeCategory === tab.id ? 'bg-amber-700 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}">
							{stats.byJenis[tab.id]}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Filter & Search Controls (Screen Only) -->
	<div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3 print:hidden">
		<form onsubmit={handleSearch} class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Search Query -->
			<div class="space-y-1">
				<label for="search_query" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
					Cari Nama, NIP, SK atau Jabatan
				</label>
				<div class="relative">
					<input
						id="search_query"
						type="text"
						placeholder="Ketik NIP, Nama, SK..."
						bind:value={searchQuery}
						class="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
					/>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-2.5 text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</div>
			</div>

			<!-- Status Filter -->
			<div class="space-y-1">
				<label for="status_penugasan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
					Status Masa Penugasan
				</label>
				<select
					id="status_penugasan"
					bind:value={selectedStatus}
					onchange={() => loadData(1)}
					class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
				>
					<option value="">Semua Status (Aktif & Selesai)</option>
					<option value="true">Masih Aktif Menjabat</option>
					<option value="false">Masa Penugasan Selesai</option>
				</select>
			</div>

			<!-- Unit Kerja Filter -->
			<div class="space-y-1">
				<Combobox
					options={unorOptions}
					bind:value={selectedUnorId}
					onchange={() => {
						loadStats();
						loadData(1);
					}}
					label="Unit Kerja Induk / Penugasan"
					placeholder="Semua Unit Organisasi..."
					disabled={loadingUnor}
				/>
			</div>

			<!-- Buttons Action -->
			<div class="flex items-end gap-2">
				<Button
					type="submit"
					variant="primary"
					class="flex-1 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
				>
					Terapkan Filter
				</Button>

				<Button
					type="button"
					variant="secondary"
					onclick={handleResetFilter}
					class="py-2 px-3 rounded-xl text-xs font-semibold"
					title="Reset semua filter ke default"
				>
					Reset
				</Button>
			</div>
		</form>
	</div>

	<!-- Data Content / Table -->
	<div class="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden print:border-none print:shadow-none">
		{#if loadingData}
			<div class="py-16">
				<LoadingState message="Memuat data laporan penugasan pegawai..." />
			</div>
		{:else if error}
			<div class="p-6">
				<ErrorState message={error} onRetry={() => loadData(page)} />
			</div>
		{:else if dataList.length === 0}
			<div class="py-16">
				<EmptyState
					icon="📋"
					message="Tidak ada data penugasan atau tugas tambahan yang sesuai dengan kriteria filter."
				/>
			</div>
		{:else}
			<!-- Desktop Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead class="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
						<tr>
							<th class="p-3.5 text-center w-12">No</th>
							<th class="p-3.5">Nama & NIP Pegawai</th>
							<th class="p-3.5">Jabatan Pokok Definitif</th>
							<th class="p-3.5">Tugas Tambahan / Penugasan</th>
							<th class="p-3.5">Unit Kerja Penugasan</th>
							<th class="p-3.5">Legalitas SK & TMT</th>
							<th class="p-3.5 text-center w-24">Status</th>
							<th class="p-3.5 text-right w-16 print:hidden">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
						{#each dataList as item}
							<tr class="hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors">
								<!-- 1. No -->
								<td class="p-3.5 text-center font-mono text-zinc-400 font-medium">
									{item.no}
								</td>

								<!-- 2. Pegawai -->
								<td class="p-3.5">
									<div class="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
										{item.nama_lengkap}
									</div>
									<div class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
										{item.nip}
									</div>
									<div class="text-[10px] text-zinc-400 mt-0.5">
										{item.golongan}
									</div>
								</td>

								<!-- 3. Jabatan Pokok Definitif -->
								<td class="p-3.5">
									<div class="font-semibold text-zinc-800 dark:text-zinc-200">
										{item.jabatan_definitif}
									</div>
									<div class="text-[11px] text-zinc-500 dark:text-zinc-400">
										{item.jenjang_jabatan}
									</div>
									<div class="text-[10px] text-zinc-400 mt-0.5">
										{item.unit_kerja_induk}
									</div>
								</td>

								<!-- 4. Tugas Tambahan -->
								<td class="p-3.5">
									<div class="flex items-center gap-1.5 flex-wrap">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
											{item.jenis_tugas_label}
										</span>
									</div>
									<div class="font-bold text-zinc-900 dark:text-zinc-100 text-xs mt-1 leading-snug">
										{item.nama_tugas_tambahan}
									</div>
								</td>

								<!-- 5. Unit Penugasan -->
								<td class="p-3.5 font-medium text-zinc-700 dark:text-zinc-300">
									{item.unit_penugasan}
								</td>

								<!-- 6. SK & TMT -->
								<td class="p-3.5">
									<div class="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
										{item.sk_tugas_tambahan}
									</div>
									<div class="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
										Tgl SK: {item.tgl_sk_tugas_tambahan}
									</div>
									<div class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold font-mono mt-0.5">
										TMT: {item.tmt_tugas_tambahan}
									</div>
								</td>

								<!-- 7. Status -->
								<td class="p-3.5 text-center">
									{#if item.is_tugas_tambahan_aktif}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											Aktif
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
											Selesai
										</span>
									{/if}
								</td>

								<!-- 8. Aksi (Screen Only) -->
								<td class="p-3.5 text-right print:hidden">
									{#if item.pegawai_id}
										<a
											href={`/pegawai/${item.pegawai_id}`}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 inline-flex items-center transition-colors"
											title="Lihat Detail Profil Pegawai"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
										</a>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer (Screen Only) -->
			<div class="p-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
				<div class="text-zinc-500 dark:text-zinc-400">
					Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(meta.page - 1) * meta.limit + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(meta.page * meta.limit, meta.total)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{meta.total.toLocaleString('id-ID')}</span> penugasan
				</div>

				<div class="flex items-center gap-1.5">
					<Button
						variant="secondary"
						disabled={meta.page <= 1 || loadingData}
						onclick={() => loadData(meta.page - 1)}
						class="px-2.5 py-1.5 text-xs rounded-lg"
					>
						Sebelumnya
					</Button>

					<span class="px-2 font-mono font-medium text-zinc-600 dark:text-zinc-300">
						Halaman {meta.page} / {meta.totalPages}
					</span>

					<Button
						variant="secondary"
						disabled={meta.page >= meta.totalPages || loadingData}
						onclick={() => loadData(meta.page + 1)}
						class="px-2.5 py-1.5 text-xs rounded-lg"
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Kolom Pengesahan Tanda Tangan (Print Only) -->
	<div class="hidden print:grid grid-cols-2 pt-8 text-xs break-inside-avoid">
		<div></div>
		<div class="text-center space-y-16">
			<div>
				<p>Ampana, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
				<p class="font-bold">KEPALA BKPSDM KAB. TOJO UNA-UNA</p>
			</div>
			<div>
				<p class="font-bold underline text-sm">......................................................</p>
				<p class="font-mono text-[11px]">NIP. .........................................</p>
			</div>
		</div>
	</div>
</div>

