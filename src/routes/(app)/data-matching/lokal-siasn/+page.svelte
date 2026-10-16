<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import SyncPendidikanModal from '$lib/components/data-matching/SyncPendidikanModal.svelte';

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
			nama: 0,
			status_kepegawaian: 0,
			golongan: 0,
			pendidikan: 0,
			jabatan: 0,
			unit_kerja: 0
		}
	});

	// Label Tipe Mismatch
	const mismatchLabels = {
		nama: 'Nama',
		status_kepegawaian: 'Status PNS/CPNS',
		golongan: 'Golongan',
		pendidikan: 'Pendidikan',
		jabatan: 'Jabatan',
		unit_kerja: 'Unit Kerja',
		unor: 'Unit Kerja',
		status_pns: 'Status PNS/CPNS'
	};

	// State Pagination & Filter
	let page = $state(1);
	let limit = $state(15);
	let totalPages = $state(1);
	let total = $state(0);
	let activeTab = $state('all'); // 'all' | 'match' | 'mismatch' | 'only_local' | 'only_siasn' | 'queue' | 'queue_pendidikan'
	let selectedMismatchType = $state('all'); // 'all' | 'nama' | 'status_kepegawaian' | 'golongan' | 'pendidikan' | 'jabatan' | 'unit_kerja'
	let searchQuery = $state('');
	let debounceTimer = null;

	// State Antrean Upload SK Golongan
	let queueLoading = $state(false);
	let queueError = $state(null);
	let queueItems = $state([]);
	let queueTotal = $state(0);
	let queueTotalPages = $state(1);
	let queuePage = $state(1);
	let queueLimit = $state(15);
	let queueSearch = $state('');
	let queueStatusSk = $state('all'); // 'all' | 'PENDING' | 'UPLOADED'
	let queueStats = $state({ total: 0, pending: 0, uploaded: 0 });
	let queueDebounceTimer = null;

	// State Antrean Upload Ijazah Pendidikan
	let queuePendLoading = $state(false);
	let queuePendError = $state(null);
	let queuePendItems = $state([]);
	let queuePendTotal = $state(0);
	let queuePendTotalPages = $state(1);
	let queuePendPage = $state(1);
	let queuePendLimit = $state(15);
	let queuePendSearch = $state('');
	let queuePendStatusIjazah = $state('all'); // 'all' | 'PENDING' | 'UPLOADED'
	let queuePendStats = $state({ total: 0, pending: 0, uploaded: 0 });
	let queuePendDebounceTimer = null;

	// State Checkbox Selection untuk Bulk Sync Golongan
	let selectedNips = $state([]);
	let eligibleGolonganItems = $derived(items.filter((r) => r.mismatches?.includes('golongan')));
	let isAllSelected = $derived(
		eligibleGolonganItems.length > 0 &&
		eligibleGolonganItems.every((r) => selectedNips.includes(r.nip))
	);

	// State Modal Sync Golongan (Single & Bulk)
	let isSyncConfirmOpen = $state(false);
	let syncLoading = $state(false);
	let syncTargets = $state([]); // [{ nip, nama, gol_lama, gol_baru }]

	// State Modal Sync Pendidikan
	let isSyncPendidikanOpen = $state(false);
	let syncPendidikanNip = $state('');

	// State Modal Upload SK Fisik
	let isUploadModalOpen = $state(false);
	let uploadingSk = $state(false);
	let selectedQueueItem = $state(null);
	let uploadSkNumber = $state('');
	let uploadSkDate = $state('');
	let uploadFile = $state(null);
	let uploadFileError = $state('');

	// State Modal Upload Ijazah Fisik
	let isUploadIjazahModalOpen = $state(false);
	let uploadingIjazah = $state(false);
	let selectedPendQueueItem = $state(null);
	let uploadIjazahNumber = $state('');
	let uploadIjazahDate = $state('');
	let uploadIjazahSekolah = $state('');
	let uploadIjazahFile = $state(null);
	let uploadIjazahFileError = $state('');

	// State Modal Preview PDF
	let isPdfModalOpen = $state(false);
	let previewPdfUrl = $state(null);
	let previewPdfTitle = $state('');

	// State Modal Hapus Antrean Golongan
	let isDeleteModalOpen = $state(false);
	let deletingQueue = $state(false);
	let deleteTargetItem = $state(null);

	// State Modal Hapus Antrean Pendidikan
	let isDeletePendModalOpen = $state(false);
	let deletingPendQueue = $state(false);
	let deleteTargetPendItem = $state(null);

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
			// silent fallback
		}
	}

	async function loadQueueData() {
		queueLoading = true;
		queueError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(queuePage),
				limit: String(queueLimit),
				search: queueSearch.trim(),
				status_sk: queueStatusSk,
			});

			const res = await api(`/data-matching/sync/golongan/queue?${queryParams.toString()}`);
			if (res?.data) {
				queueItems = res.data || [];
				queueTotal = res.meta?.total || 0;
				queueTotalPages = res.meta?.totalPages || 1;
				if (res.meta?.stats) {
					queueStats = res.meta.stats;
				}
			}
		} catch (err) {
			queueError = err.message || 'Gagal memuat antrean upload SK golongan';
			toastStore.error(queueError);
		} finally {
			queueLoading = false;
		}
	}

	async function loadQueueStatsOnly() {
		try {
			const res = await api('/data-matching/sync/golongan/queue?limit=1');
			if (res?.meta?.stats) {
				queueStats = res.meta.stats;
			}
		} catch (err) {
			// silent fallback
		}
	}

	async function loadQueuePendData() {
		queuePendLoading = true;
		queuePendError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(queuePendPage),
				limit: String(queuePendLimit),
				search: queuePendSearch.trim(),
				status_ijazah: queuePendStatusIjazah,
			});

			const res = await api(`/data-matching/sync/pendidikan/queue?${queryParams.toString()}`);
			if (res?.data) {
				queuePendItems = res.data || [];
				queuePendTotal = res.meta?.total || 0;
				queuePendTotalPages = res.meta?.totalPages || 1;
				if (res.meta?.stats) {
					queuePendStats = res.meta.stats;
				}
			}
		} catch (err) {
			queuePendError = err.message || 'Gagal memuat antrean upload ijazah';
			toastStore.error(queuePendError);
		} finally {
			queuePendLoading = false;
		}
	}

	async function loadQueuePendStatsOnly() {
		try {
			const res = await api('/data-matching/sync/pendidikan/queue?limit=1');
			if (res?.meta?.stats) {
				queuePendStats = res.meta.stats;
			}
		} catch (err) {
			// silent fallback
		}
	}

	function handleTabChange(tabKey) {
		activeTab = tabKey;
		if (tabKey === 'queue') {
			queuePage = 1;
			loadQueueData();
			loadQueueStatsOnly();
		} else if (tabKey === 'queue_pendidikan') {
			queuePendPage = 1;
			loadQueuePendData();
			loadQueuePendStatsOnly();
		} else {
			if (tabKey !== 'mismatch') {
				selectedMismatchType = 'all';
			}
			page = 1;
			loadData();
		}
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

	function handleQueueSearchInput(e) {
		queueSearch = e.target.value;
		clearTimeout(queueDebounceTimer);
		queueDebounceTimer = setTimeout(() => {
			queuePage = 1;
			loadQueueData();
		}, 400);
	}

	function handleQueueStatusFilter(status) {
		queueStatusSk = status;
		queuePage = 1;
		loadQueueData();
	}

	function handleQueueLimitChange(e) {
		queueLimit = parseInt(e.target.value, 10) || 15;
		queuePage = 1;
		loadQueueData();
	}

	function goToQueuePage(p) {
		if (p < 1 || p > queueTotalPages || p === queuePage) return;
		queuePage = p;
		loadQueueData();
	}

	function handleQueuePendSearchInput(e) {
		queuePendSearch = e.target.value;
		clearTimeout(queuePendDebounceTimer);
		queuePendDebounceTimer = setTimeout(() => {
			queuePendPage = 1;
			loadQueuePendData();
		}, 400);
	}

	function handleQueuePendStatusFilter(status) {
		queuePendStatusIjazah = status;
		queuePendPage = 1;
		loadQueuePendData();
	}

	function handleQueuePendLimitChange(e) {
		queuePendLimit = parseInt(e.target.value, 10) || 15;
		queuePendPage = 1;
		loadQueuePendData();
	}

	function goToQueuePendPage(p) {
		if (p < 1 || p > queuePendTotalPages || p === queuePendPage) return;
		queuePendPage = p;
		loadQueuePendData();
	}

	// Selection Handlers
	function toggleSelectAll() {
		const eligible = eligibleGolonganItems.map((r) => r.nip);
		if (isAllSelected) {
			selectedNips = selectedNips.filter((n) => !eligible.includes(n));
		} else {
			selectedNips = [...new Set([...selectedNips, ...eligible])];
		}
	}

	function toggleSelectRow(nip) {
		if (selectedNips.includes(nip)) {
			selectedNips = selectedNips.filter((n) => n !== nip);
		} else {
			selectedNips = [...selectedNips, nip];
		}
	}

	// Sync Golongan Actions
	function openSyncSingleModal(r) {
		syncTargets = [
			{
				nip: r.nip,
				nama: r.local?.nama_lengkap || r.siasn?.nama_lengkap || '-',
				gol_lama: r.local?.golongan || '-',
				gol_baru: r.siasn?.golongan || '-',
			},
		];
		isSyncConfirmOpen = true;
	}

	function openSyncBulkModal() {
		const eligible = items.filter((r) => selectedNips.includes(r.nip) && r.siasn?.golongan);
		if (eligible.length === 0) {
			toastStore.warning('Pilih pegawai yang memiliki data selisih golongan dari SIASN');
			return;
		}
		syncTargets = eligible.map((r) => ({
			nip: r.nip,
			nama: r.local?.nama_lengkap || r.siasn?.nama_lengkap || '-',
			gol_lama: r.local?.golongan || '-',
			gol_baru: r.siasn?.golongan || '-',
		}));
		isSyncConfirmOpen = true;
	}

	async function executeSync() {
		if (syncTargets.length === 0) return;
		syncLoading = true;
		try {
			const nips = syncTargets.map((t) => t.nip);
			const res = await api('/data-matching/sync/golongan', {
				method: 'POST',
				body: JSON.stringify({ nips }),
			});

			const result = res?.data || {};
			const successCount = result.successCount || 0;
			const skippedCount = result.skippedCount || 0;
			const failedCount = result.failedCount || 0;

			let msg = `Sinkronisasi selesai: ${successCount} data berhasil disinkronkan`;
			if (skippedCount > 0) msg += `, ${skippedCount} dilewati`;
			if (failedCount > 0) msg += `, ${failedCount} gagal`;

			if (successCount > 0) {
				toastStore.success(msg);
			} else {
				toastStore.warning(msg);
			}

			isSyncConfirmOpen = false;
			syncTargets = [];
			selectedNips = [];

			await Promise.all([loadData(), loadStatsOnly(), loadQueueStatsOnly()]);

			if (isDetailOpen && selectedDetail) {
				openDetailModal(selectedDetail.nip);
			}
		} catch (err) {
			toastStore.error(err.message || 'Gagal melakukan sinkronisasi golongan');
		} finally {
			syncLoading = false;
		}
	}

	// Sync Pendidikan Actions
	function openSyncPendidikanModal(nip) {
		syncPendidikanNip = nip;
		isSyncPendidikanOpen = true;
	}

	async function handleSyncPendidikanSuccess() {
		await Promise.all([loadData(), loadStatsOnly(), loadQueuePendStatsOnly()]);
		if (isDetailOpen && selectedDetail) {
			openDetailModal(selectedDetail.nip);
		}
	}

	// Modal Upload SK
	function openUploadModal(item) {
		selectedQueueItem = item;
		uploadSkNumber = item.sk || '';
		uploadSkDate = item.tglSk ? item.tglSk.split('T')[0] : '';
		uploadFile = null;
		uploadFileError = '';
		isUploadModalOpen = true;
	}

	function closeUploadModal() {
		isUploadModalOpen = false;
		selectedQueueItem = null;
		uploadFile = null;
		uploadFileError = '';
	}

	function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) {
			uploadFile = null;
			return;
		}
		if (file.type !== 'application/pdf') {
			uploadFileError = 'Hanya file format PDF yang diperbolehkan';
			uploadFile = null;
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			uploadFileError = 'Ukuran file melebihi batas 5MB';
			uploadFile = null;
			return;
		}
		uploadFileError = '';
		uploadFile = file;
	}

	async function submitUploadSk() {
		if (!selectedQueueItem) return;
		if (!uploadFile) {
			uploadFileError = 'Silakan pilih berkas PDF SK Golongan';
			return;
		}

		uploadingSk = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			if (uploadSkNumber.trim()) {
				formData.append('sk', uploadSkNumber.trim());
			}
			if (uploadSkDate) {
				formData.append('tglSk', uploadSkDate);
			}

			await api(`/data-matching/sync/golongan/${selectedQueueItem.id}/upload-sk`, {
				method: 'POST',
				body: formData,
			});

			toastStore.success('Berkas fisik SK Golongan berhasil diunggah');
			closeUploadModal();
			loadQueueData();
			loadQueueStatsOnly();
		} catch (err) {
			toastStore.error(err.message || 'Gagal mengunggah berkas SK Golongan');
		} finally {
			uploadingSk = false;
		}
	}

	// Modal Upload Ijazah Fisik
	function openUploadIjazahModal(item) {
		selectedPendQueueItem = item;
		uploadIjazahNumber = item.noIjazah || '';
		uploadIjazahDate = item.tglIjazah ? item.tglIjazah.split('T')[0] : '';
		uploadIjazahSekolah = item.nmSekolah || '';
		uploadIjazahFile = null;
		uploadIjazahFileError = '';
		isUploadIjazahModalOpen = true;
	}

	function closeUploadIjazahModal() {
		isUploadIjazahModalOpen = false;
		selectedPendQueueItem = null;
		uploadIjazahFile = null;
		uploadIjazahFileError = '';
	}

	function handleIjazahFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) {
			uploadIjazahFile = null;
			return;
		}
		if (file.type !== 'application/pdf') {
			uploadIjazahFileError = 'Hanya file format PDF yang diperbolehkan';
			uploadIjazahFile = null;
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			uploadIjazahFileError = 'Ukuran file melebihi batas 5MB';
			uploadIjazahFile = null;
			return;
		}
		uploadIjazahFileError = '';
		uploadIjazahFile = file;
	}

	async function submitUploadIjazah() {
		if (!selectedPendQueueItem) return;
		if (!uploadIjazahFile) {
			uploadIjazahFileError = 'Silakan pilih berkas PDF Ijazah';
			return;
		}

		uploadingIjazah = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadIjazahFile);
			if (uploadIjazahNumber.trim()) {
				formData.append('no_ijazah', uploadIjazahNumber.trim());
			}
			if (uploadIjazahDate) {
				formData.append('tgl_ijazah', uploadIjazahDate);
			}
			if (uploadIjazahSekolah.trim()) {
				formData.append('nm_sekolah', uploadIjazahSekolah.trim());
			}

			await api(`/data-matching/sync/pendidikan/${selectedPendQueueItem.id}/upload-ijazah`, {
				method: 'POST',
				body: formData,
			});

			toastStore.success('Berkas fisik Ijazah berhasil diunggah');
			closeUploadIjazahModal();
			loadQueuePendData();
			loadQueuePendStatsOnly();
		} catch (err) {
			toastStore.error(err.message || 'Gagal mengunggah berkas Ijazah');
		} finally {
			uploadingIjazah = false;
		}
	}

	// Delete Queue Golongan
	function openDeleteModal(item) {
		deleteTargetItem = item;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		deleteTargetItem = null;
	}

	async function confirmDeleteQueue() {
		if (!deleteTargetItem) return;
		deletingQueue = true;
		try {
			await api(`/data-matching/sync/golongan/${deleteTargetItem.id}`, {
				method: 'DELETE',
			});
			toastStore.success('Item antrean upload SK berhasil dihapus');
			closeDeleteModal();
			loadQueueData();
			loadQueueStatsOnly();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus antrean');
		} finally {
			deletingQueue = false;
		}
	}

	// Delete Queue Pendidikan
	function openDeletePendModal(item) {
		deleteTargetPendItem = item;
		isDeletePendModalOpen = true;
	}

	function closeDeletePendModal() {
		isDeletePendModalOpen = false;
		deleteTargetPendItem = null;
	}

	async function confirmDeletePendQueue() {
		if (!deleteTargetPendItem) return;
		deletingPendQueue = true;
		try {
			await api(`/data-matching/sync/pendidikan/${deleteTargetPendItem.id}`, {
				method: 'DELETE',
			});
			toastStore.success('Item antrean upload Ijazah berhasil dihapus');
			closeDeletePendModal();
			loadQueuePendData();
			loadQueuePendStatsOnly();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus antrean Ijazah');
		} finally {
			deletingPendQueue = false;
		}
	}

	// Preview PDF Generic
	function openPdfPreview(item, type = 'SK Golongan') {
		if (!item.dokumen_url) {
			toastStore.warning(`Berkas ${type} belum diunggah untuk pegawai ini`);
			return;
		}
		const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
		previewPdfUrl = `${baseUrl}${item.dokumen_url}`;
		previewPdfTitle = `${type} - ${item.nama} (${item.nip})`;
		isPdfModalOpen = true;
	}

	function closePdfPreview() {
		isPdfModalOpen = false;
		previewPdfUrl = null;
		previewPdfTitle = '';
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
			const isQueueTab = activeTab === 'queue' || activeTab === 'queue_pendidikan';
			const queryParams = new URLSearchParams({
				status: isQueueTab ? 'all' : activeTab,
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
		loadQueueStatsOnly();
		loadQueuePendStatsOnly();
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
				Pencocokan dan perbandingan 6 atribut utama: <strong>Nama, Status Kepegawaian (PNS/CPNS), Golongan, Pendidikan, Jabatan, dan Unit Kerja</strong> antara Database Lokal SIPASN dan SIASN BKN.
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
	{#if activeTab === 'queue'}
		<!-- Metric Antrean Upload SK -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
			<!-- Total Antrean -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">Total Antrean</span>
					<div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{queueStats.total.toLocaleString()}</div>
					<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Pegawai telah disinkronkan</p>
				</div>
			</div>

			<!-- Menunggu Berkas SK -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">Menunggu Berkas SK</span>
					<div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{queueStats.pending.toLocaleString()}</div>
					<p class="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Perlu diunggah dokumen fisik SK</p>
				</div>
			</div>

			<!-- SK Sudah Diunggah -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">SK Sudah Diunggah</span>
					<div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{queueStats.uploaded.toLocaleString()}</div>
					<p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Arsip SK tersimpan di sistem</p>
				</div>
			</div>
		</div>
	{:else if activeTab === 'queue_pendidikan'}
		<!-- Metric Antrean Upload Ijazah -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
			<!-- Total Antrean -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">Total Antrean</span>
					<div class="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{queuePendStats.total.toLocaleString()}</div>
					<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Pegawai disinkronkan pendidikannya</p>
				</div>
			</div>

			<!-- Menunggu Berkas Ijazah -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">Menunggu Berkas Ijazah</span>
					<div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{queuePendStats.pending.toLocaleString()}</div>
					<p class="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Perlu diunggah dokumen fisik Ijazah</p>
				</div>
			</div>

			<!-- Ijazah Sudah Diunggah -->
			<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs flex flex-col justify-between">
				<div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
					<span class="text-[11px] font-semibold uppercase tracking-wider">Ijazah Sudah Diunggah</span>
					<div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{queuePendStats.uploaded.toLocaleString()}</div>
					<p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Arsip Ijazah tersimpan di sistem</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Metric Komparasi 6 Atribut -->
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
					<p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Seluruh 6 atribut selaras</p>
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
					<p class="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Ada perbedaan di 6 atribut</p>
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
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="19" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
					</div>
				</div>
				<div>
					<div class="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.only_siasn_count.toLocaleString()}</div>
					<p class="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">Belum tercatat di SIPASN</p>
				</div>
			</div>
		</div>
	{/if}

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

				<!-- Tab Antrean Upload SK Golongan -->
				<button
					type="button"
					onclick={() => handleTabChange('queue')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'}"
				>
					<span class="flex items-center gap-1.5">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
						<span>Antrean Upload SK Golongan</span>
					</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'queue' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'}">
						{queueStats.pending}
					</span>
				</button>

				<!-- Tab Antrean Upload Ijazah -->
				<button
					type="button"
					onclick={() => handleTabChange('queue_pendidikan')}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{activeTab === 'queue_pendidikan' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-400 border border-zinc-200/80 dark:border-zinc-700 hover:bg-sky-50 dark:hover:bg-sky-950/30'}"
				>
					<span class="flex items-center gap-1.5">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
						<span>Antrean Upload Ijazah</span>
					</span>
					<span class="px-1.5 py-0.5 rounded-md text-[10px] {activeTab === 'queue_pendidikan' ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'}">
						{queuePendStats.pending}
					</span>
				</button>
			</div>

			<!-- Search & Sub Filter Bar -->
			{#if activeTab === 'queue'}
				<!-- Filter Bar khusus Antrean Upload SK -->
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
					<div class="relative flex-1 max-w-md">
						<svg class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							type="text"
							value={queueSearch}
							oninput={handleQueueSearchInput}
							placeholder="Cari NIP, Nama, atau Golongan di antrean..."
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9.5 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
						/>
					</div>

					<div class="flex items-center gap-2.5">
						<select
							value={queueStatusSk}
							onchange={(e) => handleQueueStatusFilter(e.target.value)}
							class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
						>
							<option value="all">Semua Status SK ({queueStats.total})</option>
							<option value="PENDING">Menunggu Upload SK ({queueStats.pending})</option>
							<option value="UPLOADED">SK Sudah Diunggah ({queueStats.uploaded})</option>
						</select>

						<select
							value={queueLimit}
							onchange={handleQueueLimitChange}
							class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
						>
							<option value="15">15 baris</option>
							<option value="25">25 baris</option>
							<option value="50">50 baris</option>
							<option value="100">100 baris</option>
						</select>
					</div>
				</div>
			{:else if activeTab === 'queue_pendidikan'}
				<!-- Filter Bar khusus Antrean Upload Ijazah -->
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
					<div class="relative flex-1 max-w-md">
						<svg class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							type="text"
							value={queuePendSearch}
							oninput={handleQueuePendSearchInput}
							placeholder="Cari NIP, Nama, Jurusan, atau Sekolah di antrean..."
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9.5 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400"
						/>
					</div>

					<div class="flex items-center gap-2.5">
						<select
							value={queuePendStatusIjazah}
							onchange={(e) => handleQueuePendStatusFilter(e.target.value)}
							class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
						>
							<option value="all">Semua Status Ijazah ({queuePendStats.total})</option>
							<option value="PENDING">Menunggu Upload Ijazah ({queuePendStats.pending})</option>
							<option value="UPLOADED">Ijazah Sudah Diunggah ({queuePendStats.uploaded})</option>
						</select>

						<select
							value={queuePendLimit}
							onchange={handleQueuePendLimitChange}
							class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
						>
							<option value="15">15 baris</option>
							<option value="25">25 baris</option>
							<option value="50">50 baris</option>
							<option value="100">100 baris</option>
						</select>
					</div>
				</div>
			{:else}
				<!-- Filter Bar Data Matching Lokal vs SIASN -->
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
					<div class="relative flex-1 max-w-md">
						<svg class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						<input
							type="text"
							value={searchQuery}
							oninput={handleSearchInput}
							placeholder="Cari NIP, Nama, Golongan, Jabatan, Unit Kerja, atau Pendidikan..."
							class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9.5 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
						/>
					</div>

					<div class="flex items-center gap-2.5">
						<!-- Filter Spesifik Tipe Mismatch dari 6 Atribut Utama -->
						{#if activeTab === 'all' || activeTab === 'mismatch'}
							<select
								value={selectedMismatchType}
								onchange={handleMismatchTypeChange}
								class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
							>
								<option value="all">Semua Tipe Selisih</option>
								<option value="nama">Beda Nama ({stats.mismatch_breakdown?.nama || 0})</option>
								<option value="status_kepegawaian">Beda Status PNS/CPNS ({stats.mismatch_breakdown?.status_kepegawaian || 0})</option>
								<option value="golongan">Beda Golongan ({stats.mismatch_breakdown?.golongan || 0})</option>
								<option value="pendidikan">Beda Pendidikan ({stats.mismatch_breakdown?.pendidikan || 0})</option>
								<option value="jabatan">Beda Jabatan ({stats.mismatch_breakdown?.jabatan || 0})</option>
								<option value="unit_kerja">Beda Unit Kerja ({stats.mismatch_breakdown?.unit_kerja || 0})</option>
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

				<!-- Bulk Action Toolbar jika ada pegawai selisih terpilih -->
				{#if selectedNips.length > 0}
					<div class="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-4 py-2.5 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
						<div class="flex items-center gap-2">
							<span class="font-bold">{selectedNips.length} pegawai terpilih</span>
							<span class="text-indigo-400">|</span>
							<button
								type="button"
								onclick={() => { selectedNips = []; }}
								class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
							>
								Batalkan pilihan
							</button>
						</div>
						<Button
							variant="primary"
							onclick={openSyncBulkModal}
							class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
						>
							<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
							<span>Sinkronkan Golongan Terpilih ({selectedNips.length})</span>
						</Button>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Table Area -->
		{#if activeTab === 'queue'}
			<!-- Tampilan Tabel Antrean Upload SK Golongan -->
			<div class="overflow-x-auto">
				{#if queueLoading}
					<div class="py-16">
						<LoadingState message="Memuat daftar antrean upload SK golongan..." />
					</div>
				{:else if queueError}
					<div class="p-6">
						<ErrorState message={queueError} onRetry={loadQueueData} />
					</div>
				{:else if queueItems.length === 0}
					<div class="py-16">
						<EmptyState message="Tidak ada data pegawai dalam antrean upload SK saat ini." />
					</div>
				{:else}
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
								<th class="py-3 px-3 w-10 text-center">No</th>
								<th class="py-3 px-3 min-w-[200px]">Pegawai</th>
								<th class="py-3 px-3 min-w-[140px]">Perubahan Golongan</th>
								<th class="py-3 px-3 min-w-[120px]">TMT Golongan</th>
								<th class="py-3 px-3 min-w-[180px]">Nomor & Tanggal SK</th>
								<th class="py-3 px-3 min-w-[130px] text-center">Status Berkas</th>
								<th class="py-3 px-3 w-28 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-normal">
							{#each queueItems as q, index (q.id)}
								{@const rowNum = (queuePage - 1) * queueLimit + index + 1}
								{@const isUploaded = q.status_sk === 'UPLOADED'}

								<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- No -->
									<td class="py-3 px-3 text-center text-zinc-400 font-mono">{rowNum}</td>

									<!-- Pegawai -->
									<td class="py-3 px-3">
										<div class="font-mono font-bold text-zinc-900 dark:text-zinc-100">{q.nip}</div>
										<div class="text-zinc-700 dark:text-zinc-300 font-medium">{q.nama}</div>
									</td>

									<!-- Perubahan Golongan -->
									<td class="py-3 px-3">
										<div class="flex items-center gap-2">
											<span class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-600 dark:text-zinc-400">
												{q.gol_lama || '-'}
											</span>
											<svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
											<span class="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300">
												{q.gol_baru}
											</span>
										</div>
									</td>

									<!-- TMT Golongan -->
									<td class="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-medium">
										{q.tmt_golongan ? new Date(q.tmt_golongan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
									</td>

									<!-- Nomor & Tgl SK -->
									<td class="py-3 px-3 space-y-0.5">
										<div class="font-medium text-zinc-800 dark:text-zinc-200">
											{q.sk || '-'}
										</div>
										{#if q.tglSk}
											<div class="text-[10px] text-zinc-400">
												Tgl: {new Date(q.tglSk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
											</div>
										{/if}
									</td>

									<!-- Status Berkas -->
									<td class="py-3 px-3 text-center">
										{#if isUploaded}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
												<svg class="w-2.5 h-2.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
												Sudah Diunggah
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
												<svg class="w-2.5 h-2.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
												Menunggu SK
											</span>
										{/if}
									</td>

									<!-- Aksi -->
									<td class="py-3 px-3 text-center">
										<div class="flex items-center justify-center gap-1">
											<button
												type="button"
												onclick={() => openUploadModal(q)}
												class="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
												title={isUploaded ? "Unggah Ulang SK" : "Unggah Berkas SK"}
											>
												<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
											</button>

											{#if q.dokumen_url}
												<button
													type="button"
													onclick={() => openPdfPreview(q)}
													class="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
													title="Lihat Pratinjau Dokumen SK"
												>
													<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
												</button>
											{/if}

											<button
												type="button"
												onclick={() => openDeleteModal(q)}
												class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
												title="Hapus dari Antrean"
											>
												<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Queue Pagination -->
			{#if !queueLoading && queueTotalPages > 1}
				<div class="px-4 sm:px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<div>
						Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(queuePage - 1) * queueLimit + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(queuePage * queueLimit, queueTotal)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{queueTotal}</span> item antrean
					</div>
					<div class="flex items-center gap-1">
						<button type="button" disabled={queuePage === 1} onclick={() => goToQueuePage(1)} class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">«</button>
						<button type="button" disabled={queuePage === 1} onclick={() => goToQueuePage(queuePage - 1)} class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">Sebelumnya</button>
						<span class="px-3 py-1.5 font-bold text-zinc-900 dark:text-zinc-100">Halaman {queuePage} / {queueTotalPages}</span>
						<button type="button" disabled={queuePage === queueTotalPages} onclick={() => goToQueuePage(queuePage + 1)} class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">Berikutnya</button>
						<button type="button" disabled={queuePage === queueTotalPages} onclick={() => goToQueuePage(queueTotalPages)} class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">»</button>
					</div>
				</div>
			{/if}
		{:else if activeTab === 'queue_pendidikan'}
			<!-- Tampilan Tabel Antrean Upload Ijazah Pendidikan -->
			<div class="overflow-x-auto">
				{#if queuePendLoading}
					<div class="py-16">
						<LoadingState message="Memuat daftar antrean upload berkas ijazah..." />
					</div>
				{:else if queuePendError}
					<div class="p-6">
						<ErrorState message={queuePendError} onRetry={loadQueuePendData} />
					</div>
				{:else if queuePendItems.length === 0}
					<div class="py-16">
						<EmptyState message="Tidak ada data pegawai dalam antrean upload ijazah saat ini." />
					</div>
				{:else}
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
								<th class="py-3 px-3 w-10 text-center">No</th>
								<th class="py-3 px-3 min-w-[200px]">Pegawai</th>
								<th class="py-3 px-3 min-w-[220px]">Perubahan Pendidikan</th>
								<th class="py-3 px-3 min-w-[150px]">Tahun / Sekolah</th>
								<th class="py-3 px-3 min-w-[180px]">Nomor & Tanggal Ijazah</th>
								<th class="py-3 px-3 min-w-[130px] text-center">Status Berkas</th>
								<th class="py-3 px-3 w-28 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-normal">
							{#each queuePendItems as q, index (q.id)}
								{@const rowNum = (queuePendPage - 1) * queuePendLimit + index + 1}
								{@const isUploaded = q.status_ijazah === 'UPLOADED'}

								<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- No -->
									<td class="py-3 px-3 text-center text-zinc-400 font-mono">{rowNum}</td>

									<!-- Pegawai -->
									<td class="py-3 px-3">
										<div class="font-mono font-bold text-zinc-900 dark:text-zinc-100">{q.nip}</div>
										<div class="text-zinc-700 dark:text-zinc-300 font-medium">{q.nama}</div>
									</td>

									<!-- Perubahan Pendidikan -->
									<td class="py-3 px-3 space-y-1">
										<div class="flex items-center gap-1.5 text-zinc-500">
											<span class="text-[10px] text-zinc-400">Lama:</span>
											<span class="line-clamp-1">{q.pend_lama || '-'}</span>
										</div>
										<div class="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-semibold">
											<span class="text-[10px] text-sky-600 font-bold">Baru:</span>
											<span class="line-clamp-1">{q.pend_baru}</span>
											{#if q.tkt_pend_baru}
												<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
													{q.tkt_pend_baru}
												</span>
											{/if}
										</div>
									</td>

									<!-- Tahun / Sekolah -->
									<td class="py-3 px-3 space-y-0.5">
										<div class="font-medium text-zinc-800 dark:text-zinc-200">
											{q.nmSekolah || '-'}
										</div>
										{#if q.thn_lulus}
											<div class="text-[10px] text-zinc-400">
												Lulus: {q.thn_lulus}
											</div>
										{/if}
									</td>

									<!-- Nomor & Tgl Ijazah -->
									<td class="py-3 px-3 space-y-0.5">
										<div class="font-medium text-zinc-800 dark:text-zinc-200">
											{q.noIjazah || '-'}
										</div>
										{#if q.tglIjazah}
											<div class="text-[10px] text-zinc-400">
												Tgl: {new Date(q.tglIjazah).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
											</div>
										{/if}
									</td>

									<!-- Status Berkas -->
									<td class="py-3 px-3 text-center">
										{#if isUploaded}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
												<svg class="w-2.5 h-2.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
												Sudah Diunggah
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
												<svg class="w-2.5 h-2.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
												Menunggu Ijazah
											</span>
										{/if}
									</td>

									<!-- Aksi -->
									<td class="py-3 px-3 text-center">
										<div class="flex items-center justify-center gap-1">
											<button
												type="button"
												onclick={() => openUploadIjazahModal(q)}
												class="p-1.5 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors cursor-pointer"
												title={isUploaded ? "Unggah Ulang Ijazah" : "Unggah Berkas Ijazah"}
											>
												<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
											</button>

											{#if q.dokumen_url}
												<button
													type="button"
													onclick={() => openPdfPreview(q, 'Ijazah')}
													class="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
													title="Lihat Pratinjau Dokumen Ijazah"
												>
													<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
												</button>
											{/if}

											<button
												type="button"
												onclick={() => openDeletePendModal(q)}
												class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
												title="Hapus dari Antrean"
											>
												<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Queue Pendidikan Pagination -->
			{#if !queuePendLoading && queuePendTotalPages > 1}
				<div class="px-4 sm:px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<div>
						Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(queuePendPage - 1) * queuePendLimit + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(queuePendPage * queuePendLimit, queuePendTotal)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{queuePendTotal}</span> item antrean
					</div>
					<div class="flex items-center gap-1">
						<button type="button" disabled={queuePendPage === 1} onclick={() => goToQueuePendPage(1)} class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">«</button>
						<button type="button" disabled={queuePendPage === 1} onclick={() => goToQueuePendPage(queuePendPage - 1)} class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">Sebelumnya</button>
						<span class="px-3 py-1.5 font-bold text-zinc-900 dark:text-zinc-100">Halaman {queuePendPage} / {queuePendTotalPages}</span>
						<button type="button" disabled={queuePendPage === queuePendTotalPages} onclick={() => goToQueuePendPage(queuePendPage + 1)} class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">Berikutnya</button>
						<button type="button" disabled={queuePendPage === queuePendTotalPages} onclick={() => goToQueuePendPage(queuePendTotalPages)} class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">»</button>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Tampilan Tabel Data Matching Lokal vs SIASN -->
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
								<th class="py-3 px-2 w-8 text-center">
									<input
										type="checkbox"
										checked={isAllSelected}
										onchange={toggleSelectAll}
										disabled={eligibleGolonganItems.length === 0}
										class="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
										title="Pilih Semua yang Selisih Golongan"
									/>
								</th>
								<th class="py-3 px-3 w-10 text-center">No</th>
								<th class="py-3 px-3 min-w-[200px]">Pegawai</th>
								<th class="py-3 px-3 min-w-[120px]">Status</th>
								<th class="py-3 px-3 min-w-[110px]">Golongan</th>
								<th class="py-3 px-3 min-w-[170px]">Pendidikan</th>
								<th class="py-3 px-3 min-w-[170px]">Jabatan</th>
								<th class="py-3 px-3 min-w-[170px]">Unit Kerja</th>
								<th class="py-3 px-3 min-w-[130px] text-center">Status Matching</th>
								<th class="py-3 px-3 w-20 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-normal">
							{#each items as r, index (r.nip)}
								{@const isMatch = r.status === 'match'}
								{@const isMismatch = r.status === 'mismatch'}
								{@const isOnlyLocal = r.status === 'only_local'}
								{@const isOnlySiasn = r.status === 'only_siasn'}
								{@const hasGolMismatch = r.mismatches?.includes('golongan')}
								{@const hasPendMismatch = r.mismatches?.includes('pendidikan') && r.siasn?.pendidikan}
								{@const rowNum = (page - 1) * limit + index + 1}

								<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors group {selectedNips.includes(r.nip) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}">
									<!-- Checkbox -->
									<td class="py-3 px-2 text-center">
										{#if hasGolMismatch}
											<input
												type="checkbox"
												checked={selectedNips.includes(r.nip)}
												onchange={() => toggleSelectRow(r.nip)}
												class="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
												title="Pilih untuk sinkronisasi golongan"
											/>
										{:else}
											<span class="text-zinc-200 dark:text-zinc-700">-</span>
										{/if}
									</td>

									<!-- No -->
									<td class="py-3 px-3 text-center text-zinc-400 font-mono">
										{rowNum}
									</td>

									<!-- 1. Pegawai: NIP & Nama (Lokal vs SIASN) -->
									<td class="py-3 px-3 space-y-1">
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

									<!-- 2. Status Kepegawaian (PNS / CPNS) -->
									<td class="py-3 px-3 space-y-1">
										<div class="flex items-center gap-1.5">
											<span class="text-[10px] text-zinc-400">Lokal:</span>
											<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold {r.local?.status_kepegawaian === 'CPNS' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'}">
												{r.local?.status_kepegawaian || '-'}
											</span>
										</div>
										<div class="flex items-center gap-1.5">
											<span class="text-[10px] text-zinc-400">SIASN:</span>
											<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold {r.mismatches.includes('status_kepegawaian') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 ring-1 ring-rose-400' : (r.siasn?.status_kepegawaian === 'CPNS' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300')}">
												{r.siasn?.status_kepegawaian || '-'}
											</span>
										</div>
									</td>

									<!-- 3. Golongan (Lokal vs SIASN) -->
									<td class="py-3 px-3 space-y-1">
										<div class="flex items-center gap-1.5">
											<span class="text-[10px] text-zinc-400">Lokal:</span>
											<span class="font-bold text-zinc-800 dark:text-zinc-200">
												{r.local?.golongan || '-'}
											</span>
										</div>
										<div class="flex items-center gap-1.5">
											<span class="text-[10px] text-zinc-400">SIASN:</span>
											<span class="font-semibold {hasGolMismatch ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 rounded' : 'text-zinc-600 dark:text-zinc-400'}">
												{r.siasn?.golongan || '-'}
											</span>
										</div>
									</td>

									<!-- 4. Pendidikan (Lokal vs SIASN) -->
									<td class="py-3 px-3 space-y-1">
										<div class="text-zinc-800 dark:text-zinc-200 font-medium">
											<span class="text-[10px] text-zinc-400 block">Lokal:</span>
											<span class="line-clamp-2">{r.local?.pendidikan || '-'}</span>
										</div>
										<div class="text-zinc-500 dark:text-zinc-400">
											<span class="text-[10px] text-zinc-400 block">SIASN:</span>
											<span class="line-clamp-2 {r.mismatches.includes('pendidikan') ? 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 px-1 rounded' : ''}">
												{r.siasn?.pendidikan || '-'}
											</span>
										</div>
									</td>

									<!-- 5. Jabatan (Lokal vs SIASN) -->
									<td class="py-3 px-3 space-y-1">
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

									<!-- 6. Unit Kerja (Lokal vs SIASN) -->
									<td class="py-3 px-3 space-y-1">
										<div class="text-zinc-800 dark:text-zinc-200 font-medium">
											<span class="text-[10px] text-zinc-400 block">Lokal:</span>
											<span class="line-clamp-2">{r.local?.unit_kerja || r.local?.unor || '-'}</span>
										</div>
										<div class="text-zinc-500 dark:text-zinc-400">
											<span class="text-[10px] text-zinc-400 block">SIASN:</span>
											<span class="line-clamp-2 {r.mismatches.includes('unit_kerja') ? 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 px-1 rounded' : ''}">
												{r.siasn?.unit_kerja || r.siasn?.unor || '-'}
											</span>
										</div>
									</td>

									<!-- Status Matching -->
									<td class="py-3 px-3 text-center">
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
												<div class="flex flex-wrap justify-center gap-0.5 max-w-[150px]">
													{#each r.mismatches as m}
														<span class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
															{mismatchLabels[m] || m}
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
									<td class="py-3 px-3 text-center">
										<div class="flex items-center justify-center gap-1">
											{#if hasGolMismatch}
												<button
													type="button"
													onclick={() => openSyncSingleModal(r)}
													class="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
													title="Sinkronkan Golongan SIASN ke Database Lokal"
												>
													<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
												</button>
											{/if}

											{#if hasPendMismatch}
												<button
													type="button"
													onclick={() => openSyncPendidikanModal(r.nip)}
													class="p-1.5 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors cursor-pointer"
													title="Sinkronkan Pendidikan SIASN ke Database Lokal"
												>
													<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
												</button>
											{/if}

											<button
												type="button"
												onclick={() => openDetailModal(r.nip)}
												class="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
												title="Bandingkan Detail Lengkap"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
											</button>
										</div>
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
							Perbandingan 6 atribut data kepegawaian antara Database Lokal SIPASN vs SIASN BKN
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
					<!-- Banner Sinkronisasi Golongan jika terdapat perbedaan -->
					{#if selectedDetail.fields?.find((f) => (f.key === 'golongan' || f.label === 'Golongan') && !f.is_same)}
						{@const golField = selectedDetail.fields.find((f) => f.key === 'golongan' || f.label === 'Golongan')}
						<div class="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
							<div class="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
								<div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
								</div>
								<div>
									<div class="font-bold">Perbedaan Data Pangkat / Golongan Terdeteksi</div>
									<div class="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
										Lokal: <span class="font-semibold">{golField.local || '-'}</span> → SIASN: <span class="font-bold text-amber-900 dark:text-amber-100">{golField.siasn || '-'}</span>. Anda dapat langsung memindahkan data ini ke database lokal.
									</div>
								</div>
							</div>
							<Button
								variant="primary"
								onclick={() => {
									closeDetailModal();
									openSyncSingleModal({
										nip: selectedDetail.nip,
										local: {
											nama_lengkap: selectedDetail.fields?.find((f) => f.key === 'nama' || f.label === 'Nama')?.local,
											golongan: golField.local,
										},
										siasn: {
											nama_lengkap: selectedDetail.fields?.find((f) => f.key === 'nama' || f.label === 'Nama')?.siasn,
											golongan: golField.siasn,
										},
									});
								}}
								class="text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0 flex items-center gap-1.5"
							>
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
								<span>Sinkronkan Golongan</span>
							</Button>
						</div>
					{/if}

					<!-- Banner Sinkronisasi Pendidikan jika terdapat perbedaan -->
					{#if selectedDetail.fields?.find((f) => (f.key === 'pendidikan' || f.label === 'Pendidikan') && !f.is_same)}
						{@const pendField = selectedDetail.fields.find((f) => f.key === 'pendidikan' || f.label === 'Pendidikan')}
						<div class="mb-4 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
							<div class="flex items-center gap-2.5 text-sky-900 dark:text-sky-200">
								<div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
								</div>
								<div>
									<div class="font-bold">Perbedaan Data Pendidikan Terdeteksi</div>
									<div class="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
										Lokal: <span class="font-semibold">{pendField.local || '-'}</span> → SIASN: <span class="font-bold text-sky-900 dark:text-sky-100">{pendField.siasn || '-'}</span>. Anda dapat menyinkronkan data ini beserta master referensi lokal.
									</div>
								</div>
							</div>
							<Button
								variant="primary"
								onclick={() => {
									openSyncPendidikanModal(selectedDetail.nip);
								}}
								class="text-xs bg-sky-600 hover:bg-sky-700 text-white shrink-0 flex items-center gap-1.5"
							>
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
								<span>Sinkronkan Pendidikan</span>
							</Button>
						</div>
					{/if}

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

<!-- 1. Modal Konfirmasi Sinkronisasi Golongan (Single & Bulk) -->
{#if isSyncConfirmOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget && !syncLoading) isSyncConfirmOpen = false; }}
	>
		<div class="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
							Konfirmasi Sinkronisasi Golongan
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Pindahkan data selisih golongan dari SIASN ke database lokal
						</p>
					</div>
				</div>
				<button
					type="button"
					disabled={syncLoading}
					onclick={() => { isSyncConfirmOpen = false; }}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer disabled:opacity-40"
					aria-label="Tutup"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-5 space-y-4 text-xs">
				<p class="text-zinc-600 dark:text-zinc-300">
					Apakah Anda yakin ingin memproses sinkronisasi data pangkat / golongan untuk <strong>{syncTargets.length} pegawai</strong> berikut?
				</p>

				<!-- Daftar Pegawai Sasaran -->
				<div class="max-h-56 overflow-y-auto space-y-2 pr-1">
					{#each syncTargets as t}
						<div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between gap-3">
							<div>
								<div class="font-bold text-zinc-900 dark:text-zinc-100">{t.nama}</div>
								<div class="font-mono text-[11px] text-zinc-500">{t.nip}</div>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<span class="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300">
									{t.gol_lama}
								</span>
								<svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
								<span class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 font-bold text-amber-700 dark:text-amber-300">
									{t.gol_baru}
								</span>
							</div>
						</div>
					{/each}
				</div>

				<!-- Info Alur Proses -->
				<div class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 space-y-1">
					<div class="font-bold flex items-center gap-1.5">
						<svg class="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
						<span>Alur yang akan dijalankan secara otomatis:</span>
					</div>
					<ol class="list-decimal list-inside space-y-0.5 pl-1 text-[11px] text-blue-800 dark:text-blue-300">
						<li>Menambahkan riwayat golongan baru ke data riwayat pegawai (<code>rwt_gol</code>).</li>
						<li>Memperbarui status golongan aktif pegawai pada database lokal.</li>
						<li>Memasukkan pegawai ke <strong>Antrean Upload SK Golongan</strong> untuk mempermudah pengunggahan berkas fisik SK.</li>
					</ol>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-2.5 shrink-0">
				<Button
					variant="secondary"
					disabled={syncLoading}
					onclick={() => { isSyncConfirmOpen = false; }}
					class="text-xs"
				>
					Batal
				</Button>

				<Button
					variant="primary"
					loading={syncLoading}
					onclick={executeSync}
					class="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
					<span>Ya, Sinkronkan Data</span>
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- 2. Modal Unggah Berkas Fisik SK Golongan -->
{#if isUploadModalOpen && selectedQueueItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget && !uploadingSk) closeUploadModal(); }}
	>
		<div class="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
							Unggah Berkas Fisik SK Golongan
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Simpan dokumen SK resmi untuk riwayat pangkat pegawai
						</p>
					</div>
				</div>
				<button
					type="button"
					disabled={uploadingSk}
					onclick={closeUploadModal}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer disabled:opacity-40"
					aria-label="Tutup"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body Form -->
			<form onsubmit={(e) => { e.preventDefault(); submitUploadSk(); }} class="p-5 space-y-4 text-xs">
				<!-- Ringkasan Pegawai -->
				<div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between gap-3">
					<div>
						<div class="font-bold text-zinc-900 dark:text-zinc-100">{selectedQueueItem.nama}</div>
						<div class="font-mono text-[11px] text-zinc-500">{selectedQueueItem.nip}</div>
					</div>
					<div class="text-right">
						<span class="inline-flex px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300">
							Golongan: {selectedQueueItem.gol_baru}
						</span>
						<div class="text-[10px] text-zinc-400 mt-0.5">
							TMT: {selectedQueueItem.tmt_golongan ? new Date(selectedQueueItem.tmt_golongan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
						</div>
					</div>
				</div>

				<!-- Nomor SK -->
				<div class="space-y-1">
					<label for="sk_nomor" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Nomor SK Golongan
					</label>
					<input
						id="sk_nomor"
						type="text"
						bind:value={uploadSkNumber}
						placeholder="Contoh: 821.2/104/BKPSDMD-B.TU/2024"
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
					/>
				</div>

				<!-- Tanggal SK -->
				<div class="space-y-1">
					<label for="sk_tgl" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Tanggal SK
					</label>
					<input
						id="sk_tgl"
						type="date"
						bind:value={uploadSkDate}
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
					/>
				</div>

				<!-- Upload File PDF -->
				<div class="space-y-1.5">
					<label for="sk_file" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Berkas Fisik Dokumen SK <span class="text-rose-500">*</span>
					</label>
					<input
						id="sk_file"
						type="file"
						accept="application/pdf"
						onchange={handleFileChange}
						class="w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300 cursor-pointer border border-zinc-200 dark:border-zinc-700 rounded-xl p-1"
					/>
					<p class="text-[10px] text-zinc-400">
						Wajib format <strong>PDF</strong> dengan ukuran maksimal 5 MB.
					</p>
					{#if uploadFileError}
						<p class="text-[11px] text-rose-500 font-medium">{uploadFileError}</p>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2.5">
					<Button
						variant="secondary"
						disabled={uploadingSk}
						onclick={closeUploadModal}
						class="text-xs"
					>
						Batal
					</Button>

					<Button
						type="submit"
						variant="primary"
						loading={uploadingSk}
						class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
						<span>Unggah & Simpan SK</span>
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 3. Modal Konfirmasi Hapus Antrean -->
{#if isDeleteModalOpen && deleteTargetItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget && !deletingQueue) closeDeleteModal(); }}
	>
		<div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<div class="p-5 space-y-3 text-xs">
				<div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</div>
				<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
					Hapus dari Antrean Upload SK?
				</h3>
				<p class="text-zinc-600 dark:text-zinc-400">
					Pegawai <strong>{deleteTargetItem.nama}</strong> ({deleteTargetItem.nip}) akan dihapus dari antrean pengunggahan berkas SK.
				</p>
				<p class="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-700">
					Catatan: Data riwayat golongan yang sudah disinkronkan tetap tersimpan pada data riwayat pegawai di database lokal.
				</p>
			</div>

			<div class="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-2.5">
				<Button
					variant="secondary"
					disabled={deletingQueue}
					onclick={closeDeleteModal}
					class="text-xs"
				>
					Batal
				</Button>
				<Button
					variant="danger"
					loading={deletingQueue}
					onclick={confirmDeleteQueue}
					class="text-xs bg-rose-600 hover:bg-rose-700 text-white"
				>
					Hapus dari Antrean
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- 4. Modal Pratinjau Dokumen PDF SK -->
{#if isPdfModalOpen && previewPdfUrl}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) closePdfPreview(); }}
	>
		<div class="w-full max-w-4xl h-[88vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<!-- Header -->
			<div class="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
						<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
					</div>
					<div>
						<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							{previewPdfTitle}
						</h3>
						<p class="text-[11px] text-zinc-500">Pratinjau berkas fisik SK Golongan</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<a
						href={previewPdfUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-1.5"
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						<span>Buka di Tab Baru</span>
					</a>
					<button
						type="button"
						onclick={closePdfPreview}
						class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
						aria-label="Tutup"
					>
						<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				</div>
			</div>

			<!-- PDF Iframe Container -->
			<div class="flex-1 bg-zinc-100 dark:bg-zinc-950 p-2 relative">
				<iframe
					src={previewPdfUrl}
					title="Dokumen SK Golongan"
					class="w-full h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white"
				></iframe>
			</div>
		</div>
	</div>
{/if}

<!-- 5. Modal Konfirmasi & Pemilihan Referensi Sinkronisasi Pendidikan -->
<SyncPendidikanModal
	open={isSyncPendidikanOpen}
	nip={syncPendidikanNip}
	onClose={() => { isSyncPendidikanOpen = false; syncPendidikanNip = ''; }}
	onSuccess={handleSyncPendidikanSuccess}
/>

<!-- 6. Modal Unggah Berkas Fisik Ijazah Pendidikan -->
{#if isUploadIjazahModalOpen && selectedPendQueueItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget && !uploadingIjazah) closeUploadIjazahModal(); }}
	>
		<div class="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
							Unggah Berkas Fisik Ijazah
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Simpan scan dokumen Ijazah resmi untuk riwayat pendidikan pegawai
						</p>
					</div>
				</div>
				<button
					type="button"
					disabled={uploadingIjazah}
					onclick={closeUploadIjazahModal}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer disabled:opacity-40"
					aria-label="Tutup"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body Form -->
			<form onsubmit={(e) => { e.preventDefault(); submitUploadIjazah(); }} class="p-5 space-y-4 text-xs">
				<!-- Ringkasan Pegawai -->
				<div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between gap-3">
					<div>
						<div class="font-bold text-zinc-900 dark:text-zinc-100">{selectedPendQueueItem.nama}</div>
						<div class="font-mono text-[11px] text-zinc-500">{selectedPendQueueItem.nip}</div>
					</div>
					<div class="text-right">
						<div class="font-semibold text-sky-700 dark:text-sky-300">
							{selectedPendQueueItem.pend_baru}
						</div>
						{#if selectedPendQueueItem.tkt_pend_baru}
							<span class="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 mt-0.5">
								{selectedPendQueueItem.tkt_pend_baru}
							</span>
						{/if}
					</div>
				</div>

				<!-- Nomor Ijazah -->
				<div class="space-y-1">
					<label for="ijazah_nomor" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Nomor Ijazah
					</label>
					<input
						id="ijazah_nomor"
						type="text"
						bind:value={uploadIjazahNumber}
						placeholder="Contoh: 12345/UNM/S1/2020"
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400"
					/>
				</div>

				<!-- Tanggal Ijazah -->
				<div class="space-y-1">
					<label for="ijazah_tgl" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Tanggal Ijazah
					</label>
					<input
						id="ijazah_tgl"
						type="date"
						bind:value={uploadIjazahDate}
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
					/>
				</div>

				<!-- Nama Sekolah / Universitas -->
				<div class="space-y-1">
					<label for="ijazah_sekolah" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Nama Sekolah / Perguruan Tinggi
					</label>
					<input
						id="ijazah_sekolah"
						type="text"
						bind:value={uploadIjazahSekolah}
						placeholder="Contoh: Universitas Hasanuddin"
						class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400"
					/>
				</div>

				<!-- Upload File PDF Ijazah -->
				<div class="space-y-1.5">
					<label for="ijazah_file" class="block font-medium text-zinc-700 dark:text-zinc-300">
						Berkas Scan Dokumen Ijazah <span class="text-rose-500">*</span>
					</label>
					<input
						id="ijazah_file"
						type="file"
						accept="application/pdf"
						onchange={handleIjazahFileChange}
						class="w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-950 dark:file:text-sky-300 cursor-pointer border border-zinc-200 dark:border-zinc-700 rounded-xl p-1"
					/>
					<p class="text-[10px] text-zinc-400">
						Wajib format <strong>PDF</strong> dengan ukuran maksimal 5 MB.
					</p>
					{#if uploadIjazahFileError}
						<p class="text-[11px] text-rose-500 font-medium">{uploadIjazahFileError}</p>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2.5">
					<Button
						variant="secondary"
						disabled={uploadingIjazah}
						onclick={closeUploadIjazahModal}
						class="text-xs"
					>
						Batal
					</Button>

					<Button
						type="submit"
						variant="primary"
						loading={uploadingIjazah}
						class="text-xs bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5"
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
						<span>Unggah & Simpan Ijazah</span>
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 7. Modal Konfirmasi Hapus Antrean Pendidikan -->
{#if isDeletePendModalOpen && deleteTargetPendItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget && !deletingPendQueue) closeDeletePendModal(); }}
	>
		<div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<div class="p-5 space-y-3 text-xs">
				<div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</div>
				<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
					Hapus dari Antrean Upload Ijazah?
				</h3>
				<p class="text-zinc-600 dark:text-zinc-400">
					Pegawai <strong>{deleteTargetPendItem.nama}</strong> ({deleteTargetPendItem.nip}) akan dihapus dari antrean pengunggahan berkas Ijazah ({deleteTargetPendItem.pend_baru}).
				</p>
				<p class="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-700">
					Catatan: Data riwayat pendidikan yang sudah disinkronkan tetap tersimpan pada data riwayat pegawai di database lokal.
				</p>
			</div>

			<div class="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-2.5">
				<Button
					variant="secondary"
					disabled={deletingPendQueue}
					onclick={closeDeletePendModal}
					class="text-xs"
				>
					Batal
				</Button>
				<Button
					variant="danger"
					loading={deletingPendQueue}
					onclick={confirmDeletePendQueue}
					class="text-xs bg-rose-600 hover:bg-rose-700 text-white"
				>
					Hapus dari Antrean
				</Button>
			</div>
		</div>
	</div>
{/if}

