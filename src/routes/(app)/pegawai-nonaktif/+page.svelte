<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// State Data
	let pegawaiList = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let downloadingExcel = $state(false);

	// Filter & Search State
	let search = $state('');
	let selectedKedudukan = $state('');
	let selectedGolongan = $state('');
	let page = $state(1);
	let limit = $state(10);
	let total = $state(0);
	let totalPages = $state(1);

	// Summary KPI metrics
	let summary = $state({
		total: 0,
		pensiun_bup: 0,
		pindah_keluar: 0,
		pensiun_janda_duda_dini: 0,
		hukuman_pemberhentian: 0,
		lainnya: 0
	});

	// Opsi Referensi Kedudukan
	let kedudukanOptions = $state([]);

	// Golongan options
	const golonganOptions = [
		{ value: '', label: 'Semua Golongan' },
		{ value: '43', label: 'IV/c - Pembina Utama Muda' },
		{ value: '42', label: 'IV/b - Pembina Tkt I' },
		{ value: '41', label: 'IV/a - Pembina' },
		{ value: '34', label: 'III/d - Penata Tkt I' },
		{ value: '33', label: 'III/c - Penata' },
		{ value: '32', label: 'III/b - Penata Muda Tkt I' },
		{ value: '31', label: 'III/a - Penata Muda' },
		{ value: '24', label: 'II/d - Pengatur Tkt I' },
		{ value: '23', label: 'II/c - Pengatur' },
		{ value: '22', label: 'II/b - Pengatur Muda Tkt I' },
		{ value: '21', label: 'II/a - Pengatur Muda' },
		{ value: '14', label: 'I/d - Juru Tkt I' },
		{ value: '13', label: 'I/c - Juru' },
		{ value: '12', label: 'I/b - Juru Muda Tkt I' },
		{ value: '11', label: 'I/a - Juru Muda' }
	];

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const query = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(search.trim() ? { search: search.trim() } : {}),
				...(selectedKedudukan ? { kedudukanPns_id: selectedKedudukan } : {}),
				...(selectedGolongan ? { gol_id: selectedGolongan } : {})
			});

			const res = await api(`/pegawai/non-aktif?${query.toString()}`);
			pegawaiList = res.data || [];
			total = res.meta?.total || 0;
			totalPages = res.meta?.totalPages || 1;
			if (res.summary) summary = res.summary;
			if (res.kedudukanOptions && res.kedudukanOptions.length > 0) {
				kedudukanOptions = res.kedudukanOptions;
			}
		} catch (err) {
			error = err.message || 'Gagal memuat data pegawai non-aktif';
		} finally {
			loading = false;
		}
	}

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			page = 1;
			loadData();
		}, 300);
	}

	function handleFilterChange() {
		page = 1;
		loadData();
	}

	function resetFilters() {
		search = '';
		selectedKedudukan = '';
		selectedGolongan = '';
		page = 1;
		loadData();
	}

	function setQuickFilterKedudukan(idStr) {
		if (selectedKedudukan === idStr) {
			selectedKedudukan = '';
		} else {
			selectedKedudukan = idStr;
		}
		page = 1;
		loadData();
	}

	async function handleExportExcel() {
		downloadingExcel = true;
		try {
			const query = new URLSearchParams({
				...(search.trim() ? { search: search.trim() } : {}),
				...(selectedKedudukan ? { kedudukanPns_id: selectedKedudukan } : {}),
				...(selectedGolongan ? { gol_id: selectedGolongan } : {})
			});

			const res = await fetch(`${import.meta.env.VITE_API_URL}/pegawai/non-aktif/export/excel?${query.toString()}`, {
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Gagal mengunduh file Excel');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Data_Pegawai_NonAktif_${new Date().toISOString().split('T')[0]}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('Berhasil mengunduh berkas Excel');
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat mengunduh Excel');
		} finally {
			downloadingExcel = false;
		}
	}

	// Helper warna badge status kedudukan
	function getKedudukanBadgeVariant(kId) {
		const id = Number(kId);
		if (id === 2) return 'warning'; // Pensiun Masa Waktu / BUP
		if (id === 6) return 'indigo'; // Pindah Keluar
		if (id === 5 || id === 9 || id === 11) return 'danger'; // Hukuman / Diberhentikan
		if (id === 3 || id === 4) return 'neutral'; // Janda / Duda / Pensiun Dini
		return 'neutral';
	}
</script>

<svelte:head>
	<title>Pegawai Non-Aktif - SIPASN Kab. Tojo Una-Una</title>
</svelte:head>

<div class="space-y-6 animate-in fade-in duration-300 pb-12">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 shadow-xs">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<line x1="17" x2="22" y1="11" y2="11"/>
					</svg>
				</span>
				<div>
					<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
						Pegawai Non-Aktif
					</h1>
					<p class="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
						Pemeriksaan data ASN berstatus pensiun, pindah wilayah, hukuman disiplin, atau pemberhentian
					</p>
				</div>
			</div>
		</div>

		<!-- Action Export -->
		<div class="flex items-center gap-2">
			<Button
				variant="secondary"
				onclick={handleExportExcel}
				loading={downloadingExcel}
				disabled={loading || total === 0}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
					<polyline points="7 10 12 15 17 10"/>
					<line x1="12" x2="12" y1="15" y2="3"/>
				</svg>
				<span>Unduh Excel</span>
			</Button>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
		<!-- Total Non-Aktif -->
		<button
			type="button"
			onclick={() => setQuickFilterKedudukan('')}
			class="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs {selectedKedudukan === '' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white ring-2 ring-indigo-500/40' : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold uppercase tracking-wider {selectedKedudukan === '' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}">
					Total Non-Aktif
				</span>
				<span class="p-1.5 rounded-lg {selectedKedudukan === '' ? 'bg-zinc-800 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</span>
			</div>
			<div class="text-2xl font-black tracking-tight">
				{summary.total.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] {selectedKedudukan === '' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'} mt-1">
				Semua kategori non-aktif
			</div>
		</button>

		<!-- Pensiun BUP (ID 2) -->
		<button
			type="button"
			onclick={() => setQuickFilterKedudukan('2')}
			class="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs {selectedKedudukan === '2' ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400/50' : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-800'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold uppercase tracking-wider {selectedKedudukan === '2' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}">
					Pensiun BUP
				</span>
				<span class="p-1.5 rounded-lg {selectedKedudukan === '2' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'}">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
				</span>
			</div>
			<div class="text-2xl font-black tracking-tight">
				{summary.pensiun_bup.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] {selectedKedudukan === '2' ? 'text-amber-100' : 'text-zinc-400'} mt-1">
				Pensiun Batas Usia
			</div>
		</button>

		<!-- Pindah Keluar (ID 6) -->
		<button
			type="button"
			onclick={() => setQuickFilterKedudukan('6')}
			class="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs {selectedKedudukan === '6' ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/50' : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-800'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold uppercase tracking-wider {selectedKedudukan === '6' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}">
					Pindah Keluar
				</span>
				<span class="p-1.5 rounded-lg {selectedKedudukan === '6' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'}">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
				</span>
			</div>
			<div class="text-2xl font-black tracking-tight">
				{summary.pindah_keluar.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] {selectedKedudukan === '6' ? 'text-indigo-100' : 'text-zinc-400'} mt-1">
				Keluar Instansi Daerah
			</div>
		</button>

		<!-- Janda/Duda & Dini (ID 3, 4) -->
		<button
			type="button"
			onclick={() => setQuickFilterKedudukan('3')}
			class="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs {selectedKedudukan === '3' ? 'bg-violet-600 text-white border-violet-600 ring-2 ring-violet-400/50' : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-800'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold uppercase tracking-wider {selectedKedudukan === '3' ? 'text-violet-100' : 'text-violet-600 dark:text-violet-400'}">
					Janda/Duda/Dini
				</span>
				<span class="p-1.5 rounded-lg {selectedKedudukan === '3' ? 'bg-violet-700 text-white' : 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400'}">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
				</span>
			</div>
			<div class="text-2xl font-black tracking-tight">
				{summary.pensiun_janda_duda_dini.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] {selectedKedudukan === '3' ? 'text-violet-100' : 'text-zinc-400'} mt-1">
				Pensiun Janda / Duda / Dini
			</div>
		</button>

		<!-- Hukuman / Pemberhentian (ID 5, 9, 11) -->
		<button
			type="button"
			onclick={() => setQuickFilterKedudukan('9')}
			class="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs {selectedKedudukan === '9' ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/50' : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold uppercase tracking-wider {selectedKedudukan === '9' ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'}">
					Pemberhentian
				</span>
				<span class="p-1.5 rounded-lg {selectedKedudukan === '9' ? 'bg-rose-700 text-white' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'}">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
				</span>
			</div>
			<div class="text-2xl font-black tracking-tight">
				{summary.hukuman_pemberhentian.toLocaleString('id-ID')}
			</div>
			<div class="text-[10px] {selectedKedudukan === '9' ? 'text-rose-100' : 'text-zinc-400'} mt-1">
				Disiplin & Pemberhentian
			</div>
		</button>
	</div>

	<!-- Filter & Search Controls Card -->
	<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
		<div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
			<!-- Search Input -->
			<div class="md:col-span-6 relative">
				<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</span>
				<input
					type="text"
					bind:value={search}
					oninput={handleSearchInput}
					placeholder="Cari berdasarkan NIP, Nama, atau NIK..."
					class="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
				/>
				{#if search}
					<button
						type="button"
						onclick={() => { search = ''; handleFilterChange(); }}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
						aria-label="Bersihkan pencarian"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				{/if}
			</div>

			<!-- Filter Kedudukan Dropdown -->
			<div class="md:col-span-3">
				<select
					bind:value={selectedKedudukan}
					onchange={handleFilterChange}
					class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
				>
					<option value="">Semua Status Kedudukan</option>
					{#each kedudukanOptions as opt}
						<option value={opt.id.toString()}>{opt.kedudukanpns}</option>
					{/each}
				</select>
			</div>

			<!-- Filter Golongan Dropdown -->
			<div class="md:col-span-2">
				<select
					bind:value={selectedGolongan}
					onchange={handleFilterChange}
					class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
				>
					{#each golonganOptions as g}
						<option value={g.value}>{g.label}</option>
					{/each}
				</select>
			</div>

			<!-- Reset Filter Button -->
			<div class="md:col-span-1 flex justify-end">
				{#if search || selectedKedudukan || selectedGolongan}
					<button
						type="button"
						onclick={resetFilters}
						title="Reset Filter"
						class="w-full h-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition"
					>
						Reset
					</button>
				{/if}
			</div>
		</div>

		<!-- Status Informasi Filter Aktif -->
		{#if selectedKedudukan || selectedGolongan || search}
			<div class="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500">
				<span>Filter aktif:</span>
				{#if search}
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
						Kata kunci: "{search}"
					</span>
				{/if}
				{#if selectedKedudukan}
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
						Kedudukan: {kedudukanOptions.find(k => k.id.toString() === selectedKedudukan)?.kedudukanpns || selectedKedudukan}
					</span>
				{/if}
				{#if selectedGolongan}
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
						Gol: {selectedGolongan}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Data Table Section -->
	<div class="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
		{#if loading}
			<div class="py-16">
				<LoadingState message="Memuat daftar pegawai non-aktif..." />
			</div>
		{:else if error}
			<div class="p-8">
				<ErrorState message={error} onRetry={loadData} />
			</div>
		{:else if pegawaiList.length === 0}
			<div class="py-16">
				<EmptyState
					icon="👤"
					message="Tidak ada data pegawai non-aktif yang sesuai dengan kriteria pencarian."
				/>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
							<th class="px-5 py-3.5 w-12 text-center">No</th>
							<th class="px-5 py-3.5">Pegawai</th>
							<th class="px-5 py-3.5">Status Kedudukan</th>
							<th class="px-5 py-3.5">Pangkat / Gol</th>
							<th class="px-5 py-3.5">Jabatan Terakhir</th>
							<th class="px-5 py-3.5">Unit Kerja Terakhir</th>
							<th class="px-5 py-3.5 text-center w-28">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
						{#each pegawaiList as p, i}
							<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors group">
								<!-- No -->
								<td class="px-5 py-4 text-center text-xs font-semibold text-zinc-400">
									{(page - 1) * limit + i + 1}
								</td>

								<!-- Identitas Pegawai -->
								<td class="px-5 py-4">
									<div class="flex items-center gap-3">
										<Avatar
											src={p.foto && p.foto !== 'default.jpg' ? `${API_BASE}/uploads/foto/${p.foto}` : ''}
											name={p.nama_asli || p.nama}
											size="md"
										/>
										<div class="min-w-0">
											<div class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-xs sm:max-w-md">
												{p.nama}
											</div>
											<div class="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
												<span>NIP: {p.nip}</span>
												{#if p.nik && p.nik !== '-'}
													<span class="text-zinc-300 dark:text-zinc-600">•</span>
													<span>NIK: {p.nik}</span>
												{/if}
											</div>
										</div>
									</div>
								</td>

								<!-- Status Kedudukan -->
								<td class="px-5 py-4">
									<Badge variant={getKedudukanBadgeVariant(p.kedudukanPns_id)}>
										{p.status_kedudukan}
									</Badge>
								</td>

								<!-- Pangkat & Golongan -->
								<td class="px-5 py-4">
									<div class="font-semibold text-zinc-800 dark:text-zinc-200">
										{p.pangkat}
									</div>
									<div class="text-xs text-zinc-500 dark:text-zinc-400">
										Gol. {p.golongan}
									</div>
								</td>

								<!-- Jabatan -->
								<td class="px-5 py-4 max-w-xs">
									<div class="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">
										{p.jabatan}
									</div>
								</td>

								<!-- Unit Kerja -->
								<td class="px-5 py-4 max-w-xs">
									<div class="text-xs text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">
										{p.unit_kerja}
									</div>
								</td>

								<!-- Aksi -->
								<td class="px-5 py-4 text-center">
									<a
										href={`/pegawai/${p.id}`}
										class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-colors"
										title="Buka profil lengkap pegawai"
									>
										<span>Detail</span>
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			<div class="px-5 py-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex flex-col sm:flex-row items-center justify-between gap-4">
				<div class="text-xs text-zinc-500 dark:text-zinc-400">
					Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(page - 1) * limit + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(page * limit, total)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{total.toLocaleString('id-ID')}</span> pegawai
				</div>

				<div class="flex items-center gap-1.5">
					<button
						type="button"
						disabled={page <= 1}
						onclick={() => { page = page - 1; loadData(); }}
						class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Sebelumnya
					</button>

					<span class="px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
						Halaman {page} dari {totalPages}
					</span>

					<button
						type="button"
						disabled={page >= totalPages}
						onclick={() => { page = page + 1; loadData(); }}
						class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Selanjutnya
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
