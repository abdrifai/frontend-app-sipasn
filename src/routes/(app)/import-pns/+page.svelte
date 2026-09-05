<script>
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore';
	import { onMount } from 'svelte';

	// Active Tab State: 'pegawai', 'rekap', or 'rekap-jenis'
	let activeTab = $state('pegawai');

	// Data states (List Pegawai)
	let pnsList = $state([]);
	let summary = $state({ totalRecords: 0, recentBatches: [] });
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedBatch = $state('');
	let selectedStatus = $state('');
	let page = $state(1);
	let limit = $state(10);
	let totalPages = $state(1);
	let totalRecords = $state(0);

	// Rekap Jabatan states
	let rekapList = $state([]);
	let rekapLoading = $state(false);
	let rekapError = $state(null);
	let rekapSearch = $state('');
	let selectedRekapJenis = $state('');
	let rekapPage = $state(1);
	let rekapLimit = $state(15);
	let rekapTotalPages = $state(1);
	let rekapTotalRecords = $state(0);

	// Rekap Jenis Jabatan states
	let rekapJenisList = $state([]);
	let rekapJenisLoading = $state(false);
	let rekapJenisError = $state(null);
	let rekapJenisSearch = $state('');
	let rekapJenisPage = $state(1);
	let rekapJenisLimit = $state(15);
	let rekapJenisTotalPages = $state(1);
	let rekapJenisTotalRecords = $state(0);
	let rekapJenisOverall = $state(0);

	// Upload states
	let dragOver = $state(false);
	let selectedFile = $state(null);
	let uploadLoading = $state(false);
	let uploadProgress = $state(0);
	let uploadResult = $state(null);

	// Detail modal state
	let showDetailModal = $state(false);
	let activeDetail = $state(null);

	// Delete state
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let isBatchDelete = $state(false);
	let deleteLoading = $state(false);

	async function loadData() {
		loading = true;
		error = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				limit: String(limit),
				search: search.trim(),
				batch_id: selectedBatch,
				status_cpns_pns: selectedStatus
			});

			const [resList, resSummary] = await Promise.all([
				api(`/import-pns?${queryParams.toString()}`),
				api('/import-pns/summary')
			]);

			pnsList = resList.data;
			totalPages = resList.meta.totalPages || 1;
			totalRecords = resList.meta.total || 0;
			summary = resSummary.data || { totalRecords: 0, recentBatches: [] };
		} catch (err) {
			error = err.message || 'Gagal memuat data import PNS';
		} finally {
			loading = false;
		}
	}

	async function loadRekap() {
		rekapLoading = true;
		rekapError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(rekapPage),
				limit: String(rekapLimit),
				search: rekapSearch.trim(),
				batch_id: selectedBatch,
				jenis_jabatan_nama: selectedRekapJenis
			});

			const res = await api(`/import-pns/rekap-jabatan?${queryParams.toString()}`);
			rekapList = res.data || [];
			rekapTotalPages = res.meta.totalPages || 1;
			rekapTotalRecords = res.meta.total || 0;
		} catch (err) {
			rekapError = err.message || 'Gagal memuat rekapitulasi per jabatan';
		} finally {
			rekapLoading = false;
		}
	}


	async function loadRekapJenis() {
		rekapJenisLoading = true;
		rekapJenisError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(rekapJenisPage),
				limit: String(rekapJenisLimit),
				search: rekapJenisSearch.trim(),
				batch_id: selectedBatch
			});

			const res = await api(`/import-pns/rekap-jenis-jabatan?${queryParams.toString()}`);
			rekapJenisList = res.data || [];
			rekapJenisTotalPages = res.meta.totalPages || 1;
			rekapJenisTotalRecords = res.meta.total || 0;
			rekapJenisOverall = res.meta.totalRecordsOverall || 0;
		} catch (err) {
			rekapJenisError = err.message || 'Gagal memuat rekapitulasi jenis jabatan';
		} finally {
			rekapJenisLoading = false;
		}
	}

	onMount(() => {
		loadData();
		loadRekap();
		loadRekapJenis();
	});

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			page = 1;
			loadData();
		}, 300);
	}

	let rekapSearchTimeout;
	function handleRekapSearchInput() {
		clearTimeout(rekapSearchTimeout);
		rekapSearchTimeout = setTimeout(() => {
			rekapPage = 1;
			loadRekap();
		}, 300);
	}

	let rekapJenisSearchTimeout;
	function handleRekapJenisSearchInput() {
		clearTimeout(rekapJenisSearchTimeout);
		rekapJenisSearchTimeout = setTimeout(() => {
			rekapJenisPage = 1;
			loadRekapJenis();
		}, 300);
	}

	function handleFilterChange() {
		page = 1;
		rekapPage = 1;
		rekapJenisPage = 1;
		loadData();
		loadRekap();
		loadRekapJenis();
	}

	function handleFileSelect(e) {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (!file.name.toLowerCase().endsWith('.csv')) {
				toast.error('Format file harus .csv');
				return;
			}
			selectedFile = file;
			uploadResult = null;
		}
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (!file.name.toLowerCase().endsWith('.csv')) {
				toast.error('Format file harus .csv');
				return;
			}
			selectedFile = file;
			uploadResult = null;
		}
	}

	async function handleUpload() {
		if (!selectedFile) {
			toast.error('Pilih file CSV terlebih dahulu');
			return;
		}

		uploadLoading = true;
		uploadProgress = 20;

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);

			const progressTimer = setInterval(() => {
				if (uploadProgress < 90) uploadProgress += 15;
			}, 300);

			const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
			const res = await fetch(`${BASE_URL}/import-pns/upload`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			clearInterval(progressTimer);
			uploadProgress = 100;

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Gagal mengupload CSV');
			}

			uploadResult = data.data;
			toast.success(`Berhasil mengimport ${data.data.insertedCount} data PNS!`);
			selectedFile = null;
			page = 1;
			rekapPage = 1;
			rekapJenisPage = 1;
			await Promise.all([loadData(), loadRekap(), loadRekapJenis()]);
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat import data');
		} finally {
			uploadLoading = false;
		}
	}

	function downloadTemplate() {
		const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
		window.open(`${BASE_URL}/import-pns/template`, '_blank');
	}

	function openDetail(item) {
		activeDetail = item;
		showDetailModal = true;
	}

	function confirmDeleteSingle(item) {
		itemToDelete = item;
		isBatchDelete = false;
		showDeleteConfirm = true;
	}

	function confirmDeleteBatch(batch) {
		itemToDelete = batch;
		isBatchDelete = true;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			if (isBatchDelete) {
				await api(`/import-pns/batch/${itemToDelete.batchId}`, { method: 'DELETE' });
				toast.success(`Batch import file ${itemToDelete.fileName || ''} berhasil dihapus`);
			} else {
				await api(`/import-pns/${itemToDelete.id}`, { method: 'DELETE' });
				toast.success(`Data PNS ${itemToDelete.nama || ''} berhasil dihapus`);
			}
			showDeleteConfirm = false;
			itemToDelete = null;
			await Promise.all([loadData(), loadRekap(), loadRekapJenis()]);
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data');
		} finally {
			deleteLoading = false;
		}
	}

	function filterByJabatan(namaJabatan) {
		search = namaJabatan;
		activeTab = 'pegawai';
		page = 1;
		loadData();
	}

	function filterByJenisJabatan(namaJenisJabatan) {
		search = namaJenisJabatan === 'Tanpa Jenis Jabatan' ? '' : namaJenisJabatan;
		activeTab = 'pegawai';
		page = 1;
		loadData();
	}

	function filterRekapByJenis(namaJenisJabatan) {
		selectedRekapJenis = namaJenisJabatan === 'Tanpa Jenis Jabatan' ? '' : namaJenisJabatan;
		activeTab = 'rekap';
		rekapPage = 1;
		loadRekap();
	}

	function formatStatusText(val) {
		if (!val) return 'PNS';
		const s = String(val).toUpperCase();
		if (s === 'P' || s === 'PNS') return 'PNS';
		if (s === 'C' || s === 'CPNS') return 'CPNS';
		return val;
	}

	function formatDate(str) {
		if (!str) return '-';
		try {
			const d = new Date(str);
			if (isNaN(d.getTime())) return str;
			return new Intl.DateTimeFormat('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(d);
		} catch {
			return str;
		}
	}
</script>

<svelte:head>
	<title>Import & Rekap Data PNS | SIPASN</title>
</svelte:head>

<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
	<!-- Top Banner / Header -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/60">
					Master Data
				</span>
				<span class="text-xs font-semibold text-zinc-400">Pengaturan & Master</span>
			</div>
			<h2 class="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Import & Rekap Data PNS</h2>
			<p class="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide text-sm">
				Unggah file CSV, kelola data master PNS, dan pantau rekapitulasi pegawai per formasi & jenis jabatan secara terpadu.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={downloadTemplate}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-bold transition-all shadow-sm border border-zinc-200/80 dark:border-zinc-700"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600 dark:text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
				Unduh Format CSV
			</button>
			<Button
				variant="secondary"
				onclick={() => { loadData(); loadRekap(); loadRekapJenis(); }}
				class="px-4 py-2.5 rounded-2xl shadow-sm"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={(loading || rekapLoading || rekapJenisLoading) ? 'animate-spin' : ''}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
				Segarkan
			</Button>
		</div>
	</div>

	<!-- Stats & Summary Row -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<!-- Card 1: Total Terimport -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Pegawai</span>
				<div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">{summary.totalRecords.toLocaleString('id-ID')}</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Data PNS yang tersimpan di tabel import</p>
			</div>
		</div>

		<!-- Card 2: Total Formasi Jabatan -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-emerald-100 dark:border-emerald-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Formasi</span>
				<div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-7"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{rekapTotalRecords.toLocaleString('id-ID')}
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Variasi jabatan yang terdata dari CSV</p>
			</div>
		</div>

		<!-- Card 3: Total Jenis Jabatan -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-blue-100 dark:border-blue-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Jenis Jabatan</span>
				<div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{rekapJenisTotalRecords} Jenis
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Fungsional, Pelaksana, Struktural</p>
			</div>
		</div>

		<!-- Card 4: Riwayat Batch -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-amber-100 dark:border-amber-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Sesi</span>
				<div class="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{summary.recentBatches ? summary.recentBatches.length : 0} Batch
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Daftar sesi import aktif di sistem</p>
			</div>
		</div>
	</div>

	<!-- Upload CSV Section -->
	<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
			<div>
				<h3 class="text-lg font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
					<span class="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
					Upload File CSV Baru
				</h3>
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Mendukung otomatis pemisah koma (,) atau pipa (|) standar BKN</p>
			</div>
			{#if summary.recentBatches && summary.recentBatches.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-zinc-500">Filter Batch:</span>
					<select
						bind:value={selectedBatch}
						onchange={handleFilterChange}
						class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Batch ({summary.totalRecords} Data)</option>
						{#each summary.recentBatches as b}
							<option value={b.batchId}>
								{b.fileName || 'CSV'} ({b.count} data - {formatDate(b.createdAt)})
							</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<!-- Dropzone Container -->
		<div
			class="relative rounded-3xl border-2 border-dashed p-8 transition-all duration-300 text-center {dragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-600'}"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => { dragOver = false; }}
			ondrop={handleDrop}
			role="region"
			aria-label="Area drag and drop file CSV"
		>
			<input
				type="file"
				accept=".csv,text/csv"
				id="csv-file-input"
				class="hidden"
				onchange={handleFileSelect}
			/>

			{#if !selectedFile}
				<div class="flex flex-col items-center justify-center space-y-3">
					<div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60 shadow-inner">
						<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
					</div>
					<div>
						<label for="csv-file-input" class="cursor-pointer font-bold text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-4">
							Pilih file CSV
						</label>
						<span class="text-sm font-medium text-zinc-500 dark:text-zinc-400"> atau seret dan letakkan file di sini</span>
					</div>
					<p class="text-xs text-zinc-400 font-medium">Header otomatis disesuaikan dengan 71 kolom data PNS.</p>
				</div>
			{:else}
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-left">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
						</div>
						<div>
							<p class="text-sm font-bold text-zinc-900 dark:text-zinc-50">{selectedFile.name}</p>
							<p class="text-xs font-medium text-zinc-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => { selectedFile = null; }}
							disabled={uploadLoading}
							class="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
						>
							Batal
						</button>
						<Button
							variant="primary"
							loading={uploadLoading}
							onclick={handleUpload}
							class="px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
							Mulai Import Data
						</Button>
					</div>
				</div>
			{/if}

			{#if uploadLoading}
				<div class="mt-4 space-y-2">
					<div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
						<div
							class="bg-indigo-600 h-full rounded-full transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
					<p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
						Memproses dan menyimpan data PNS ke database ({uploadProgress}%)...
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- TAB NAVIGATION -->
	<div class="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-700">
		<button
			type="button"
			onclick={() => { activeTab = 'pegawai'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'pegawai' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			Daftar Data Pegawai ({totalRecords.toLocaleString('id-ID')})
		</button>
		<button
			type="button"
			onclick={() => { activeTab = 'rekap'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'rekap' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
			Rekap per Formasi Jabatan ({rekapTotalRecords.toLocaleString('id-ID')})
		</button>
		<button
			type="button"
			onclick={() => { activeTab = 'rekap-jenis'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'rekap-jenis' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
			Rekap per Jenis Jabatan ({rekapJenisTotalRecords})
		</button>
	</div>

	<!-- TAB 1: DAFTAR DATA PEGAWAI -->
	{#if activeTab === 'pegawai'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Toolbar Filter & Search -->
			<div class="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari NIP, Nama, UNOR, NIK, atau Jabatan..."
						bind:value={search}
						oninput={handleSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<select
						bind:value={selectedStatus}
						onchange={handleFilterChange}
						class="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Status CPNS/PNS</option>
						<option value="PNS">PNS (P)</option>
						<option value="CPNS">CPNS (C)</option>
					</select>

					{#if selectedBatch}
						<button
							type="button"
							onclick={() => {
								const b = summary.recentBatches.find(x => x.batchId === selectedBatch);
								if (b) confirmDeleteBatch(b);
							}}
							class="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
							Hapus Batch Terpilih
						</button>
					{/if}
				</div>
			</div>

			<!-- Data Table -->
			{#if loading}
				<div class="py-20">
					<LoadingState message="Memuat daftar data import PNS..." />
				</div>
			{:else if error}
				<div class="py-12">
					<ErrorState message={error} onRetry={loadData} />
				</div>
			{:else if pnsList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📊"
						message={search || selectedBatch || selectedStatus ? 'Tidak ada data PNS yang sesuai dengan kriteria filter.' : 'Belum ada data PNS yang diimport. Silakan upload file CSV di atas.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-100 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data Pegawai</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Golongan / Jabatan</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden md:table-cell">Unit Organisasi (UNOR)</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden lg:table-cell">Status / TMT</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/40">
							{#each pnsList as item}
								<tr class="group hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- Col 1: Nama & NIP -->
									<td class="px-4 py-4">
										<div class="space-y-1">
											<p class="font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
												{item.gelar_depan ? item.gelar_depan + ' ' : ''}{item.nama || '-'}{item.gelar_belakang ? ', ' + item.gelar_belakang : ''}
											</p>
											<div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
												<span class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
													NIP: {item.nip_baru || '-'}
												</span>
												{#if item.nik}
													<span class="text-zinc-400 text-[11px]">NIK: {item.nik}</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Col 2: Golongan & Jabatan -->
									<td class="px-4 py-4">
										<div class="space-y-1">
											<p class="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
												{item.jabatan_nama || item.jenis_jabatan_nama || '-'}
											</p>
											<div class="flex items-center gap-1.5">
												<Badge variant="indigo">
													Gol: {item.gol_akhir_nama || item.gol_akhir_id || '-'}
												</Badge>
												{#if item.eselon_nama}
													<span class="text-[10px] font-bold text-zinc-400">{item.eselon_nama}</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Col 3: UNOR -->
									<td class="px-4 py-4 hidden md:table-cell">
										<div class="space-y-0.5 max-w-xs">
											<p class="font-bold text-zinc-700 dark:text-zinc-300 text-xs line-clamp-1" title={item.unor_nama}>
												{item.unor_nama || '-'}
											</p>
											<p class="text-[11px] text-zinc-400 line-clamp-1" title={item.instansi_induk_nama}>
												{item.instansi_induk_nama || '-'}
											</p>
										</div>
									</td>

									<!-- Col 4: Status -->
									<td class="px-4 py-4 hidden lg:table-cell">
										<div class="space-y-1">
											<Badge variant={formatStatusText(item.status_cpns_pns) === 'PNS' ? 'emerald' : 'amber'}>
												{formatStatusText(item.status_cpns_pns)}
											</Badge>
											<p class="text-[10px] text-zinc-400 font-medium">
												TMT: {item.tmt_pns || item.tmt_cpns || item.tmt_golongan || '-'}
											</p>
										</div>
									</td>

									<!-- Col 5: Actions -->
									<td class="px-4 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												type="button"
												onclick={() => openDetail(item)}
												class="p-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-indigo-400 text-zinc-600 transition-all font-bold text-xs"
												title="Lihat 71 Atribut Lengkap"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
											</button>
											<button
												type="button"
												onclick={() => confirmDeleteSingle(item)}
												class="p-2 rounded-xl bg-zinc-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-red-400 text-zinc-600 transition-all font-bold text-xs"
												title="Hapus Data"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan baris {(page - 1) * limit + 1} - {Math.min(page * limit, totalRecords)} dari total {totalRecords.toLocaleString('id-ID')} data
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={page <= 1}
							onclick={() => { page -= 1; loadData(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{page} / {totalPages}
						</span>
						<Button
							variant="secondary"
							disabled={page >= totalPages}
							onclick={() => { page += 1; loadData(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- TAB 2: REKAPITULASI PER JABATAN -->
	{#if activeTab === 'rekap'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Rekap Header & Toolbar -->
			<div class="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari nama formasi jabatan..."
						bind:value={rekapSearch}
						oninput={handleRekapSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<select
						bind:value={selectedRekapJenis}
						onchange={() => { rekapPage = 1; loadRekap(); }}
						class="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Jenis Jabatan</option>
						{#if rekapJenisList.length > 0}
							{#each rekapJenisList as j}
								<option value={j.jenis_jabatan_nama}>{j.jenis_jabatan_nama}</option>
							{/each}
						{:else}
							<option value="Jabatan Fungsional">Jabatan Fungsional</option>
							<option value="Jabatan Pelaksana">Jabatan Pelaksana</option>
							<option value="Jabatan Struktural">Jabatan Struktural</option>
							<option value="Jabatan Pimpinan Tinggi">Jabatan Pimpinan Tinggi</option>
						{/if}
					</select>

					{#if selectedRekapJenis}
						<button
							type="button"
							onclick={() => { selectedRekapJenis = ''; rekapPage = 1; loadRekap(); }}
							class="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-all"
							title="Reset Filter Jenis Jabatan"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					{/if}

					<span class="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3.5 py-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-700">
						Total {rekapTotalRecords} Formasi
					</span>
				</div>
			</div>

			<!-- Rekap Table -->
			{#if rekapLoading}
				<div class="py-20">
					<LoadingState message="Menghitung rekapitulasi data per jabatan..." />
				</div>
			{:else if rekapError}
				<div class="py-12">
					<ErrorState message={rekapError} onRetry={loadRekap} />
				</div>
			{:else if rekapList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📑"
						message={rekapSearch ? 'Tidak ada jabatan yang sesuai dengan pencarian.' : 'Belum ada data jabatan yang dapat direkap.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-100 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] w-12 text-center">No</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Nama Jabatan</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Jenis Jabatan</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">PNS</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">CPNS</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Total Pegawai</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/40">
							{#each rekapList as row, index}
								<tr class="group hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- No -->
									<td class="px-4 py-4 text-xs font-mono font-bold text-zinc-400 text-center">
										{(rekapPage - 1) * rekapLimit + index + 1}
									</td>

									<!-- Nama Jabatan -->
									<td class="px-4 py-4">
										<p class="font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">
											{row.jabatan_nama}
										</p>
									</td>

									<!-- Jenis Jabatan -->
									<td class="px-4 py-4">
										<Badge variant="neutral">
											{row.jenis_jabatan_nama || 'Umum'}
										</Badge>
									</td>

									<!-- PNS Count -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
											{row.jumlah_pns}
										</span>
									</td>

									<!-- CPNS Count -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
											{row.jumlah_cpns}
										</span>
									</td>

									<!-- Total Pegawai -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
											{row.total_pegawai} Orang
										</span>
									</td>

									<!-- Aksi: Filter Pegawai -->
									<td class="px-4 py-4 text-right">
										<button
											type="button"
											onclick={() => filterByJabatan(row.jabatan_nama)}
											class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-indigo-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-indigo-600 text-zinc-700 dark:text-zinc-300 transition-all font-bold text-xs shadow-sm"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
											Lihat Pegawai
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer Rekap -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan jabatan {(rekapPage - 1) * rekapLimit + 1} - {Math.min(rekapPage * rekapLimit, rekapTotalRecords)} dari total {rekapTotalRecords.toLocaleString('id-ID')} formasi
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={rekapPage <= 1}
							onclick={() => { rekapPage -= 1; loadRekap(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{rekapPage} / {rekapTotalPages}
						</span>
						<Button
							variant="secondary"
							disabled={rekapPage >= rekapTotalPages}
							onclick={() => { rekapPage += 1; loadRekap(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- TAB 3: REKAPITULASI PER JENIS JABATAN -->
	{#if activeTab === 'rekap-jenis'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Rekap Jenis Header & Visual Distribution Cards -->
			<div class="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari jenis jabatan..."
						bind:value={rekapJenisSearch}
						oninput={handleRekapJenisSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<div class="flex items-center gap-2">
					<span class="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl">
						Total {summary.totalRecords.toLocaleString('id-ID')} Pegawai Terdata
					</span>
				</div>
			</div>

			<!-- Visual Distribution Cards -->
			{#if rekapJenisList.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each rekapJenisList as item}
						<div
							role="button"
							tabindex="0"
							onkeydown={(e) => { if (e.key === 'Enter') filterRekapByJenis(item.jenis_jabatan_nama); }}
							onclick={() => filterRekapByJenis(item.jenis_jabatan_nama)}
							class="p-5 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-3 hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/10 dark:hover:border-indigo-500 transition-all cursor-pointer group"
						>
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{item.jenis_jabatan_nama}</h4>
								<span class="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
									{item.persentase}%
								</span>
							</div>
							
							<!-- Progress bar -->
							<div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
								<div class="bg-indigo-600 h-full rounded-full" style="width: {item.persentase}%"></div>
							</div>

							<div class="flex items-center justify-between text-xs text-zinc-500 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-700/50">
								<span>PNS: <b class="text-emerald-600">{item.jumlah_pns}</b></span>
								<span>CPNS: <b class="text-amber-600">{item.jumlah_cpns}</b></span>
								<span>Total: <b class="text-zinc-900 dark:text-zinc-100">{item.total_pegawai}</b></span>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Rekap Jenis Table -->
			{#if rekapJenisLoading}
				<div class="py-20">
					<LoadingState message="Menghitung rekapitulasi data per jenis jabatan..." />
				</div>
			{:else if rekapJenisError}
				<div class="py-12">
					<ErrorState message={rekapJenisError} onRetry={loadRekapJenis} />
				</div>
			{:else if rekapJenisList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📊"
						message={rekapJenisSearch ? 'Tidak ada jenis jabatan yang cocok dengan pencarian.' : 'Belum ada data jenis jabatan yang dapat direkap.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-100 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] w-12 text-center">No</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Jenis Jabatan</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">PNS</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">CPNS</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Total Pegawai</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Proporsi</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/40">
							{#each rekapJenisList as row, index}
								<tr class="group hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- No -->
									<td class="px-4 py-4 text-xs font-mono font-bold text-zinc-400 text-center">
										{(rekapJenisPage - 1) * rekapJenisLimit + index + 1}
									</td>

									<!-- Nama Jenis Jabatan -->
									<td class="px-4 py-4">
										<p class="font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">
											{row.jenis_jabatan_nama}
										</p>
									</td>

									<!-- PNS Count -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
											{row.jumlah_pns}
										</span>
									</td>

									<!-- CPNS Count -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
											{row.jumlah_cpns}
										</span>
									</td>

									<!-- Total Pegawai -->
									<td class="px-4 py-4 text-center">
										<span class="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
											{row.total_pegawai} Orang
										</span>
									</td>

									<!-- Proporsi -->
									<td class="px-4 py-4 text-center">
										<div class="inline-flex items-center gap-2">
											<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">{row.persentase}%</span>
										</div>
									</td>

									<!-- Aksi -->
									<td class="px-4 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												type="button"
												onclick={() => filterRekapByJenis(row.jenis_jabatan_nama)}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 transition-all font-bold text-xs shadow-sm"
												title="Lihat Formasi Jabatan untuk Kategori Ini"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
												Lihat Formasi
											</button>
											<button
												type="button"
												onclick={() => filterByJenisJabatan(row.jenis_jabatan_nama)}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-800 hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all font-bold text-xs shadow-sm"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
												Lihat Pegawai
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer Rekap Jenis -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan jenis jabatan {(rekapJenisPage - 1) * rekapJenisLimit + 1} - {Math.min(rekapJenisPage * rekapJenisLimit, rekapJenisTotalRecords)} dari total {rekapJenisTotalRecords} kategori
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={rekapJenisPage <= 1}
							onclick={() => { rekapJenisPage -= 1; loadRekapJenis(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{rekapJenisPage} / {rekapJenisTotalPages}
						</span>
						<Button
							variant="secondary"
							disabled={rekapJenisPage >= rekapJenisTotalPages}
							onclick={() => { rekapJenisPage += 1; loadRekapJenis(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Detail 71 Kolom PNS -->
{#if showDetailModal && activeDetail}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full">
							Detail Data Import
						</span>
						<span class="text-xs text-zinc-400 font-mono">ID: {activeDetail.id}</span>
					</div>
					<h3 class="text-xl font-black text-zinc-900 dark:text-zinc-50">
						{activeDetail.gelar_depan ? activeDetail.gelar_depan + ' ' : ''}{activeDetail.nama || '-'}{activeDetail.gelar_belakang ? ', ' + activeDetail.gelar_belakang : ''}
					</h3>
				</div>
				<button
					type="button"
					onclick={() => { showDetailModal = false; }}
					class="p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<!-- Modal Body (71 Attributes grouped) -->
			<div class="p-8 overflow-y-auto space-y-6 text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
				<!-- Group 1: Identitas & Biodata -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">1. Identitas & Biodata</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">PNS ID</span><p class="font-mono text-xs">{activeDetail.pns_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIP Baru</span><p class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{activeDetail.nip_baru || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIP Lama</span><p class="font-mono text-xs">{activeDetail.nip_lama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIK</span><p class="font-mono text-xs">{activeDetail.nik || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tempat Lahir</span><p class="font-medium">{activeDetail.tempat_lahir || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal Lahir</span><p class="font-medium">{activeDetail.tanggal_lahir || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Kelamin</span><p class="font-medium">{activeDetail.jenis_kelamin || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Agama</span><p class="font-medium">{activeDetail.agama_nama || activeDetail.agama_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Status Kawin</span><p class="font-medium">{activeDetail.jenis_kawin_nama || activeDetail.jenis_kawin_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">No HP</span><p class="font-medium">{activeDetail.nomor_hp || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Email</span><p class="font-medium">{activeDetail.email || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Email Gov</span><p class="font-medium">{activeDetail.email_gov || '-'}</p></div>
						<div class="col-span-2 sm:col-span-4"><span class="text-[11px] text-zinc-400 block font-bold">Alamat</span><p class="font-medium">{activeDetail.alamat || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NPWP</span><p class="font-mono text-xs">{activeDetail.npwp_nomor || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">BPJS</span><p class="font-mono text-xs">{activeDetail.bpjs || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Valid NIK / Flag IKD</span><p class="font-medium">{activeDetail.is_valid_nik || '-'} / {activeDetail.flag_ikd || '-'}</p></div>
					</div>
				</div>

				<!-- Group 2: Status & Kepegawaian -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">2. Status & SK Kepegawaian</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Pegawai</span><p class="font-medium">{activeDetail.jenis_pegawai_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Kedudukan PNS</span><p class="font-medium">{activeDetail.kedudukan_pns_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Status CPNS/PNS</span><p class="font-bold text-emerald-600">{formatStatusText(activeDetail.status_cpns_pns)}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Kartu ASN Virtual</span><p class="font-medium">{activeDetail.kartu_asn_virtual || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Nomor SK CPNS</span><p class="font-medium text-xs">{activeDetail.nomor_sk_cpns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal & TMT CPNS</span><p class="font-medium text-xs">{activeDetail.tanggal_sk_cpns || '-'} / {activeDetail.tmt_cpns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Nomor SK PNS</span><p class="font-medium text-xs">{activeDetail.nomor_sk_pns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal & TMT PNS</span><p class="font-medium text-xs">{activeDetail.tanggal_sk_pns || '-'} / {activeDetail.tmt_pns || '-'}</p></div>
					</div>
				</div>

				<!-- Group 3: Pangkat, Golongan & Masa Kerja -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">3. Pangkat, Golongan & Masa Kerja</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Golongan Awal</span><p class="font-medium">{activeDetail.gol_awal_nama || activeDetail.gol_awal_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Golongan Akhir</span><p class="font-medium font-bold text-indigo-600">{activeDetail.gol_akhir_nama || activeDetail.gol_akhir_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">TMT Golongan</span><p class="font-medium">{activeDetail.tmt_golongan || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Masa Kerja (Thn/Bln)</span><p class="font-medium">{activeDetail.mk_tahun || '0'} Thn {activeDetail.mk_bulan || '0'} Bln</p></div>
					</div>
				</div>

				<!-- Group 4: Jabatan & Unit Organisasi -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">4. Jabatan & Unit Organisasi</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Jabatan</span><p class="font-medium">{activeDetail.jenis_jabatan_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Jabatan</span><p class="font-bold text-zinc-900 dark:text-zinc-50">{activeDetail.jabatan_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">TMT Jabatan / Eselon</span><p class="font-medium">{activeDetail.tmt_jabatan || '-'} ({activeDetail.eselon_nama || '-'})</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Unit Organisasi (UNOR)</span><p class="font-semibold">{activeDetail.unor_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">UNOR ID</span><p class="font-mono text-xs">{activeDetail.unor_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Lokasi Kerja</span><p class="font-medium">{activeDetail.lokasi_kerja_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Instansi Induk</span><p class="font-medium">{activeDetail.instansi_induk_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Satuan Kerja Induk</span><p class="font-medium">{activeDetail.satuan_kerja_induk_nama || '-'}</p></div>
					</div>
				</div>

				<!-- Group 5: Pendidikan & Lainnya -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">5. Pendidikan & Arsip CSV</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tingkat Pendidikan</span><p class="font-medium">{activeDetail.tingkat_pendidikan_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Jurusan / Pendidikan</span><p class="font-medium">{activeDetail.pendidikan_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tahun Lulus</span><p class="font-medium">{activeDetail.tahun_lulus || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Sekolah / Universitas</span><p class="font-medium">{activeDetail.nama_sekolah || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">KPKN</span><p class="font-medium">{activeDetail.kpkn_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">File Sumber</span><p class="font-mono text-xs">{activeDetail.file_name || '-'}</p></div>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
				<Button variant="secondary" onclick={() => { showDetailModal = false; }}>
					Tutup
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
{#if showDeleteConfirm}
	<ConfirmModal
		title={isBatchDelete ? 'Hapus Seluruh Batch Import?' : 'Hapus Data PNS Ini?'}
		message={isBatchDelete
			? `Apakah Anda yakin ingin menghapus seluruh data yang diimport dari file "${itemToDelete?.fileName || 'CSV'}"? Semua baris dalam batch ini akan dihapus.`
			: `Apakah Anda yakin ingin menghapus data PNS "${itemToDelete?.nama || ''}" (${itemToDelete?.nip_baru || ''})?`}
		loading={deleteLoading}
		onConfirm={handleDelete}
		onCancel={() => { showDeleteConfirm = false; itemToDelete = null; }}
	/>
{/if}
