<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { debounce } from '$lib/utils/debounce.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import PeraturanSearchSelect from '$lib/components/referensi/PeraturanSearchSelect.svelte';
	import PeraturanMindmap from '$lib/components/referensi/PeraturanMindmap.svelte';

	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
	const API_BASE = API_URL.replace(/\/api\/?$/, '');

	// Tab View: 'table' atau 'mindmap'
	let activeTab = $state('table');

	// State Data & Filter
	let data = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedKategori = $state('');
	let selectedJenis = $state('');
	let selectedStatus = $state('');
	let selectedTahun = $state('');
	let page = $state(1);
	let limit = $state(10);
	let meta = $state({ totalPages: 1, total: 0 });

	// Filter lookups
	let filterOptions = $state({ kategoriList: [], jenisList: [] });

	// Modal State
	let showModal = $state(false);
	let isEditing = $state(false);
	let submitting = $state(false);
	let formError = $state(null);
	let fieldErrors = $state({});

	// Preview PDF Modal State
	let showPreviewModal = $state(false);
	let previewDoc = $state(null);

	// Delete Confirmation State
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);

	// Form State
	let formData = $state({
		id: '',
		nomor_peraturan: '',
		judul: '',
		kategori: 'SOTK',
		jenis_peraturan: 'PERBUP',
		tahun: new Date().getFullYear(),
		tgl_penetapan: '',
		tgl_berlaku: '',
		status_berlaku: 'BERLAKU',
		parent_id: '',
		peraturan_terkait_id: '',
		tipe_relasi: '',
		peraturan_terkait: '',
		tentang: '',
		keterangan: '',
		file_path: '',
		file_nama_asli: ''
	});

	let selectedFile = $state(null);
	let fileInputRef = $state(null);
	let parentNomorDisplay = $state('');

	// Opsi Kategori Standar
	const KATEGORI_OPTIONS = [
		{ value: 'SOTK', label: 'SOTK (Struktur & Tata Kerja)' },
		{ value: 'JABATAN', label: 'Jabatan (Nomenklatur, Jenjang, Rumpun)' },
		{ value: 'KEPEGAWAIAN', label: 'Manajemen Kepegawaian ASN' },
		{ value: 'DISIPLIN_ETIKA', label: 'Disiplin, Kode Etik & Hukdis' },
		{ value: 'PENGGAJIAN_KESEJAHTERAAN', label: 'Penggajian, KGB & Kesejahteraan' },
		{ value: 'MUTASI_PROMOSI', label: 'Mutasi, Promosi & Kepangkatan' },
		{ value: 'DIKLAT_PENGEMBANGAN', label: 'Pendidikan & Pelatihan' },
		{ value: 'LAINNYA', label: 'Regulasi Lainnya' }
	];

	// Opsi Jenis Peraturan
	const JENIS_OPTIONS = [
		{ value: 'UU', label: 'Undang-Undang (UU)' },
		{ value: 'PP', label: 'Peraturan Pemerintah (PP)' },
		{ value: 'PERPRES', label: 'Peraturan Presiden (Perpres)' },
		{ value: 'PERMENPAN', label: 'PermenPAN-RB' },
		{ value: 'PERKA_BKN', label: 'Peraturan / Perka BKN' },
		{ value: 'PERDA', label: 'Peraturan Daerah (Perda)' },
		{ value: 'PERBUP', label: 'Peraturan Bupati (Perbup)' },
		{ value: 'SK', label: 'Keputusan Bupati (SK)' },
		{ value: 'SE', label: 'Surat Edaran (SE)' },
		{ value: 'INSTRUKSI', label: 'Instruksi' }
	];

	// Format URL File
	function getFileUrl(filePath) {
		if (!filePath || typeof filePath !== 'string') return '';
		const cleanPath = filePath.replace(/^\/+/, '').trim();
		if (!cleanPath) return '';
		if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;
		return API_BASE ? `${API_BASE}/${cleanPath}` : `/${cleanPath}`;
	}

	function formatFileSize(bytes) {
		if (!bytes || bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));
		return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(val) {
		if (!val) return '-';
		try {
			const d = new Date(val);
			return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
		} catch (e) {
			return val;
		}
	}

	function formatKategoriBadge(kat) {
		switch (kat) {
			case 'SOTK':
				return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
			case 'JABATAN':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
			case 'KEPEGAWAIAN':
				return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
			case 'DISIPLIN_ETIKA':
				return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
			case 'PENGGAJIAN_KESEJAHTERAAN':
				return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
			case 'MUTASI_PROMOSI':
				return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
			case 'DIKLAT_PENGEMBANGAN':
				return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
			default:
				return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
		}
	}

	function getKategoriLabel(kat) {
		const found = KATEGORI_OPTIONS.find((k) => k.value === kat);
		return found ? found.label.split(' (')[0] : kat;
	}

	function getRelasiBadgeStyle(tipe) {
		switch (tipe) {
			case 'MENCABUT':
				return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800';
			case 'MENGUBAH':
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
			case 'DICABUT_OLEH':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800';
			case 'DIUBAH_OLEH':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
			case 'DASAR_HUKUM':
				return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
			default:
				return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
		}
	}

	function formatRelasiText(tipe, nomor) {
		switch (tipe) {
			case 'MENCABUT':
				return `Mencabut: ${nomor}`;
			case 'MENGUBAH':
				return `Mengubah: ${nomor}`;
			case 'DICABUT_OLEH':
				return `Dicabut oleh: ${nomor}`;
			case 'DIUBAH_OLEH':
				return `Diubah oleh: ${nomor}`;
			case 'DASAR_HUKUM':
				return `Turunan dari: ${nomor}`;
			default:
				return `Terkait: ${nomor}`;
		}
	}

	async function loadLookups() {
		try {
			const res = await api('/ref-peraturan/filter-options');
			filterOptions = res.data;
		} catch (err) {
			console.error('Gagal memuat opsi filter:', err);
		}
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			let query = `/ref-peraturan?page=${page}&limit=${limit}`;
			if (search) query += `&search=${encodeURIComponent(search)}`;
			if (selectedKategori) query += `&kategori=${encodeURIComponent(selectedKategori)}`;
			if (selectedJenis) query += `&jenis_peraturan=${encodeURIComponent(selectedJenis)}`;
			if (selectedStatus) query += `&status_berlaku=${encodeURIComponent(selectedStatus)}`;
			if (selectedTahun) query += `&tahun=${encodeURIComponent(selectedTahun)}`;

			const res = await api(query);
			data = res.data;
			meta = res.meta;
		} catch (err) {
			error = err.message || 'Gagal memuat data peraturan';
		} finally {
			loading = false;
		}
	}

	let lastSearchUsed = '';
	const debouncedSearch = debounce(() => {
		if (search !== lastSearchUsed) {
			lastSearchUsed = search;
			page = 1;
			loadData();
		}
	}, 400);

	$effect(() => {
		debouncedSearch(search);
	});

	onMount(() => {
		loadLookups();
		loadData();
	});

	function handleFilterChange() {
		page = 1;
		loadData();
	}

	function resetFilters() {
		search = '';
		lastSearchUsed = '';
		selectedKategori = '';
		selectedJenis = '';
		selectedStatus = '';
		selectedTahun = '';
		page = 1;
		loadData();
	}

	function openCreate() {
		isEditing = false;
		parentNomorDisplay = '';
		formData = {
			id: '',
			nomor_peraturan: '',
			judul: '',
			kategori: 'SOTK',
			jenis_peraturan: 'PERBUP',
			tahun: new Date().getFullYear(),
			tgl_penetapan: '',
			tgl_berlaku: '',
			status_berlaku: 'BERLAKU',
			parent_id: '',
			peraturan_terkait_id: '',
			tipe_relasi: '',
			peraturan_terkait: '',
			tentang: '',
			keterangan: '',
			file_path: '',
			file_nama_asli: ''
		};
		selectedFile = null;
		if (fileInputRef) fileInputRef.value = '';
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		parentNomorDisplay = item.parent?.nomor_peraturan || '';
		formData = {
			id: item.id,
			nomor_peraturan: item.nomor_peraturan,
			judul: item.judul,
			kategori: item.kategori,
			jenis_peraturan: item.jenis_peraturan,
			tahun: item.tahun,
			tgl_penetapan: item.tgl_penetapan ? item.tgl_penetapan.split('T')[0] : '',
			tgl_berlaku: item.tgl_berlaku ? item.tgl_berlaku.split('T')[0] : '',
			status_berlaku: item.status_berlaku || 'BERLAKU',
			parent_id: item.parent_id || '',
			peraturan_terkait_id: item.peraturan_terkait_id || '',
			tipe_relasi: item.tipe_relasi || '',
			peraturan_terkait: item.peraturan_terkait || '',
			tentang: item.tentang || '',
			keterangan: item.keterangan || '',
			file_path: item.file_path || '',
			file_nama_asli: item.file_nama_asli || ''
		};
		selectedFile = null;
		if (fileInputRef) fileInputRef.value = '';
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function handleFileSelect(e) {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
				toast.error('File harus berformat PDF (.pdf)');
				e.target.value = '';
				selectedFile = null;
				return;
			}
			if (file.size > 25 * 1024 * 1024) {
				toast.error('Ukuran file maksimal 25 MB');
				e.target.value = '';
				selectedFile = null;
				return;
			}
			selectedFile = file;
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		submitting = true;
		formError = null;
		fieldErrors = {};

		try {
			const payload = new FormData();
			payload.append('nomor_peraturan', formData.nomor_peraturan.trim());
			payload.append('judul', formData.judul.trim());
			payload.append('kategori', formData.kategori);
			payload.append('jenis_peraturan', formData.jenis_peraturan);
			payload.append('tahun', String(formData.tahun));
			if (formData.tgl_penetapan) payload.append('tgl_penetapan', formData.tgl_penetapan);
			if (formData.tgl_berlaku) payload.append('tgl_berlaku', formData.tgl_berlaku);
			payload.append('status_berlaku', formData.status_berlaku);
			if (formData.parent_id) payload.append('parent_id', formData.parent_id);
			if (formData.peraturan_terkait_id) payload.append('peraturan_terkait_id', formData.peraturan_terkait_id);
			if (formData.tipe_relasi) payload.append('tipe_relasi', formData.tipe_relasi);
			if (formData.peraturan_terkait) payload.append('peraturan_terkait', formData.peraturan_terkait.trim());
			if (formData.tentang) payload.append('tentang', formData.tentang.trim());
			if (formData.keterangan) payload.append('keterangan', formData.keterangan.trim());

			if (selectedFile) {
				payload.append('file_peraturan', selectedFile);
			}

			if (isEditing) {
				await api(`/ref-peraturan/${formData.id}`, {
					method: 'PUT',
					body: payload
				});
				toast.success('Arsip peraturan berhasil diperbarui');
			} else {
				await api('/ref-peraturan', {
					method: 'POST',
					body: payload
				});
				toast.success('Arsip peraturan berhasil ditambahkan');
			}

			showModal = false;
			await loadLookups();
			await loadData();
		} catch (err) {
			if (err.statusCode === 422 && Array.isArray(err.errors)) {
				const mapped = {};
				err.errors.forEach((e) => {
					mapped[e.field] = e.message;
				});
				fieldErrors = mapped;
			} else {
				formError = err.message || 'Terjadi kesalahan saat menyimpan data';
			}
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(item) {
		itemToDelete = item;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/ref-peraturan/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Arsip peraturan berhasil dihapus');
			showDeleteConfirm = false;
			itemToDelete = null;
			await loadLookups();
			await loadData();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus peraturan');
		} finally {
			deleteLoading = false;
		}
	}

	function previewDocument(item) {
		if (!item.file_path) {
			toast.info('File dokumen belum diunggah untuk peraturan ini');
			return;
		}
		previewDoc = item;
		showPreviewModal = true;
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
					Master Referensi Arsip Peraturan
				</h1>
			</div>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
				Repositori dokumen hukum, regulasi SOTK, jabatan, disiplin, dan kebijakan kepegawaian ASN
			</p>
		</div>
		<div class="flex items-center gap-2.5">
			<!-- Tab Switcher: Daftar Tabel vs Pohon Hierarki -->
			<div class="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
				<button
					type="button"
					onclick={() => activeTab = 'table'}
					class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition {activeTab === 'table' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					Daftar Tabel
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'mindmap'}
					class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition {activeTab === 'mindmap' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
					</svg>
					Pohon Hierarki (Mindmap)
				</button>
			</div>

			<Button variant="primary" onclick={openCreate}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Tambah Peraturan
			</Button>
		</div>
	</div>

	<!-- TAB 1: DAFTAR TABEL PERATURAN -->
	{#if activeTab === 'table'}
		<!-- Filter & Search Section -->
		<Card>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
				<!-- Live Search -->
				<div class="lg:col-span-2">
					<label for="filter-search" class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
						Cari Nomor / Judul / Perihal
					</label>
					<div class="relative">
						<input
							id="filter-search"
							type="text"
							bind:value={search}
							placeholder="Ketik nomor atau kata kunci peraturan..."
							class="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
						/>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				<!-- Kategori Filter -->
				<div>
					<label for="filter-kategori" class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
						Kategori Peraturan
					</label>
					<select
						id="filter-kategori"
						bind:value={selectedKategori}
						onchange={handleFilterChange}
						class="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
					>
						<option value="">Semua Kategori</option>
						{#each KATEGORI_OPTIONS as kat}
							<option value={kat.value}>{kat.label}</option>
						{/each}
					</select>
				</div>

				<!-- Jenis Peraturan Filter -->
				<div>
					<label for="filter-jenis" class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
						Jenis Peraturan
					</label>
					<select
						id="filter-jenis"
						bind:value={selectedJenis}
						onchange={handleFilterChange}
						class="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
					>
						<option value="">Semua Jenis</option>
						{#each JENIS_OPTIONS as jns}
							<option value={jns.value}>{jns.label}</option>
						{/each}
					</select>
				</div>

				<!-- Status & Reset Button -->
				<div class="flex items-center gap-2">
					<div class="flex-1">
						<label for="filter-status" class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
							Status
						</label>
						<select
							id="filter-status"
							bind:value={selectedStatus}
							onchange={handleFilterChange}
							class="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
						>
							<option value="">Semua</option>
							<option value="BERLAKU">Berlaku</option>
							<option value="DIUBAH_OLEH">Diubah Oleh</option>
							<option value="DICABUT">Dicabut</option>
							<option value="MENGUBAH">Mengubah</option>
						</select>
					</div>
					{#if search || selectedKategori || selectedJenis || selectedStatus || selectedTahun}
						<button
							onclick={resetFilters}
							title="Reset Filter"
							class="mt-5 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Main Data List -->
		<Card>
			{#if loading}
				<LoadingState message="Memuat arsip peraturan..." />
			{:else if error}
				<ErrorState message={error} onRetry={loadData} />
			{:else if data.length === 0}
				<EmptyState
					message="Belum ada arsip peraturan yang cocok dengan kriteria pencarian."
					icon="📄"
				/>
			{:else}
				<div class="overflow-x-auto -mx-5">
					<table class="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
						<thead class="bg-zinc-50 dark:bg-zinc-900/60 border-y border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
							<tr>
								<th class="py-3.5 px-4 text-center w-12">No</th>
								<th class="py-3.5 px-4 min-w-[280px]">Nomor & Perihal Peraturan</th>
								<th class="py-3.5 px-4 min-w-[140px]">Kategori</th>
								<th class="py-3.5 px-4 min-w-[120px]">Jenis / Tahun</th>
								<th class="py-3.5 px-4 min-w-[110px]">Status</th>
								<th class="py-3.5 px-4 min-w-[130px] text-center">Dokumen PDF</th>
								<th class="py-3.5 px-4 text-right w-24">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
							{#each data as item, index}
								<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition">
									<!-- Nomor Urut -->
									<td class="py-3.5 px-4 text-center font-mono text-xs text-zinc-400">
										{(page - 1) * limit + index + 1}
									</td>

									<!-- Nomor & Judul Peraturan -->
									<td class="py-3.5 px-4">
										<div class="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
											{item.nomor_peraturan}
										</div>
										<div class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
											{item.judul}
										</div>

										<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
											<!-- Induk / Dasar Hukum Badge -->
											{#if item.parent?.nomor_peraturan}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
													</svg>
													Dasar Hukum: {item.parent.nomor_peraturan}
												</span>
											{/if}

											<!-- Peraturan Terkait & Tipe Relasi (Mencabut, Mengubah, dll) -->
											{#if item.tipe_relasi && (item.peraturan_terkait || item.peraturan_terkait_ref?.nomor_peraturan)}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border {getRelasiBadgeStyle(item.tipe_relasi)}">
													{formatRelasiText(item.tipe_relasi, item.peraturan_terkait || item.peraturan_terkait_ref?.nomor_peraturan)}
												</span>
											{/if}

											<!-- Indikator Diubah / Dicabut Oleh Regulasi Lain -->
											{#if item.direferensikan_oleh && item.direferensikan_oleh.length > 0}
												{#each item.direferensikan_oleh as ref}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border {ref.tipe_relasi === 'MENCABUT' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'}">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
														</svg>
														{ref.tipe_relasi === 'MENCABUT' ? 'Dicabut oleh:' : 'Diubah oleh:'} {ref.nomor_peraturan}
													</span>
												{/each}
											{/if}
										</div>

										{#if item.tentang}
											<div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 italic line-clamp-1">
												Tentang: {item.tentang}
											</div>
										{/if}
										{#if item.tgl_penetapan}
											<div class="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
												</svg>
												Ditetapkan: {formatDate(item.tgl_penetapan)}
											</div>
										{/if}
									</td>

									<!-- Kategori -->
									<td class="py-3.5 px-4">
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {formatKategoriBadge(item.kategori)}">
											{getKategoriLabel(item.kategori)}
										</span>
									</td>

									<!-- Jenis / Tahun -->
									<td class="py-3.5 px-4">
										<div class="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
											{item.jenis_peraturan}
										</div>
										<div class="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
											Tahun {item.tahun}
										</div>
									</td>

									<!-- Status Berlaku -->
									<td class="py-3.5 px-4">
										{#if item.status_berlaku === 'BERLAKU'}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												Berlaku
											</span>
										{:else if item.status_berlaku === 'DIUBAH_OLEH'}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
												<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
												Diubah Oleh
											</span>
										{:else if item.status_berlaku === 'DICABUT'}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
												<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
												Dicabut
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
												Mengubah
											</span>
										{/if}
									</td>

									<!-- Dokumen PDF -->
									<td class="py-3.5 px-4 text-center">
										{#if item.file_path}
											<div class="inline-flex items-center gap-1.5">
												<button
													onclick={() => previewDocument(item)}
													title="Lihat Pratinjau Dokumen"
													class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md border border-emerald-200 dark:border-emerald-800 transition"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
													</svg>
													Preview
												</button>
												<a
													href={getFileUrl(item.file_path)}
													target="_blank"
													rel="noopener noreferrer"
													download
													title="Unduh File PDF"
													class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
													</svg>
												</a>
											</div>
											{#if item.file_size}
												<div class="text-[10px] text-zinc-400 mt-1">
													{formatFileSize(item.file_size)}
												</div>
											{/if}
										{:else}
											<span class="text-xs text-zinc-400 italic">Belum ada file</span>
										{/if}
									</td>

									<!-- Aksi -->
									<td class="py-3.5 px-4 text-right">
										<div class="inline-flex items-center gap-1">
											<button
												onclick={() => openEdit(item)}
												title="Edit Peraturan"
												class="p-1.5 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											<button
												onclick={() => confirmDelete(item)}
												title="Hapus Peraturan"
												class="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Info & Navigation -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
					<div>
						Menampilkan <span class="font-semibold text-zinc-800 dark:text-zinc-200">{(page - 1) * limit + 1}</span> -{' '}
						<span class="font-semibold text-zinc-800 dark:text-zinc-200">{Math.min(page * limit, meta.total)}</span> dari{' '}
						<span class="font-semibold text-zinc-800 dark:text-zinc-200">{meta.total}</span> data peraturan
					</div>
					<div class="inline-flex items-center gap-1.5">
						<button
							disabled={page <= 1}
							onclick={() => { page--; loadData(); }}
							class="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
						>
							Sebelumnya
						</button>
						<span class="px-2 text-xs font-mono">
							Hal. {page} / {meta.totalPages || 1}
						</span>
						<button
							disabled={page >= meta.totalPages}
							onclick={() => { page++; loadData(); }}
							class="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
						>
							Selanjutnya
						</button>
					</div>
				</div>
			{/if}
		</Card>
	{:else}
		<!-- TAB 2: POHON HIERARKI INTERAKTIF (NODE-BASED / MINDMAP) -->
		<PeraturanMindmap
			onPreviewPdf={previewDocument}
			onEditPeraturan={openEdit}
		/>
	{/if}
</div>

<!-- Modal Tambah / Edit Peraturan -->
{#if showModal}
	<div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
			<!-- Modal Header -->
			<div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
				<div>
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
						{isEditing ? 'Perbarui Arsip Peraturan' : 'Tambah Arsip Peraturan Baru'}
					</h3>
					<p class="text-xs text-zinc-500 mt-0.5">
						Lengkapi rincian regulasi, relasi status peraturan terkait, dan berkas PDF
					</p>
				</div>
				<button
					type="button"
					onclick={() => showModal = false}
					class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Error Alert -->
			{#if formError}
				<div class="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
					{formError}
				</div>
			{/if}

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Nomor Peraturan -->
					<div class="md:col-span-2">
						<Input
							label="Nomor Peraturan"
							name="nomor_peraturan"
							required
							placeholder="Misal: Perbup No. 12 Tahun 2023 / PermenPAN-RB No. 1 Tahun 2023"
							bind:value={formData.nomor_peraturan}
							error={fieldErrors.nomor_peraturan}
						/>
					</div>

					<!-- Judul / Perihal -->
					<div class="md:col-span-2">
						<Input
							label="Judul / Perihal Peraturan"
							name="judul"
							required
							placeholder="Masukkan judul atau perihal lengkap peraturan..."
							bind:value={formData.judul}
							error={fieldErrors.judul}
						/>
					</div>

					<!-- Kategori Peraturan -->
					<div>
						<label for="form-kategori" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Kategori Peraturan <span class="text-red-500">*</span>
						</label>
						<select
							id="form-kategori"
							bind:value={formData.kategori}
							class="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none {fieldErrors.kategori ? 'border-red-400' : 'border-zinc-300 dark:border-zinc-700'}"
						>
							{#each KATEGORI_OPTIONS as kat}
								<option value={kat.value}>{kat.label}</option>
							{/each}
						</select>
						{#if fieldErrors.kategori}
							<p class="text-[11px] text-red-500 mt-1">{fieldErrors.kategori}</p>
						{/if}
					</div>

					<!-- Jenis Peraturan (Tingkatan Hukum) -->
					<div>
						<label for="form-jenis" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Jenis Peraturan (Tingkatan Hukum) <span class="text-red-500">*</span>
						</label>
						<select
							id="form-jenis"
							bind:value={formData.jenis_peraturan}
							class="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none {fieldErrors.jenis_peraturan ? 'border-red-400' : 'border-zinc-300 dark:border-zinc-700'}"
						>
							{#each JENIS_OPTIONS as jns}
								<option value={jns.value}>{jns.label}</option>
							{/each}
						</select>
						{#if fieldErrors.jenis_peraturan}
							<p class="text-[11px] text-red-500 mt-1">{fieldErrors.jenis_peraturan}</p>
						{/if}
					</div>

					<!-- Tahun -->
					<div>
						<Input
							label="Tahun Penetapan"
							name="tahun"
							type="number"
							required
							placeholder="2023"
							bind:value={formData.tahun}
							error={fieldErrors.tahun}
						/>
					</div>

					<!-- Status Keberlakuan -->
					<div>
						<label for="form-status" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Status Keberlakuan <span class="text-red-500">*</span>
						</label>
						<select
							id="form-status"
							bind:value={formData.status_berlaku}
							class="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none border-zinc-300 dark:border-zinc-700"
						>
							<option value="BERLAKU">Berlaku (Aktif)</option>
							<option value="DIUBAH_OLEH">Diubah Oleh (Telah diubah peraturan lain)</option>
							<option value="DICABUT">Dicabut / Tidak Berlaku</option>
							<option value="MENGUBAH">Mengubah Peraturan Sebelumnya</option>
						</select>
					</div>

					<!-- Tanggal Penetapan -->
					<div>
						<label for="form-tgl-penetapan" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Tanggal Penetapan
						</label>
						<input
							id="form-tgl-penetapan"
							type="date"
							bind:value={formData.tgl_penetapan}
							class="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
						/>
					</div>

					<!-- Tanggal Mulai Berlaku -->
					<div>
						<label for="form-tgl-berlaku" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Tanggal Mulai Berlaku
						</label>
						<input
							id="form-tgl-berlaku"
							type="date"
							bind:value={formData.tgl_berlaku}
							class="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
						/>
					</div>

					<!-- Bagian 1: Peraturan Induk / Dasar Hukum (Hirarki Regulasi ke Atas) -->
					<div class="md:col-span-2 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-1.5">
						<div class="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<span>1. Peraturan Induk / Dasar Hukum (Hirarki Regulasi ke Atas)</span>
						</div>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							Pilih regulasi tingkat lebih tinggi yang menjadi dasar hukum terbitnya peraturan ini (misal: UU ASN, PP Manajemen PNS, atau PermenPAN-RB).
						</p>
						<div class="pt-1">
							<PeraturanSearchSelect
								bind:selectedId={formData.parent_id}
								bind:selectedNomor={parentNomorDisplay}
								showRelasiSelect={false}
								excludeId={formData.id}
								label="Pilih Peraturan Induk / Dasar Hukum"
								placeholder="Cari dasar hukum / induk peraturan (misal: PP No. 11 Tahun 2017)..."
							/>
						</div>
					</div>

					<!-- Bagian 2: Status Hubungan Regulasi Lain (Mengubah / Mencabut Peraturan Sebelumnya) -->
					<div class="md:col-span-2 p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-1.5">
						<div class="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							<span>2. Peraturan Yang Diubah / Dicabut (Status Hubungan Regulasi Selevel)</span>
						</div>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							Jika peraturan baru ini mengubah atau mencabut peraturan lain sebelumnya yang selevel, pilih peraturan target dan tentukan status hubungannya.
						</p>
						<div class="pt-1">
							<PeraturanSearchSelect
								bind:selectedId={formData.peraturan_terkait_id}
								bind:selectedNomor={formData.peraturan_terkait}
								bind:selectedTipeRelasi={formData.tipe_relasi}
								showRelasiSelect={true}
								excludeId={formData.id}
								label="Pilih Peraturan Target & Status Hubungan"
								placeholder="Cari peraturan yang diubah/dicabut (misal: Perbup No. 5 Tahun 2018)..."
							/>
						</div>

						<!-- Banner Notifikasi Otomatis Sinkronisasi Status Target -->
						{#if formData.peraturan_terkait_id && formData.tipe_relasi === 'MENGUBAH'}
							<div class="mt-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span>
									<strong>Sinkronisasi Otomatis:</strong> Peraturan target <strong class="text-blue-900 dark:text-blue-100">"{formData.peraturan_terkait || 'terpilih'}"</strong> akan secara otomatis diubah statusnya dari <strong>Berlaku</strong> menjadi <span class="font-bold underline decoration-blue-500">"Diubah Oleh"</span> saat disimpan.
								</span>
							</div>
						{:else if formData.peraturan_terkait_id && formData.tipe_relasi === 'MENCABUT'}
							<div class="mt-2.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<span>
									<strong>Sinkronisasi Otomatis:</strong> Peraturan target <strong class="text-red-900 dark:text-red-100">"{formData.peraturan_terkait || 'terpilih'}"</strong> akan secara otomatis diubah statusnya menjadi <span class="font-bold underline decoration-red-500">"Dicabut"</span> saat disimpan.
								</span>
							</div>
						{/if}
					</div>

					<!-- Tentang / Ringkasan -->
					<div class="md:col-span-2">
						<label for="form-tentang" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							Tentang / Pokok Regulasi (Opsional)
						</label>
						<textarea
							id="form-tentang"
							rows="2"
							bind:value={formData.tentang}
							placeholder="Ringkasan poin penting atau substansi yang diatur..."
							class="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
						></textarea>
					</div>

					<!-- Upload Dokumen PDF -->
					<div class="md:col-span-2">
						<label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
							File Dokumen PDF Peraturan
						</label>
						<div class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 text-center transition bg-zinc-50/50 dark:bg-zinc-800/40">
							<input
								type="file"
								id="file_peraturan"
								accept=".pdf,application/pdf"
								bind:this={fileInputRef}
								onchange={handleFileSelect}
								class="hidden"
							/>
							<label for="file_peraturan" class="cursor-pointer flex flex-col items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
								<span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
									Klik untuk memilih file PDF atau seret ke sini
								</span>
								<span class="text-[11px] text-zinc-400 mt-0.5">
									Maksimal ukuran file: 25 MB (Hanya PDF)
								</span>
							</label>

							{#if selectedFile}
								<div class="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
									<div class="flex items-center gap-2 truncate">
										<span class="text-red-500 font-bold">PDF</span>
										<span class="font-medium text-emerald-800 dark:text-emerald-300 truncate">{selectedFile.name}</span>
										<span class="text-zinc-400">({formatFileSize(selectedFile.size)})</span>
									</div>
									<button
										type="button"
										onclick={() => { selectedFile = null; if (fileInputRef) fileInputRef.value = ''; }}
										class="text-zinc-400 hover:text-red-500 ml-2"
									>
										&times;
									</button>
								</div>
							{:else if isEditing && formData.file_path}
								<div class="mt-3 p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
									<div class="flex items-center gap-2 truncate">
										<span class="text-red-500 font-bold">PDF Tersimpan:</span>
										<span class="font-medium text-zinc-700 dark:text-zinc-300 truncate">{formData.file_nama_asli || 'dokumen_peraturan.pdf'}</span>
									</div>
									<span class="text-[11px] text-zinc-400 italic">Pilih file baru untuk mengganti</span>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Modal Actions -->
				<div class="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
					<Button variant="secondary" onclick={() => showModal = false} disabled={submitting}>
						Batal
					</Button>
					<Button type="submit" variant="primary" loading={submitting}>
						{isEditing ? 'Simpan Perubahan' : 'Tambahkan Peraturan'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Preview Dokumen PDF In-App -->
{#if showPreviewModal && previewDoc}
	<div class="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
			<!-- Header Modal Preview -->
			<div class="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
				<div class="flex items-center gap-2.5 min-w-0">
					<span class="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
						</svg>
					</span>
					<div class="min-w-0">
						<h4 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
							{previewDoc.nomor_peraturan}
						</h4>
						<p class="text-xs text-zinc-500 truncate">
							{previewDoc.judul}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<a
						href={getFileUrl(previewDoc.file_path)}
						target="_blank"
						rel="noopener noreferrer"
						download
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Unduh PDF
					</a>
					<button
						onclick={() => { showPreviewModal = false; previewDoc = null; }}
						class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- PDF Iframe Container -->
			<div class="flex-1 bg-zinc-100 dark:bg-zinc-950 p-1">
				<iframe
					src="{getFileUrl(previewDoc.file_path)}#toolbar=1"
					title="Dokumen PDF Peraturan"
					class="w-full h-full rounded-lg border-0 bg-white"
				></iframe>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
{#if showDeleteConfirm && itemToDelete}
	<ConfirmDeleteModal
		isOpen={showDeleteConfirm}
		title="Hapus Arsip Peraturan"
		message="Apakah Anda yakin ingin menghapus arsip peraturan '{itemToDelete.nomor_peraturan}'? Data yang dihapus tidak akan ditampilkan lagi di daftar referensi aktif."
		loading={deleteLoading}
		onConfirm={handleDelete}
		onCancel={() => { showDeleteConfirm = false; itemToDelete = null; }}
	/>
{/if}
