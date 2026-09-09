<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import UnorTreeSelect from '$lib/components/ui/UnorTreeSelect.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import PegawaiSearchModal from '$lib/components/pegawai/PegawaiSearchModal.svelte';

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
	const skId = $page.params.id;

	// State Data SK Kolektif
	let skDetail = $state(null);
	let loading = $state(true);
	let error = $state(null);

	// Master Referensi
	let refJenisJabatan = $state([]);
	let refJenjangJabatan = $state([]);
	let refUnorInduk = $state([]);
	let refUnorTree = $state([]);
	let refEselon = $state([]);
	let refDaftarJabatan = $state([]);
	let refJenjangEselonMap = $state({});
	let loadingRef = $state(false);

	// Modal States
	let showSearchPegawaiModal = $state(false);
	let showAddPegawaiModal = $state(false);
	let showDeleteModal = $state(false);
	let showProcessModal = $state(false);
	let showPreviewModal = $state(false);

	let previewPdfUrl = $state('');
	let previewTitle = $state('');

	let itemToDelete = $state(null);
	let deleteLoading = $state(false);
	let submittingPegawai = $state(false);
	let processingKolektif = $state(false);

	// Form Tambah Pegawai State
	let selectedPegawai = $state(null);
	let formPegawai = $state({
		pegawai_id: '',
		nip: '',
		nama: '',
		jabatan_saat_ini: '',
		unit_kerja_saat_ini: '',
		jns_jab_id: '',
		unor_id: '',
		nm_jab_id: '',
		nama_jabatan: '',
		eselon_id: '',
		keterangan: ''
	});
	let formPegawaiErrors = $state({});

	onMount(async () => {
		await Promise.all([loadDetail(), loadReferensi()]);
	});

	async function loadDetail() {
		loading = true;
		error = null;
		try {
			const res = await api(`/peremajaan-kolektif/${skId}`);
			skDetail = res.data;
		} catch (err) {
			error = err.message || 'Gagal memuat rincian SK Kolektif';
		} finally {
			loading = false;
		}
	}

	async function loadReferensi() {
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/jabatan');
			if (res?.data) {
				refJenisJabatan = res.data.jenis_jabatan || [];
				refJenjangJabatan = res.data.jenjang_jabatan || [];
				refUnorInduk = res.data.unor_induk || [];
				refUnorTree = res.data.unor_tree || [];
				refEselon = res.data.eselon || [];
				refDaftarJabatan = res.data.daftar_jabatan || [];
				refJenjangEselonMap = res.data.jenjang_eselon_map || {};
			}
		} catch (err) {
			console.error('Gagal memuat master referensi jabatan:', err);
		} finally {
			loadingRef = false;
		}
	}

	// Unor Options untuk Combobox / Tree
	let unorOptions = $derived(
		refUnorInduk.map((u) => ({
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

	let selectedJenjangObj = $derived(
		refJenjangJabatan.find((j) => String(j.id) === String(formPegawai.jns_jab_id))
	);

	let selectedJenisJabatanObj = $derived(
		refJenisJabatan.find((j) => String(j.id) === String(formPegawai.jns_jab_id))
	);

	let jenjangText = $derived.by(() => {
		let text = '';
		if (selectedJenjangObj) {
			text += (selectedJenjangObj.jenjangjab || '') + ' ' + (selectedJenjangObj.jnsjab || '') + ' ';
		}
		if (selectedJenisJabatanObj) {
			text += (selectedJenisJabatanObj.jnsjab || '') + ' ';
		}
		return text.toUpperCase().trim();
	});

	let isPelaksana = $derived(
		jenjangText.includes('PELAKSANA') || 
		jenjangText.includes('FUNGSIONAL UMUM') || 
		jenjangText.includes('JFU')
	);
	let isFungsional = $derived(
		jenjangText.includes('FUNGSIONAL') ||
		jenjangText.includes('JF') ||
		jenjangText.includes('KEAHLIAN') ||
		jenjangText.includes('KETRAMPILAN') ||
		jenjangText.includes('TERTENTU')
	);
	let isStruktural = $derived(
		jenjangText.includes('STRUKTURAL') ||
		jenjangText.includes('PIMPINAN') ||
		jenjangText.includes('ADMINISTRATOR') ||
		jenjangText.includes('PENGAWAS') ||
		(!isPelaksana && !isFungsional && Boolean(formPegawai.jns_jab_id))
	);

	let filteredJabatanOptions = $derived.by(() => {
		let list = refDaftarJabatan;

		if (isPelaksana) {
			const filtered = refDaftarJabatan.filter(
				(j) => (j.tipe || j.kategori || '').toUpperCase() === 'PELAKSANA'
			);
			if (filtered.length > 0) list = filtered;
		} else if (isFungsional) {
			const filtered = refDaftarJabatan.filter(
				(j) => (j.tipe || j.kategori || '').toUpperCase() === 'FUNGSIONAL'
			);
			if (filtered.length > 0) list = filtered;
		} else if (isStruktural) {
			const filtered = refDaftarJabatan.filter(
				(j) => (j.tipe || j.kategori || '').toUpperCase() === 'STRUKTURAL'
			);
			if (filtered.length > 0) list = filtered;
		}

		// Deduplikasi berdasarkan id atau nama jabatan
		const seen = new Set();
		const uniqueList = [];
		for (const j of list) {
			const key = j.id ? String(j.id) : (j.nama || j.nama_jabatan || '').toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				uniqueList.push(j);
			}
		}

		return uniqueList.map((j) => ({
			id: j.id,
			value: j.id,
			label: j.nama || j.nama_jabatan || j.nm_jab || j.nmJab || '-',
			tipe: j.tipe || j.kategori || '',
			eselon_id: j.eselon_id || null,
			jns_jab_id: j.jns_jab_id || null,
		}));
	});

	let eselonOptions = $derived.by(() => {
		if (isFungsional || isPelaksana) {
			const nonEselon = refEselon.filter((e) => (e.eselon || '').toUpperCase().includes('NON'));
			if (nonEselon.length > 0) return nonEselon;
		}
		const validEselonIds = refJenjangEselonMap[String(formPegawai.jns_jab_id)];
		if (validEselonIds && validEselonIds.length > 0) {
			const filtered = refEselon.filter((e) => validEselonIds.includes(e.id));
			if (filtered.length > 0) return filtered;
		}
		return refEselon;
	});

	function handleJenisJabatanChange(e) {
		const newJnsJabId = e.target.value;
		formPegawai.jns_jab_id = newJnsJabId;
		formPegawai.nm_jab_id = ''; // Reset pilihan nama jabatan saat jenis jabatan berubah

		const nonEselon = refEselon.find((es) => (es.eselon || '').toUpperCase().includes('NON'));

		if (isFungsional || isPelaksana) {
			formPegawai.eselon_id = nonEselon ? nonEselon.id : '';
		} else {
			const validEselonIds = refJenjangEselonMap[String(newJnsJabId)];
			if (validEselonIds && validEselonIds.length > 0) {
				if (!formPegawai.eselon_id || !validEselonIds.includes(formPegawai.eselon_id)) {
					formPegawai.eselon_id = validEselonIds[0];
				}
			}
		}
	}

	function handleJabatanChange(jabId, opt) {
		formPegawai.nm_jab_id = jabId || '';
		if (opt) {
			if (opt.tipe === 'FUNGSIONAL' || opt.tipe === 'PELAKSANA') {
				const nonEselon = refEselon.find((es) => (es.eselon || '').toUpperCase().includes('NON'));
				formPegawai.eselon_id = nonEselon ? nonEselon.id : '';
			} else if (opt.eselon_id) {
				formPegawai.eselon_id = opt.eselon_id;
			}
		}
	}

	function handleSelectPegawaiFromModal(pegawaiItem) {
		selectedPegawai = pegawaiItem;
		formPegawai.pegawai_id = pegawaiItem.id;
		formPegawai.nip = pegawaiItem.nip || pegawaiItem.nipBaru || '';
		formPegawai.nama = pegawaiItem.nama || pegawaiItem.nama_formatted || pegawaiItem.ta_orang?.nama || '';
		formPegawai.jabatan_saat_ini = pegawaiItem.jabatan || pegawaiItem.rwt_jabatan?.ref_jabatan?.nama_jabatan || '-';
		formPegawai.unit_kerja_saat_ini = pegawaiItem.unit_kerja || pegawaiItem.rwt_jabatan?.ref_unitorganisasi?.nmUnor || '';
		showSearchPegawaiModal = false;
		showAddPegawaiModal = true;
	}

	function openAddPegawaiModal() {
		selectedPegawai = null;
		formPegawai = {
			pegawai_id: '',
			nip: '',
			nama: '',
			jabatan_saat_ini: '',
			unit_kerja_saat_ini: '',
			jns_jab_id: refJenjangJabatan[0]?.id || refJenisJabatan[0]?.id || '',
			unor_id: '',
			nm_jab_id: '',
			nama_jabatan: '',
			eselon_id: '',
			keterangan: ''
		};
		formPegawaiErrors = {};
		showSearchPegawaiModal = true;
	}

	function handleUnorChange(unorId) {
		formPegawai.unor_id = unorId;
		const selectedUnor = unorOptions.find((u) => u.id === unorId);
		if (selectedUnor) {
			if (selectedUnor.jab_id && !formPegawai.nm_jab_id && !isFungsional && !isPelaksana) {
				formPegawai.nm_jab_id = selectedUnor.jab_id;
			}
			if (selectedUnor.eselon_id && !isFungsional && !isPelaksana) {
				formPegawai.eselon_id = selectedUnor.eselon_id;
			}
			if (selectedUnor.jenjang_jab_id) {
				formPegawai.jns_jab_id = selectedUnor.jenjang_jab_id;
			} else if (selectedUnor.jns_jab_id) {
				formPegawai.jns_jab_id = selectedUnor.jns_jab_id;
			}
		}
	}

	async function handleSubmitPegawai(event) {
		event.preventDefault();
		formPegawaiErrors = {};

		if (!formPegawai.pegawai_id) {
			formPegawaiErrors.pegawai_id = 'Pilih pegawai terlebih dahulu';
			return;
		}
		if (!formPegawai.unor_id) {
			formPegawaiErrors.unor_id = 'Pilih Unit Organisasi (OPD) tujuan';
			return;
		}
		if (!formPegawai.jns_jab_id) {
			formPegawaiErrors.jns_jab_id = 'Pilih jenis jabatan';
			return;
		}

		submittingPegawai = true;
		try {
			await api(`/peremajaan-kolektif/${skId}/pegawai`, {
				method: 'POST',
				body: JSON.stringify({
					pegawai_id: formPegawai.pegawai_id,
					nip: formPegawai.nip,
					nama: formPegawai.nama,
					jns_jab_id: formPegawai.jns_jab_id ? String(formPegawai.jns_jab_id) : null,
					unor_id: formPegawai.unor_id,
					nm_jab_id: formPegawai.nm_jab_id || null,
					eselon_id: formPegawai.eselon_id || null,
					keterangan: formPegawai.keterangan || null,
				}),
			});

			toast.success(`Pegawai ${formPegawai.nama} berhasil ditambahkan`);
			showAddPegawaiModal = false;
			await loadDetail();
		} catch (err) {
			if (err.errors) {
				formPegawaiErrors = err.errors;
			}
			toast.error(err.message || 'Gagal menambahkan pegawai ke SK');
		} finally {
			submittingPegawai = false;
		}
	}

	function confirmRemovePegawai(item) {
		itemToDelete = item;
		showDeleteModal = true;
	}

	async function handleRemovePegawai() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/peremajaan-kolektif/${skId}/pegawai/${itemToDelete.id}`, {
				method: 'DELETE',
			});
			toast.success('Pegawai berhasil dihapus dari daftar SK');
			showDeleteModal = false;
			itemToDelete = null;
			await loadDetail();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus pegawai');
		} finally {
			deleteLoading = false;
		}
	}

	async function handleExecuteProcess() {
		processingKolektif = true;
		try {
			const res = await api(`/peremajaan-kolektif/${skId}/process`, {
				method: 'POST',
			});
			toast.success(res.message || 'SK Kolektif berhasil diproses ke Riwayat Jabatan');
			showProcessModal = false;
			await loadDetail();
		} catch (err) {
			toast.error(err.message || 'Gagal memproses SK Kolektif');
		} finally {
			processingKolektif = false;
		}
	}

	function getFileUrl(filePath) {
		if (!filePath || typeof filePath !== 'string') return '';
		const cleanPath = filePath.replace(/^\/+/, '').trim();
		if (!cleanPath) return '';
		if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;
		return API_BASE ? `${API_BASE}/${cleanPath}` : `/${cleanPath}`;
	}

	function previewDocument() {
		if (!skDetail?.arsip_path) {
			toast.info('Dokumen SK Kolektif belum diunggah');
			return;
		}
		previewPdfUrl = getFileUrl(skDetail.arsip_path);
		previewTitle = `SK Kolektif - ${skDetail.no_sk}`;
		showPreviewModal = true;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
		} catch (e) {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>Rincian SK Kolektif | SIPASN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Navigation Bar -->
	<div class="flex items-center justify-between gap-4">
		<button
			onclick={() => goto('/peremajaan-kolektif')}
			class="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
			Kembali ke Daftar SK Kolektif
		</button>

		<div class="flex items-center gap-3">
			{#if skDetail?.status === 'DRAFT'}
				<Button variant="secondary" onclick={openAddPegawaiModal}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
					Tambah Pegawai
				</Button>
				<button
					onclick={() => (showProcessModal = true)}
					disabled={!skDetail?.pegawai_list || skDetail.pegawai_list.length === 0}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
					Proses ke Riwayat Jabatan
				</button>
			{/if}
		</div>
	</div>

	{#if loading}
		<LoadingState message="Memuat rincian SK Kolektif..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadDetail} />
	{:else if skDetail}
		<!-- Header Summary Card -->
		<div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm p-6 space-y-5">
			<div class="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
				<div class="space-y-1">
					<div class="flex items-center gap-2.5">
						<span class="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
							SK Kolektif
						</span>
						{#if skDetail.status === 'PROCESSED'}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
								Diproses (Selesai)
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider">
								<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
								Draft
							</span>
						{/if}
					</div>
					<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
						{skDetail.no_sk}
					</h1>
					{#if skDetail.keterangan}
						<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
							{skDetail.keterangan}
						</p>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					{#if skDetail.arsip_path}
						<button
							type="button"
							onclick={previewDocument}
							class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
							Lihat Berkas Arsip PDF
						</button>
					{:else}
						<span class="text-xs text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
							Belum ada berkas SK diunggah
						</span>
					{/if}
				</div>
			</div>

			<!-- Metadata Grid -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div class="p-4 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
					<span class="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Tanggal Penetapan SK</span>
					<p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
						{formatDate(skDetail.tgl_sk)}
					</p>
				</div>

				<div class="p-4 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
					<span class="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] uppercase tracking-wider">TMT Jabatan</span>
					<p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
						{formatDate(skDetail.tmt_sk)}
					</p>
				</div>

				<div class="p-4 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
					<span class="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Pejabat Pengesahan</span>
					<p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 truncate" title={skDetail.pengesahan}>
						{skDetail.pengesahan || '-'}
					</p>
				</div>

				<div class="p-4 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
					<span class="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Total Pegawai</span>
					<p class="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">
						👥 {skDetail.pegawai_list?.length || 0} Orang
					</p>
				</div>
			</div>

			{#if skDetail.status === 'PROCESSED'}
				<div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
					<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<div>
						<span class="font-bold">SK Kolektif ini telah berhasil diproses ke Riwayat Jabatan seluruh pegawai.</span>
						<p class="text-emerald-700 dark:text-emerald-400 mt-0.5">
							Waktu proses: {formatDate(skDetail.processed_at)}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Table of Pegawai -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
			<div class="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
						Daftar Rincian Pegawai
					</h2>
					<span class="px-2.5 py-0.5 text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full">
						{skDetail.pegawai_list?.length || 0}
					</span>
				</div>

				{#if skDetail.status === 'DRAFT'}
					<button
						onclick={openAddPegawaiModal}
						class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
					>
						+ Tambah Pegawai Lagi
					</button>
				{/if}
			</div>

			{#if !skDetail.pegawai_list || skDetail.pegawai_list.length === 0}
				<EmptyState
					title="Belum Ada Pegawai Ditambahkan"
					message="Klik tombol 'Tambah Pegawai' di atas untuk memasukkan pegawai ke dalam SK Kolektif ini."
					icon="👥"
				/>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
								<th class="py-3.5 px-4 w-12 text-center">No</th>
								<th class="py-3.5 px-4">Pegawai</th>
								<th class="py-3.5 px-4">Jenis Jabatan</th>
								<th class="py-3.5 px-4">Unit Organisasi (OPD)</th>
								<th class="py-3.5 px-4">Jabatan Baru</th>
								<th class="py-3.5 px-4 text-center">Status</th>
								{#if skDetail.status === 'DRAFT'}
									<th class="py-3.5 px-4 text-right">Aksi</th>
								{/if}
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
							{#each skDetail.pegawai_list as item, index}
								<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
									<td class="py-3.5 px-4 text-center font-medium text-zinc-400">
										{index + 1}
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-3">
											<Avatar
												name={item.nama || 'P'}
												size="sm"
											/>
											<div>
												<p class="font-bold text-zinc-900 dark:text-zinc-100">{item.nama || '-'}</p>
												<p class="text-[11px] font-mono text-zinc-500">NIP: {item.nip}</p>
											</div>
										</div>
									</td>
									<td class="py-3.5 px-4 whitespace-nowrap">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider">
											{item.nama_jns_jab || '-'}
										</span>
									</td>
									<td class="py-3.5 px-4 font-medium text-zinc-700 dark:text-zinc-300">
										{item.nama_unor || '-'}
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-indigo-600 dark:text-indigo-400">{item.nama_jabatan || '-'}</p>
										{#if item.nama_eselon && item.nama_eselon !== '-'}
											<p class="text-[11px] text-zinc-400 font-normal mt-0.5">
												Eselon: {item.nama_eselon}
											</p>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										{#if item.status === 'PROCESSED'}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												Tersimpan di Riwayat
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
												Draft
											</span>
										{/if}
									</td>
									{#if skDetail.status === 'DRAFT'}
										<td class="py-3.5 px-4 text-right whitespace-nowrap">
											<button
												onclick={() => confirmRemovePegawai(item)}
												class="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
												title="Hapus Pegawai dari SK"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
											</button>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Pencarian Pegawai ASN -->
<PegawaiSearchModal
	open={showSearchPegawaiModal}
	onSelect={handleSelectPegawaiFromModal}
	onClose={() => (showSearchPegawaiModal = false)}
/>

<!-- Modal Form Lengkapi Data Jabatan & Unit Kerja Pegawai -->
{#if showAddPegawaiModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-50">
					Tambah Pegawai ke SK Kolektif
				</h3>
				<button
					onclick={() => (showAddPegawaiModal = false)}
					class="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<form onsubmit={handleSubmitPegawai} class="p-6 overflow-y-auto space-y-4 flex-1">
				<!-- Selected Pegawai Preview Card -->
				<div class="p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-4">
					<div class="flex items-center gap-3.5 min-w-0">
						<Avatar
							name={formPegawai.nama || 'P'}
							size="md"
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<h4 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
								{formPegawai.nama || '-'}
							</h4>
							<p class="text-[11px] font-mono font-medium text-zinc-500">
								NIP. {formPegawai.nip}
							</p>
							{#if formPegawai.jabatan_saat_ini && formPegawai.jabatan_saat_ini !== '-'}
								<div class="flex items-start gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5 pt-1.5 border-t border-indigo-100/70 dark:border-indigo-900/40">
									<svg class="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
									<div class="flex-1 leading-snug">
										<p class="font-bold text-zinc-800 dark:text-zinc-200">
											{formPegawai.jabatan_saat_ini}
										</p>
										{#if formPegawai.unit_kerja_saat_ini && formPegawai.unit_kerja_saat_ini !== '-'}
											<p class="text-zinc-500 dark:text-zinc-400 font-normal text-[11px] mt-0.5">
												{formPegawai.unit_kerja_saat_ini}
											</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<button
						type="button"
						onclick={() => {
							showAddPegawaiModal = false;
							showSearchPegawaiModal = true;
						}}
						class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer shrink-0"
					>
						Ganti Pegawai
					</button>
				</div>

				<!-- Unit Organisasi (OPD) Tree Selection -->
				<div class="space-y-1">
					<UnorTreeSelect
						label="Unit Organisasi / Unit Kerja (OPD) Tujuan"
						required={true}
						tree={refUnorTree}
						flatOptions={unorOptions}
						value={formPegawai.unor_id}
						onchange={handleUnorChange}
					/>
					{#if formPegawaiErrors.unor_id}
						<p class="text-2xs text-rose-500">{formPegawaiErrors.unor_id}</p>
					{/if}
				</div>

				<!-- Jenis Jabatan Selection (Pelaksana / Fungsional / Struktural) -->
				<div class="space-y-1">
					<label for="pegawai_jns_jab" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Jenis Jabatan Baru <span class="text-rose-500">*</span>
					</label>
					<select
						id="pegawai_jns_jab"
						value={formPegawai.jns_jab_id}
						onchange={handleJenisJabatanChange}
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border {formPegawaiErrors.jns_jab_id ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
					>
						<option value="">Pilih Jenis Jabatan</option>
						{#each refJenjangJabatan.length > 0 ? refJenjangJabatan : refJenisJabatan as jab}
							<option value={jab.id}>{jab.jenjangjab || jab.jnsjab}</option>
						{/each}
					</select>
					{#if formPegawaiErrors.jns_jab_id}
						<p class="text-2xs text-rose-500">{formPegawaiErrors.jns_jab_id}</p>
					{/if}
				</div>

				<!-- Nama Jabatan Selection -->
				<div class="space-y-1">
					<label for="pegawai_jabatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Nama Jabatan Baru
					</label>
					<Combobox
						options={filteredJabatanOptions}
						bind:value={formPegawai.nm_jab_id}
						onchange={handleJabatanChange}
						placeholder="Cari atau pilih nama jabatan..."
					/>
				</div>

				<!-- Eselon Selection (Jika Struktural / Memiliki Eselon) -->
				<div class="space-y-1">
					<label for="pegawai_eselon" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Eselon {isFungsional || isPelaksana ? '(Non-Eselon)' : '(Opsional)'}
					</label>
					<select
						id="pegawai_eselon"
						bind:value={formPegawai.eselon_id}
						disabled={isFungsional || isPelaksana}
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-900/60"
					>
						<option value="">Non-Eselon / Tanpa Eselon</option>
						{#each eselonOptions as eselon}
							<option value={eselon.id}>{eselon.eselon}</option>
						{/each}
					</select>
				</div>

				<!-- Keterangan Tambahan -->
				<div class="space-y-1">
					<label for="pegawai_ket" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Keterangan / Catatan (Opsional)
					</label>
					<input
						id="pegawai_ket"
						type="text"
						bind:value={formPegawai.keterangan}
						placeholder="Contoh: Rotasi / Promosi Jabatan"
						class="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
					/>
				</div>

				<div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200/80 dark:border-zinc-800">
					<Button variant="ghost" onclick={() => (showAddPegawaiModal = false)}>
						Batal
					</Button>
					<Button type="submit" variant="primary" loading={submittingPegawai} class="shadow-lg shadow-indigo-500/20">
						Simpan Pegawai
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Eksekusi Proses Kolektif -->
{#if showProcessModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
			<div class="flex items-center gap-3">
				<div class="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
				</div>
				<div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-50">
						Proses Peremajaan ke Riwayat Jabatan
					</h3>
					<p class="text-xs text-zinc-500 dark:text-zinc-400">
						Konfirmasi eksekusi penyimpanan massal
					</p>
				</div>
			</div>

			<div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
				<p>
					Apakah Anda yakin ingin memproses <span class="font-bold text-indigo-600 dark:text-indigo-400">{skDetail?.pegawai_list?.length || 0} pegawai</span> ke dalam <strong>Riwayat Jabatan</strong> masing-masing?
				</p>
				<ul class="list-disc list-inside space-y-1 text-zinc-500 dark:text-zinc-400 pt-1">
					<li>Nomor SK: <span class="font-bold text-zinc-700 dark:text-zinc-200">{skDetail?.no_sk}</span></li>
					<li>TMT Jabatan: <span class="font-bold text-zinc-700 dark:text-zinc-200">{formatDate(skDetail?.tmt_sk)}</span></li>
					<li>Hanya 1 file arsip SK fisik di server yang ditautkan ke seluruh pegawai.</li>
					<li>Jabatan aktif pegawai akan otomatis disinkronisasi ke data utama.</li>
				</ul>
			</div>

			<div class="pt-2 flex items-center justify-end gap-3 border-t border-zinc-200/80 dark:border-zinc-800">
				<Button variant="ghost" onclick={() => (showProcessModal = false)} disabled={processingKolektif}>
					Batal
				</Button>
				<button
					onclick={handleExecuteProcess}
					disabled={processingKolektif}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
				>
					{#if processingKolektif}
						<span class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
						<span>Memproses...</span>
					{:else}
						<span>Ya, Proses Sekarang</span>
					{/if}
				</button>
			</div>
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

<!-- Modal Konfirmasi Hapus Pegawai -->
<ConfirmDeleteModal
	open={showDeleteModal}
	title="Hapus Pegawai dari SK"
	message={`Apakah Anda yakin ingin menghapus ${itemToDelete?.nama} (${itemToDelete?.nip}) dari daftar SK Kolektif ini?`}
	loading={deleteLoading}
	onConfirm={handleRemovePegawai}
	onCancel={() => { showDeleteModal = false; itemToDelete = null; }}
/>
