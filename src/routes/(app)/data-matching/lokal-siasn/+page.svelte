<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	// State Utama
	let loading = $state(false);
	let error = $state(null);
	let exporting = $state(false);
	let items = $state([]);
	let stats = $state({
		total_lokal: 0,
		total_siasn: 0,
		total_all: 0,
		match_count: 0,
		mismatch_count: 0,
		only_local_count: 0,
		only_siasn_count: 0,
		mismatch_breakdown: {
			golongan: 0,
			jabatan: 0,
			unor: 0,
			nama: 0,
			kedudukan: 0
		}
	});

	// State Pagination & Filter
	let page = $state(1);
	let limit = $state(15);
	let totalPages = $state(1);
	let total = $state(0);
	let activeTab = $state('all'); // 'all' | 'match' | 'mismatch' | 'only_local' | 'only_siasn'
	let selectedMismatchType = $state('all'); // 'all' | 'golongan' | 'jabatan' | 'unor' | 'nama' | 'kedudukan'
	let searchQuery = $state('');
	let debounceTimer = null;

	// State Modal Detail
	let isDetailOpen = $state(false);
	let detailLoading = $state(false);
	let selectedDetail = $state(null);

	async function loadData() {
		loading = true;
		error = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				limit: String(limit),
				status: activeTab,
				mismatch_type: selectedMismatchType,
				search: searchQuery.trim(),
			});

			const res = await api(`/data-matching/lokal-siasn?${queryParams.toString()}`);
			if (res?.data) {
				items = res.data || [];
				total = res.meta?.total || 0;
				totalPages = res.meta?.totalPages || 1;
				if (res.meta?.stats) {
					stats = res.meta.stats;
				}
			}
		} catch (err) {
			error = err.message || 'Gagal memuat data matching';
			toastStore.error(error);
		} finally {
			loading = false;
		}
	}

	async function loadStatsOnly() {
		try {
			const res = await api('/data-matching/lokal-siasn/stats');
			if (res?.data) {
				stats = res.data;
			}
		} catch (err) {
			console.error('Gagal mengambil statistik matching', err);
		}
	}

	function handleTabChange(tabKey) {
		activeTab = tabKey;
		if (tabKey !== 'mismatch') {
			selectedMismatchType = 'all';
		}
		page = 1;
		loadData();
	}

	function handleMismatchTypeChange(e) {
		selectedMismatchType = e.target.value;
		page = 1;
		loadData();
	}

	function handleSearchInput(e) {
		searchQuery = e.target.value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			page = 1;
			loadData();
		}, 400);
	}

	function handleLimitChange(e) {
		limit = parseInt(e.target.value, 10) || 15;
		page = 1;
		loadData();
	}

	function goToPage(p) {
		if (p < 1 || p > totalPages || p === page) return;
		page = p;
		loadData();
	}

	async function openDetailModal(nip) {
		isDetailOpen = true;
		detailLoading = true;
		selectedDetail = null;
		try {
			const res = await api(`/data-matching/lokal-siasn/detail/${nip}`);
			if (res?.data) {
				selectedDetail = res.data;
			}
		} catch (err) {
			toastStore.error(err.message || 'Gagal mengambil detail komparasi pegawai');
			isDetailOpen = false;
		} finally {
			detailLoading = false;
		}
	}

	function closeDetailModal() {
		isDetailOpen = false;
		selectedDetail = null;
	}

	async function exportExcel() {
		exporting = true;
		try {
			const queryParams = new URLSearchParams({
				status: activeTab,
				mismatch_type: selectedMismatchType,
				search: searchQuery.trim(),
			});

			const token = localStorage.getItem('token') || '';
			const baseUrl = import.meta.env.VITE_API_URL || '';
			const downloadUrl = `${baseUrl}/data-matching/lokal-siasn/export?${queryParams.toString()}`;

			const res = await fetch(downloadUrl, {
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Gagal mengunduh file Excel data matching');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Data_Matching_Lokal_SIASN_${new Date().toISOString().split('T')[0]}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			a.remove();

			toastStore.success('File Excel Data Matching berhasil diunduh');
		} catch (err) {
			toastStore.error(err.message || 'Gagal mengunduh Excel');
		} finally {
			exporting = false;
		}
	}

	onMount(() => {
		loadStatsOnly();
		loadData();
	});
</script>

<svelte:head>
	<title>Data Matching (Lokal & SIASN) - SIPASN</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- Top Header & Breadcrumb -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
		<div>
			<div class="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
				<span>Layanan Kepegawaian</span>
				<span>/</span>
				<span>Data Matching</span>
				<span>/</span>
				<span class="text-blue-600 dark:text-blue-400 font-semibold">Lokal & SIASN</span>
			</div>
			<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
				<span>Data Matching: Database Lokal vs SIASN BKN</span>
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
				Pencocokan, verifikasi integritas, dan analisis diskrepansi data PNS antara SIPASN Daerah dan data import SIASN BKN.
			</p>
		</div>

		<div class="flex items-center gap-2.5 shrink-0">
			<Button
				variant="secondary"
				onclick={() => { loadData(); loadStatsOnly(); }}
				disabled={loading}
				class="text-xs"
			>
				<svg class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
				Segarkan
			</Button>

			<Button
				variant="primary"
				onclick={exportExcel}
				loading={exporting}
				class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
				Export Excel
			</Button>
		</div>
	</div>

	<!-- Metric Summary Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
		<!-- Total Pegawai Lokal -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Total Lokal</span>
				<div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total_lokal.toLocaleString()}</div>
				<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Pegawai aktif SIPASN</p>
			</div>
		</div>

		<!-- Total Pegawai SIASN -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Total SIASN</span>
				<div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total_siasn.toLocaleString()}</div>
				<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Data import BKN</p>
			</div>
		</div>

		<!-- Data Sesuai -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Sesuai (Match)</span>
				<div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.match_count.toLocaleString()}</div>
				<p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Semua atribut selaras</p>
			</div>
		</div>

		<!-- Data Selisih -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Selisih Data</span>
				<div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.mismatch_count.toLocaleString()}</div>
				<p class="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Terdapat perbedaan data</p>
			</div>
		</div>

		<!-- Hanya di Lokal -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/40 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Hanya di Lokal</span>
				<div class="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.only_local_count.toLocaleString()}</div>
				<p class="text-[10px] text-sky-600/70 dark:text-sky-400/70 mt-0.5">Belum ada di import BKN</p>
			</div>
		</div>

		<!-- Hanya di SIASN -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider">Hanya di SIASN</span>
				<div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
				</div>
			</div>
			<div>
				<div class="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.only_siasn_count.toLocaleString()}</div>
				<p class="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">Belum tercatat di SIPASN</p>
			</div>
		</div>
	</div>

	<!-- Main Filter & Table Card -->
	<div class="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
		<!-- Navigation Tabs & Filter Bar -->
		<div class="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 sm:p-5 space-y-4">
			<!-- Status Tabs -->
			<div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
				<button
					type="button"
					onclick={() => handleTabChange('all')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'}"
				>
					<span>Semua Data</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}">
						{stats.total_all}
					</span>
				</button>

				<button
					type="button"
					onclick={() => handleTabChange('match')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'match' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}"
				>
					<span>Sesuai (Match)</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'match' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}">
						{stats.match_count}
					</span>
				</button>

				<button
					type="button"
					onclick={() => handleTabChange('mismatch')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'mismatch' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'}"
				>
					<span>Selisih (Mismatch)</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'mismatch' ? 'bg-amber-500 text-white' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}">
						{stats.mismatch_count}
					</span>
				</button>

				<button
					type="button"
					onclick={() => handleTabChange('only_local')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'only_local' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-sky-50 dark:hover:bg-sky-950/30'}"
				>
					<span>Hanya di Lokal</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'only_local' ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'}">
						{stats.only_local_count}
					</span>
				</button>

				<button
					type="button"
					onclick={() => handleTabChange('only_siasn')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'only_siasn' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-purple-50 dark:hover:bg-purple-950/30'}"
				>
					<span>Hanya di SIASN</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'only_siasn' ? 'bg-purple-500 text-white' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'}">
						{stats.only_siasn_count}
					</span>
				</button>
			</div>

			<!-- Search & Sub Filter Bar -->
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
				<div class="relative flex-1 max-w-md">
					<svg class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					<input
						type="text"
						value={searchQuery}
						oninput={handleSearchInput}
						placeholder="Cari NIP, Nama Pegawai, atau Unit Kerja..."
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9.5 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
					/>
				</div>

				<div class="flex items-center gap-2.5">
					<!-- Filter Spesifik Tipe Mismatch (Hanya aktif jika tab mismatch atau all) -->
					{#if activeTab === 'all' || activeTab === 'mismatch'}
						<select
							value={selectedMismatchType}
							onchange={handleMismatchTypeChange}
							class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
						>
							<option value="all">Semua Tipe Selisih</option>
							<option value="golongan">Beda Golongan ({stats.mismatch_breakdown?.golongan || 0})</option>
							<option value="jabatan">Beda Jabatan ({stats.mismatch_breakdown?.jabatan || 0})</option>
							<option value="unor">Beda Unit Kerja ({stats.mismatch_breakdown?.unor || 0})</option>
							<option value="nama">Beda Nama/Gelar ({stats.mismatch_breakdown?.nama || 0})</option>
							<option value="kedudukan">Beda Kedudukan ({stats.mismatch_breakdown?.kedudukan || 0})</option>
						</select>
					{/if}

					<select
						value={limit}
						onchange={handleLimitChange}
						class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
					>
						<option value="15">15 baris</option>
						<option value="25">25 baris</option>
						<option value="50">50 baris</option>
						<option value="100">100 baris</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Table Area -->
		<div class="overflow-x-auto">
			{#if loading}
				<div class="py-16">
					<LoadingState message="Membandingkan data kepegawaian lokal & SIASN BKN..." />
				</div>
			{:else if error}
				<div class="p-6">
					<ErrorState message={error} onRetry={loadData} />
				</div>
			{:else if items.length === 0}
				<div class="py-16">
					<EmptyState message="Tidak ada data matching yang sesuai dengan kriteria filter saat ini." />
				</div>
			{:else}
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
							<th class="py-3 px-3.5 w-12 text-center">No</th>
							<th class="py-3 px-3.5 min-w-[220px]">Pegawai</th>
							<th class="py-3 px-3.5 min-w-[140px]">Golongan</th>
							<th class="py-3 px-3.5 min-w-[200px]">Jabatan</th>
							<th class="py-3 px-3.5 min-w-[200px]">Unit Organisasi (OPD)</th>
							<th class="py-3 px-3.5 min-w-[130px] text-center">Status Matching</th>
							<th class="py-3 px-3.5 w-20 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-normal">
						{#each items as r, index (r.nip)}
							{@const isMatch = r.status === 'match'}
							{@const isMismatch = r.status === 'mismatch'}
							{@const isOnlyLocal = r.status === 'only_local'}
							{@const isOnlySiasn = r.status === 'only_siasn'}
							{@const rowNum = (page - 1) * limit + index + 1}

							<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors group">
								<!-- No -->
								<td class="py-3 px-3.5 text-center text-zinc-400 font-mono">
									{rowNum}
								</td>

								<!-- Pegawai: NIP & Nama (Lokal vs SIASN) -->
								<td class="py-3 px-3.5 space-y-1">
									<div class="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
										{r.nip}
									</div>
									<div class="space-y-0.5">
										<div class="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
											<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">Lokal</span>
											<span class="font-semibold {r.mismatches.includes('nama') ? 'text-amber-700 dark:text-amber-400' : ''}">
												{r.local?.nama_lengkap || '-'}
											</span>
										</div>
										<div class="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
											<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">SIASN</span>
											<span class="{r.mismatches.includes('nama') ? 'text-amber-700 dark:text-amber-400' : ''}">
												{r.siasn?.nama_lengkap || '-'}
											</span>
										</div>
									</div>
								</td>

								<!-- Golongan (Lokal vs SIASN) -->
								<td class="py-3 px-3.5 space-y-1">
									<div class="flex items-center gap-1.5">
										<span class="text-[10px] text-zinc-400">Lokal:</span>
										<span class="font-bold text-zinc-800 dark:text-zinc-200">
											{r.local?.golongan || '-'}
										</span>
									</div>
									<div class="flex items-center gap-1.5">
										<span class="text-[10px] text-zinc-400">SIASN:</span>
										<span class="font-semibold {r.mismatches.includes('golongan') ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 rounded' : 'text-zinc-600 dark:text-zinc-400'}">
											{r.siasn?.golongan || '-'}
										</span>
									</div>
								</td>

								<!-- Jabatan (Lokal vs SIASN) -->
								<td class="py-3 px-3.5 space-y-1">
									<div class="text-zinc-800 dark:text-zinc-200 font-medium">
										<span class="text-[10px] text-zinc-400 block">Lokal:</span>
										<span class="line-clamp-2">{r.local?.jabatan || '-'}</span>
									</div>
									<div class="text-zinc-500 dark:text-zinc-400">
										<span class="text-[10px] text-zinc-400 block">SIASN:</span>
										<span class="line-clamp-2 {r.mismatches.includes('jabatan') ? 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 px-1 rounded' : ''}">
											{r.siasn?.jabatan || '-'}
										</span>
									</div>
								</td>

								<!-- Unit Organisasi (Lokal vs SIASN) -->
								<td class="py-3 px-3.5 space-y-1">
									<div class="text-zinc-800 dark:text-zinc-200 font-medium">
										<span class="text-[10px] text-zinc-400 block">Lokal:</span>
										<span class="line-clamp-2">{r.local?.unor || '-'}</span>
									</div>
									<div class="text-zinc-500 dark:text-zinc-400">
										<span class="text-[10px] text-zinc-400 block">SIASN:</span>
										<span class="line-clamp-2 {r.mismatches.includes('unor') ? 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 px-1 rounded' : ''}">
											{r.siasn?.unor || '-'}
										</span>
									</div>
								</td>

								<!-- Status Matching -->
								<td class="py-3 px-3.5 text-center">
									{#if isMatch}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
											<svg class="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
											Sesuai
										</span>
									{:else if isMismatch}
										<div class="flex flex-col items-center gap-1">
											<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
												<svg class="w-2.5 h-2.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
												Selisih ({r.mismatches.length})
											</span>
											<div class="flex flex-wrap justify-center gap-0.5 max-w-[140px]">
												{#each r.mismatches as m}
													<span class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
														{m}
													</span>
												{/each}
											</div>
										</div>
									{:else if isOnlyLocal}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
											Hanya Lokal
										</span>
									{:else if isOnlySiasn}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80">
											Hanya SIASN
										</span>
									{/if}
								</td>

								<!-- Aksi -->
								<td class="py-3 px-3.5 text-center">
									<button
										type="button"
										onclick={() => openDetailModal(r.nip)}
										class="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
										title="Bandingkan Detail Lengkap"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Pagination Bar -->
		{#if !loading && totalPages > 1}
			<div class="px-4 sm:px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<div>
					Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(page - 1) * limit + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(page * limit, total)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{total}</span> pegawai
				</div>

				<div class="flex items-center gap-1">
					<button
						type="button"
						disabled={page === 1}
						onclick={() => goToPage(1)}
						class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
					>
						«
					</button>

					<button
						type="button"
						disabled={page === 1}
						onclick={() => goToPage(page - 1)}
						class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
					>
						Sebelumnya
					</button>

					<span class="px-3 py-1.5 font-bold text-zinc-900 dark:text-zinc-100">
						Halaman {page} / {totalPages}
					</span>

					<button
						type="button"
						disabled={page === totalPages}
						onclick={() => goToPage(page + 1)}
						class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
					>
						Berikutnya
					</button>

					<button
						type="button"
						disabled={page === totalPages}
						onclick={() => goToPage(totalPages)}
						class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
					>
						»
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Komparasi Side-by-Side Lengkap -->
{#if isDetailOpen}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) closeDetailModal(); }}
	>
		<div class="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
							<span>Komparasi Detail Pegawai</span>
							{#if selectedDetail?.nip}
								<span class="font-mono text-xs px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
									{selectedDetail.nip}
								</span>
							{/if}
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Perbandingan seluruh atribut data database lokal SIPASN vs SIASN BKN
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={closeDetailModal}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
					aria-label="Tutup"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6">
				{#if detailLoading}
					<div class="py-12">
						<LoadingState message="Memuat detail perbandingan atribut..." />
					</div>
				{:else if !selectedDetail}
					<div class="py-12">
						<EmptyState message="Data komparasi tidak ditemukan." />
					</div>
				{:else}
					<!-- Side by Side Legend Header -->
					<div class="grid grid-cols-12 gap-3 mb-3 px-3 py-2 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
						<div class="col-span-3 sm:col-span-3">Nama Atribut</div>
						<div class="col-span-4 sm:col-span-4 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-blue-500"></span>
							Database Lokal (SIPASN)
						</div>
						<div class="col-span-4 sm:col-span-4 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
							Database SIASN (BKN)
						</div>
						<div class="col-span-1 sm:col-span-1 text-center">Status</div>
					</div>

					<!-- Field Rows -->
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
						{#each selectedDetail.fields as f}
							<div class="grid grid-cols-12 gap-3 py-2.5 px-3 items-center rounded-lg transition-colors
								{f.is_same ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30' : 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70'}">
								<!-- Field Label -->
								<div class="col-span-3 sm:col-span-3 font-medium text-zinc-600 dark:text-zinc-400">
									{f.label}
								</div>

								<!-- Local Value -->
								<div class="col-span-4 sm:col-span-4 text-zinc-900 dark:text-zinc-100 font-semibold break-words">
									{f.local || '-'}
								</div>

								<!-- SIASN Value -->
								<div class="col-span-4 sm:col-span-4 text-zinc-800 dark:text-zinc-200 break-words {f.is_same ? '' : 'text-amber-700 dark:text-amber-300 font-semibold'}">
									{f.siasn || '-'}
								</div>

								<!-- Status Badge -->
								<div class="col-span-1 sm:col-span-1 text-center">
									{#if f.is_same}
										<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" title="Sesuai">
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
										</span>
									{:else}
										<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400" title="Berbeda / Selisih">
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end shrink-0">
				<Button variant="secondary" onclick={closeDetailModal} class="text-xs">
					Tutup
				</Button>
			</div>
		</div>
	</div>
{/if}
