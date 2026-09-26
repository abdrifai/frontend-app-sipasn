<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import MutasiMasalModal from '$lib/components/peremajaan-kolektif/MutasiMasalModal.svelte';
	import PindahUnitOrganisasiModal from '$lib/components/peremajaan-kolektif/PindahUnitOrganisasiModal.svelte';
	import DetailMutasiUnorModal from '$lib/components/peremajaan-kolektif/DetailMutasiUnorModal.svelte';

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// Tab Aktif: 'sk_kolektif' | 'mutasi_unor'
	let activeTab = $state('sk_kolektif');

	// State Data Tabel SK Kolektif
	let skList = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let statusFilter = $state('');
	let page = $state(1);
	let limit = $state(10);
	let total = $state(0);
	let totalPages = $state(1);

	// State Data Mutasi Unor Langsung (Tanpa SK)
	let mutasiUnorList = $state([]);
	let loadingMutasiUnor = $state(false);
	let errorMutasiUnor = $state(null);
	let searchMutasiUnor = $state('');
	let statusFilterMutasiUnor = $state('');
	let pageMutasiUnor = $state(1);
	let limitMutasiUnor = $state(10);
	let totalMutasiUnor = $state(0);
	let totalPagesMutasiUnor = $state(1);

	// Master Options
	let jnsMutasiOptions = $state([]);

	// Modal States
	let showFormModal = $state(false);
	let showDeleteModal = $state(false);
	let showPreviewModal = $state(false);
	let showMutasiMasalModal = $state(false);
	let showPindahUnorModal = $state(false);
	let showDetailMutasiModal = $state(false);
	let selectedMutasiId = $state(null);

	// Referensi UNOR & Jabatan untuk Mutasi Masal
	let refUnorTree = $state([]);
	let refUnorInduk = $state([]);
	let refDaftarJabatan = $state([]);
	let loadingReferensi = $state(false);

	let unorOptions = $derived(
		refUnorInduk
			.filter((u) => u.isAktif === 1 || u.isAktif === true || u.isAktif === '1' || u.isAktif === undefined)
			.map((u) => ({
				id: u.id,
				value: u.id,
				nmUnor: (u.nmUnor || '').trim(),
				label: (u.nmUnor || '').trim(),
				parent_id: u.parent_id,
				level: u.level,
				kode: u.kode,
				jab_id: u.resolved_jab_id || u.jab_id,
				jns_jab_id: u.jns_jab_id,
				jenjang_jab_id: u.jenjang_jab_id,
				eselon_id: u.eselon_id,
				isAktif: u.isAktif,
			}))
	);

	let draftSkList = $derived(skList.filter((s) => s.status === 'DRAFT'));

	let previewPdfUrl = $state('');
	let previewTitle = $state('');

	let isEditing = $state(false);
	let currentEditId = $state(null);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);
	let submitting = $state(false);

	// Form State
	let form = $state({
		no_sk: '',
		tgl_sk: '',
		tmt_sk: '',
		jns_mutasi_id: '',
		pengesahan: 'BUPATI TOJO UNA-UNA',
		keterangan: ''
	});
	let selectedFileSK = $state(null);
	let fileInputRef = $state(null);
	let fieldErrors = $state({});

	onMount(async () => {
		await loadOptions();
		await Promise.all([loadData(), loadMutasiUnorData()]);
	});

	async function ensureReferensiLoaded() {
		if (refUnorTree.length === 0) {
			loadingReferensi = true;
			try {
				const res = await api('/pegawai/referensi/jabatan');
				if (res?.data) {
					refUnorTree = res.data.unor_tree || [];
					refUnorInduk = res.data.unor_induk || [];
					refDaftarJabatan = res.data.daftar_jabatan || [];
				}
			} catch (err) {
				console.error('Gagal memuat master referensi:', err);
			} finally {
				loadingReferensi = false;
			}
		}
	}

	async function switchTab(tab) {
		activeTab = tab;
		if (tab === 'mutasi_unor' && mutasiUnorList.length === 0) {
			await loadMutasiUnorData();
		}
	}

	async function openMutasiMasalFromList() {
		await ensureReferensiLoaded();

		const drafts = skList.filter((s) => s.status === 'DRAFT');
		if (drafts.length === 0) {
			toast.info('Belum ada SK Kolektif berstatus Draft. Buat SK Kolektif terlebih dahulu.');
			openCreateModal();
			return;
		}

		showMutasiMasalModal = true;
	}

	async function openPindahUnorModal() {
		await ensureReferensiLoaded();
		showPindahUnorModal = true;
	}

	function openDetailMutasiModal(item) {
		selectedMutasiId = item.id;
		showDetailMutasiModal = true;
	}

	async function loadOptions() {
		try {
			const res = await api('/peremajaan-kolektif/options');
			jnsMutasiOptions = res.data?.jnsMutasi || [];
		} catch (err) {
			console.error('Gagal memuat opsi referensi:', err);
		}
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const query = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(search ? { search: search.trim() } : {}),
				...(statusFilter ? { status: statusFilter } : {})
			});
			const res = await api(`/peremajaan-kolektif?${query.toString()}`);
			skList = res.data || [];
			total = res.meta?.total || 0;
			totalPages = res.meta?.totalPages || 1;
		} catch (err) {
			error = err.message || 'Gagal memuat daftar SK Kolektif';
		} finally {
			loading = false;
		}
	}

	async function loadMutasiUnorData() {
		loadingMutasiUnor = true;
		errorMutasiUnor = null;
		try {
			const query = new URLSearchParams({
				page: pageMutasiUnor.toString(),
				limit: limitMutasiUnor.toString(),
				...(searchMutasiUnor ? { search: searchMutasiUnor.trim() } : {}),
				...(statusFilterMutasiUnor ? { status: statusFilterMutasiUnor } : {})
			});
			const res = await api(`/peremajaan-kolektif/mutasi-unor?${query.toString()}`);
			mutasiUnorList = res.data || [];
			totalMutasiUnor = res.meta?.total || 0;
			totalPagesMutasiUnor = res.meta?.totalPages || 1;
		} catch (err) {
			errorMutasiUnor = err.message || 'Gagal memuat riwayat mutasi unit organisasi';
		} finally {
			loadingMutasiUnor = false;
		}
	}

	let searchMutasiTimeout;
	function handleSearchMutasiInput() {
		clearTimeout(searchMutasiTimeout);
		searchMutasiTimeout = setTimeout(() => {
			pageMutasiUnor = 1;
			loadMutasiUnorData();
		}, 300);
	}

	function handleStatusMutasiChange() {
		pageMutasiUnor = 1;
		loadMutasiUnorData();
	}

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			page = 1;
			loadData();
		}, 300);
	}

	function handleStatusChange() {
		page = 1;
		loadData();
	}

	function openCreateModal() {
		isEditing = false;
		currentEditId = null;
		form = {
			no_sk: '',
			tgl_sk: new Date().toISOString().split('T')[0],
			tmt_sk: new Date().toISOString().split('T')[0],
			jns_mutasi_id: jnsMutasiOptions[0]?.id || '',
			pengesahan: 'BUPATI TOJO UNA-UNA',
			keterangan: ''
		};
		selectedFileSK = null;
		if (fileInputRef) fileInputRef.value = '';
		fieldErrors = {};
		showFormModal = true;
	}

	function openEditModal(item) {
		isEditing = true;
		currentEditId = item.id;
		form = {
			no_sk: item.no_sk || '',
			tgl_sk: item.tgl_sk ? item.tgl_sk.split('T')[0] : '',
			tmt_sk: item.tmt_sk ? item.tmt_sk.split('T')[0] : '',
			jns_mutasi_id: item.jns_mutasi_id || '',
			pengesahan: item.pengesahan || '',
			keterangan: item.keterangan || ''
		};
		selectedFileSK = null;
		if (fileInputRef) fileInputRef.value = '';
		fieldErrors = {};
		showFormModal = true;
	}

	function handleFileChange(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.type !== 'application/pdf') {
				toast.error('Hanya file PDF yang diperbolehkan!');
				event.target.value = '';
				selectedFileSK = null;
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				toast.error('Ukuran file maksimal 5MB!');
				event.target.value = '';
				selectedFileSK = null;
				return;
			}
			selectedFileSK = file;
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		fieldErrors = {};

		if (!form.no_sk.trim()) {
			fieldErrors.no_sk = 'Nomor SK wajib diisi';
			return;
		}
		if (!form.tgl_sk) {
			fieldErrors.tgl_sk = 'Tanggal SK wajib diisi';
			return;
		}
		if (!form.tmt_sk) {
			fieldErrors.tmt_sk = 'TMT SK wajib diisi';
			return;
		}

		submitting = true;
		try {
			const formData = new FormData();
			formData.append('no_sk', form.no_sk.trim());
			formData.append('tgl_sk', form.tgl_sk);
			formData.append('tmt_sk', form.tmt_sk);
			if (form.jns_mutasi_id) formData.append('jns_mutasi_id', form.jns_mutasi_id);
			if (form.pengesahan) formData.append('pengesahan', form.pengesahan.trim());
			if (form.keterangan) formData.append('keterangan', form.keterangan.trim());

			if (selectedFileSK) {
				formData.append('file_sk', selectedFileSK);
			}

			if (isEditing) {
				await api(`/peremajaan-kolektif/${currentEditId}`, {
					method: 'PUT',
					body: formData,
					headers: {}
				});
				toast.success('SK Kolektif berhasil diperbarui');
				showFormModal = false;
				await loadData();
			} else {
				const res = await api('/peremajaan-kolektif', {
					method: 'POST',
					body: formData,
					headers: {}
				});
				toast.success('SK Kolektif berhasil dibuat');
				showFormModal = false;
				if (res.data?.id) {
					goto(`/peremajaan-kolektif/${res.data.id}`);
				} else {
					await loadData();
				}
			}
		} catch (err) {
			if (err.errors) {
				fieldErrors = err.errors;
			}
			toast.error(err.message || 'Gagal menyimpan SK Kolektif');
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(item) {
		itemToDelete = item;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/peremajaan-kolektif/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('SK Kolektif berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			await loadData();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus SK Kolektif');
		} finally {
			deleteLoading = false;
		}
	}

	function getFileUrl(filePath) {
		if (!filePath || typeof filePath !== 'string') return '';
		const cleanPath = filePath.replace(/^\/+/, '').trim();
		if (!cleanPath) return '';
		if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;
		return API_BASE ? `${API_BASE}/${cleanPath}` : `/${cleanPath}`;
	}

	function previewDocument(item) {
		if (!item.arsip_path) {
			toast.info('Dokumen SK Kolektif belum diunggah');
			return;
		}
		previewPdfUrl = getFileUrl(item.arsip_path);
		previewTitle = `SK Kolektif - ${item.no_sk}`;
		showPreviewModal = true;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
		} catch (e) {
			return dateStr;
		}
	}

	function formatDateTime(dateStr) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>Peremajaan Kolektif | SIPASN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
					Layanan Kepegawaian
				</span>
			</div>
			<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
				Peremajaan Kolektif
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
				Peremajaan riwayat jabatan massal dan pemindahan unit organisasi pegawai secara terpusat.
			</p>
		</div>

		<div class="flex items-center gap-3">
			{#if activeTab === 'sk_kolektif'}
				<Button variant="primary" onclick={openCreateModal} class="shadow-lg shadow-indigo-500/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					Tambah SK Kolektif
				</Button>
			{:else}
				<Button variant="primary" onclick={openPindahUnorModal} class="shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
					<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
					Pindah Unit Kerja Pegawai
				</Button>
			{/if}
		</div>
	</div>

	<!-- Tab Switcher Navigation -->
	<div class="flex items-center gap-2 p-1.5 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs">
		<button
			type="button"
			onclick={() => switchTab('sk_kolektif')}
			class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 {activeTab === 'sk_kolektif' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer'}"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
			<span>SK Kolektif Resmi</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] {activeTab === 'sk_kolektif' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}">{total}</span>
		</button>

		<button
			type="button"
			onclick={() => switchTab('mutasi_unor')}
			class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 {activeTab === 'mutasi_unor' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer'}"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
			<span>Mutasi Masal Unit Kerja (Tanpa SK)</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] {activeTab === 'mutasi_unor' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}">{totalMutasiUnor}</span>
		</button>
	</div>

	{#if activeTab === 'sk_kolektif'}
		<!-- Stats Bar SK Kolektif -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total SK Kolektif</p>
					<p class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{total}</p>
				</div>
			</div>

			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pembaruan Jabatan</p>
					<p class="text-sm font-bold text-amber-600 dark:text-amber-400">Kolektif Massal</p>
				</div>
			</div>

			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Penyimpanan Server</p>
					<p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">1 File Arsip Terbagi</p>
				</div>
			</div>
		</div>

		<!-- Toolbar & Filters SK Kolektif -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div class="w-full sm:w-80 relative">
				<input
					type="text"
					placeholder="Cari No. SK, Pengesahan, Keterangan..."
					bind:value={search}
					oninput={handleSearchInput}
					class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
				/>
				<svg class="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</div>

			<div class="w-full sm:w-auto flex items-center gap-2">
				<select
					bind:value={statusFilter}
					onchange={handleStatusChange}
					class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none font-medium text-zinc-700 dark:text-zinc-300"
				>
					<option value="">Semua Status</option>
					<option value="DRAFT">DRAFT (Belum Diproses)</option>
					<option value="PROCESSED">PROCESSED (Selesai)</option>
				</select>
			</div>
		</div>

		<!-- Table Area SK Kolektif -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
			{#if loading}
				<LoadingState message="Memuat daftar SK Kolektif..." />
			{:else if error}
				<ErrorState message={error} onRetry={loadData} />
			{:else if skList.length === 0}
				<EmptyState
					title="Belum Ada SK Kolektif"
					message="Klik tombol 'Tambah SK Kolektif' di atas untuk membuat penetapan SK peremajaan jabatan massal."
					icon="📜"
				/>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
								<th class="py-3.5 px-4 w-12 text-center">No</th>
								<th class="py-3.5 px-4">Nomor & Tanggal SK</th>
								<th class="py-3.5 px-4">TMT Jabatan</th>
								<th class="py-3.5 px-4">Pejabat Pengesahan</th>
								<th class="py-3.5 px-4 text-center">Jumlah Pegawai</th>
								<th class="py-3.5 px-4 text-center">Status</th>
								<th class="py-3.5 px-4 text-center">Berkas SK</th>
								<th class="py-3.5 px-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
							{#each skList as item, index}
								<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
									<td class="py-3.5 px-4 text-center font-medium text-zinc-400">
										{(page - 1) * limit + index + 1}
									</td>
									<td class="py-3.5 px-4">
										<a
											href={`/peremajaan-kolektif/${item.id}`}
											class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
										>
											<span>{item.no_sk}</span>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
										</a>
										<p class="text-[11px] text-zinc-500 mt-0.5">
											Tgl: {formatDate(item.tgl_sk)}
										</p>
										{#if item.keterangan}
											<p class="text-[11px] text-zinc-400 italic mt-0.5 truncate max-w-xs">{item.keterangan}</p>
										{/if}
									</td>
									<td class="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">
										{formatDate(item.tmt_sk)}
									</td>
									<td class="py-3.5 px-4 text-xs font-medium text-zinc-700 dark:text-zinc-300">
										{item.pengesahan || '-'}
									</td>
									<td class="py-3.5 px-4 text-center">
										<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-[10px] tracking-wider">
											👥 {item.total_pegawai} Orang
										</span>
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										{#if item.status === 'PROCESSED'}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												Diproses
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
												Draft
											</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										{#if item.arsip_path}
											<button
												type="button"
												onclick={() => previewDocument(item)}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
												Lihat SK
											</button>
										{:else}
											<span class="text-zinc-400 italic text-[11px]">Tidak ada</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right whitespace-nowrap">
										<div class="flex items-center justify-end gap-1.5">
											<a
												href={`/peremajaan-kolektif/${item.id}`}
												class="p-2 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
												title="Rincian SK & Pegawai"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
											</a>
											{#if item.status === 'DRAFT'}
												<button
													onclick={() => openEditModal(item)}
													class="p-2 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
													title="Edit SK"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
												</button>
												<button
													onclick={() => confirmDelete(item)}
													class="p-2 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
													title="Hapus SK"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer SK Kolektif -->
				<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<div>
						Menampilkan <span class="font-bold text-zinc-700 dark:text-zinc-200">{skList.length}</span> dari <span class="font-bold text-zinc-700 dark:text-zinc-200">{total}</span> total data
					</div>

					{#if totalPages > 1}
						<div class="flex items-center gap-1.5">
							<button
								disabled={page <= 1}
								onclick={() => { page -= 1; loadData(); }}
								class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
							>
								Prev
							</button>
							<span class="px-3 py-1 font-bold text-zinc-700 dark:text-zinc-200">
								Halaman {page} dari {totalPages}
							</span>
							<button
								disabled={page >= totalPages}
								onclick={() => { page += 1; loadData(); }}
								class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<!-- TAB 2: MUTASI MASAL UNIT KERJA (TANPA SK) -->

		<!-- Info Banner -->
		<div class="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-indigo-50/80 via-white to-indigo-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 border border-indigo-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
				</div>
				<div class="space-y-1">
					<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
						Pemindahan Langsung Unit Organisasi (Tanpa SK)
						<span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black tracking-wider uppercase">
							Dapat Dikembalikan / Rollback
						</span>
					</h3>
					<p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
						Gunakan fitur ini untuk memindahkan pegawai antar unit kerja secara langsung, sekaligus dapat menyesuaikan jabatan struktural di unit tujuan dalam satu waktu. Seluruh histori penempatan dan jabatan lama tersimpan rapi dan dapat <strong>dikembalikan (restore)</strong> kapan pun dibutuhkan.
					</p>
				</div>
			</div>
			<Button variant="primary" onclick={openPindahUnorModal} class="shrink-0 text-xs shadow-md shadow-indigo-500/20">
				<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
				Pindah Unit Kerja
			</Button>
		</div>

		<!-- Stats Bar Mutasi Unor -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Mutasi Unit</p>
					<p class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{totalMutasiUnor}</p>
				</div>
			</div>

			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Data Jabatan Pegawai</p>
					<p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">Tetap Utuh & Terjaga</p>
				</div>
			</div>

			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
				<div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
				</div>
				<div>
					<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Kembalikan ke Asal</p>
					<p class="text-sm font-bold text-purple-600 dark:text-purple-400">Restore 1-Klik Aktif</p>
				</div>
			</div>
		</div>

		<!-- Toolbar & Filters Mutasi Unor -->
		<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div class="w-full sm:w-80 relative">
				<input
					type="text"
					placeholder="Cari Asal, Tujuan, Keterangan..."
					bind:value={searchMutasiUnor}
					oninput={handleSearchMutasiInput}
					class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
				/>
				<svg class="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</div>

			<div class="w-full sm:w-auto flex items-center gap-2">
				<select
					bind:value={statusFilterMutasiUnor}
					onchange={handleStatusMutasiChange}
					class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none font-medium text-zinc-700 dark:text-zinc-300"
				>
					<option value="">Semua Status</option>
					<option value="APPLIED">Diterapkan (Aktif)</option>
					<option value="RESTORED">Sudah Dikembalikan (Restored)</option>
				</select>
			</div>
		</div>

		<!-- Table Mutasi Unor History -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
			{#if loadingMutasiUnor}
				<LoadingState message="Memuat riwayat mutasi unit organisasi..." />
			{:else if errorMutasiUnor}
				<ErrorState message={errorMutasiUnor} onRetry={loadMutasiUnorData} />
			{:else if mutasiUnorList.length === 0}
				<EmptyState
					title="Belum Ada Riwayat Mutasi Unit Kerja"
					message="Klik tombol 'Pindah Unit Kerja Pegawai' di atas untuk memindahkan pegawai antar unit organisasi secara langsung."
					icon="🔄"
				/>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
								<th class="py-3.5 px-4 w-12 text-center">No</th>
								<th class="py-3.5 px-4">Waktu Mutasi</th>
								<th class="py-3.5 px-4 text-center">Jumlah Pegawai</th>
								<th class="py-3.5 px-4">Keterangan</th>
								<th class="py-3.5 px-4 text-center">Status</th>
								<th class="py-3.5 px-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
							{#each mutasiUnorList as item, index}
								<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
									<td class="py-3.5 px-4 text-center font-medium text-zinc-400">
										{(pageMutasiUnor - 1) * limitMutasiUnor + index + 1}
									</td>
									<td class="py-3.5 px-4 whitespace-nowrap">
										<p class="font-bold text-zinc-900 dark:text-zinc-100">{formatDateTime(item.tgl_mutasi)}</p>
										<p class="text-[11px] text-zinc-400 mt-0.5">Oleh: {item.user_created?.nama || item.user_created?.username || '-'}</p>
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-[10px] tracking-wider">
											👥 {item.total_pegawai} Orang
										</span>
									</td>
									<td class="py-3.5 px-4">
										{#if item.keterangan}
											<p class="text-xs text-zinc-700 dark:text-zinc-300 italic max-w-xs truncate" title={item.keterangan}>
												"{item.keterangan}"
											</p>
										{:else}
											<span class="text-zinc-400 italic text-[11px]">-</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										{#if item.status === 'APPLIED'}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												Diterapkan
											</span>
										{:else}
											<div class="flex flex-col items-center">
												<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
													<span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
													Dikembalikan
												</span>
												{#if item.restored_at}
													<span class="text-[9px] text-zinc-400 mt-0.5">{formatDate(item.restored_at)}</span>
												{/if}
											</div>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right whitespace-nowrap">
										<button
											onclick={() => openDetailMutasiModal(item)}
											class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition cursor-pointer"
											title="Lihat Pegawai & Fitur Kembalikan"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
											<span>Rincian</span>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer Mutasi Unor -->
				<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<div>
						Menampilkan <span class="font-bold text-zinc-700 dark:text-zinc-200">{mutasiUnorList.length}</span> dari <span class="font-bold text-zinc-700 dark:text-zinc-200">{totalMutasiUnor}</span> total data
					</div>

					{#if totalPagesMutasiUnor > 1}
						<div class="flex items-center gap-1.5">
							<button
								disabled={pageMutasiUnor <= 1}
								onclick={() => { pageMutasiUnor -= 1; loadMutasiUnorData(); }}
								class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
							>
								Prev
							</button>
							<span class="px-3 py-1 font-bold text-zinc-700 dark:text-zinc-200">
								Halaman {pageMutasiUnor} dari {totalPagesMutasiUnor}
							</span>
							<button
								disabled={pageMutasiUnor >= totalPagesMutasiUnor}
								onclick={() => { pageMutasiUnor += 1; loadMutasiUnorData(); }}
								class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Tambah / Edit SK Kolektif -->
{#if showFormModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-50">
					{isEditing ? 'Edit Header SK Kolektif' : 'Tambah SK Kolektif Baru'}
				</h3>
				<button
					onclick={() => (showFormModal = false)}
					class="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<div class="space-y-1">
					<label for="no_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Nomor SK <span class="text-rose-500">*</span>
					</label>
					<input
						id="no_sk"
						type="text"
						bind:value={form.no_sk}
						placeholder="Contoh: 800/BKPSDM/01/2026"
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border {fieldErrors.no_sk ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
					/>
					{#if fieldErrors.no_sk}
						<p class="text-2xs text-rose-500">{fieldErrors.no_sk}</p>
					{/if}
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1">
						<label for="tgl_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Penetapan SK <span class="text-rose-500">*</span>
						</label>
						<input
							id="tgl_sk"
							type="date"
							bind:value={form.tgl_sk}
							class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border {fieldErrors.tgl_sk ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
						/>
						{#if fieldErrors.tgl_sk}
							<p class="text-2xs text-rose-500">{fieldErrors.tgl_sk}</p>
						{/if}
					</div>

					<div class="space-y-1">
						<label for="tmt_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT Jabatan / SK <span class="text-rose-500">*</span>
						</label>
						<input
							id="tmt_sk"
							type="date"
							bind:value={form.tmt_sk}
							class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border {fieldErrors.tmt_sk ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
						/>
						{#if fieldErrors.tmt_sk}
							<p class="text-2xs text-rose-500">{fieldErrors.tmt_sk}</p>
						{/if}
					</div>
				</div>

				<div class="space-y-1">
					<label for="jns_mutasi" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Jenis Mutasi / Pengangkatan
					</label>
					<select
						id="jns_mutasi"
						bind:value={form.jns_mutasi_id}
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
					>
						<option value="">Pilih Jenis Mutasi (Opsional)</option>
						{#each jnsMutasiOptions as mutasi}
							<option value={mutasi.id}>{mutasi.jnsMutasi}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-1">
					<label for="pengesahan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Pejabat Yang Menetapkan / Pengesahan
					</label>
					<input
						id="pengesahan"
						type="text"
						bind:value={form.pengesahan}
						placeholder="Contoh: BUPATI TOJO UNA-UNA"
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
					/>
				</div>

				<div class="space-y-1">
					<label for="keterangan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Keterangan / Acara Pelantikan (Opsional)
					</label>
					<textarea
						id="keterangan"
						rows="2"
						bind:value={form.keterangan}
						placeholder="Contoh: Pelantikan Pejabat Administrator & Pengawas di Lingkungan Pemda"
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 resize-none placeholder-zinc-400"
					></textarea>
				</div>

				<!-- Upload Berkas Tunggal -->
				<div class="space-y-1.5">
					<label for="file_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						File Berkas SK PDF (1 Berkas Terpusat untuk Semua Pegawai)
					</label>
					<div class="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
						<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						<span>Hanya 1 file fisik SK yang disimpan di server dan digunakan bersama oleh seluruh pegawai dalam SK ini.</span>
					</div>
					<input
						id="file_sk"
						type="file"
						accept=".pdf"
						bind:this={fileInputRef}
						onchange={handleFileChange}
						class="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer pt-1"
					/>
				</div>

				<div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200/80 dark:border-zinc-800">
					<Button variant="ghost" onclick={() => (showFormModal = false)}>
						Batal
					</Button>
					<Button type="submit" variant="primary" loading={submitting} class="shadow-lg shadow-indigo-500/20">
						{isEditing ? 'Simpan Perubahan' : 'Buat SK & Lanjut Input Pegawai'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Preview PDF -->
{#if showPreviewModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-6xl xl:max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
				<div class="flex items-center gap-3">
					<span class="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
					</span>
					<div>
						<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-xl">
							{previewTitle}
						</h3>
						<p class="text-[11px] text-zinc-400 font-medium">Pratinjau Dokumen Berkas SK Digital</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<a
						href={previewPdfUrl}
						target="_blank"
						rel="noreferrer"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl transition"
						title="Buka di Tab Baru"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
						<span>Buka Tab Baru</span>
					</a>
					<button
						onclick={() => (showPreviewModal = false)}
						class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
						title="Tutup Pratinjau"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>
			</div>

			<div class="flex-1 bg-zinc-100 dark:bg-zinc-950 p-2 sm:p-3">
				<iframe
					src={previewPdfUrl}
					title="PDF Preview"
					class="w-full h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white shadow-inner"
				></iframe>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
<ConfirmDeleteModal
	bind:show={showDeleteModal}
	verifyText=""
	title="Hapus SK Kolektif"
	message={`Apakah Anda yakin ingin menghapus SK Kolektif "${itemToDelete?.no_sk || ''}" beserta daftar rincian pegawainya?`}
	loading={deleteLoading}
	onConfirm={handleDelete}
	onCancel={() => { showDeleteModal = false; itemToDelete = null; }}
/>


<!-- Modal Mutasi Masal OPD -->
<MutasiMasalModal
	isOpen={showMutasiMasalModal}
	skDraftList={draftSkList}
	{refUnorTree}
	refUnorFlat={unorOptions}
	refJabatan={refDaftarJabatan}
	onclose={() => (showMutasiMasalModal = false)}
	onsuccess={async () => {
		await loadData();
	}}
/>

<!-- Modal Pemindahan Unit Kerja Langsung (Tanpa SK) -->
<PindahUnitOrganisasiModal
	isOpen={showPindahUnorModal}
	{refUnorTree}
	refUnorFlat={unorOptions}
	refJabatan={refDaftarJabatan}
	onclose={() => (showPindahUnorModal = false)}
	onsuccess={async () => {
		await loadMutasiUnorData();
	}}
/>

<!-- Modal Rincian & Restore Mutasi Unit Organisasi -->
<DetailMutasiUnorModal
	isOpen={showDetailMutasiModal}
	mutasiId={selectedMutasiId}
	onclose={() => {
		showDetailMutasiModal = false;
		selectedMutasiId = null;
	}}
	onrestored={async () => {
		await loadMutasiUnorData();
	}}
/>


