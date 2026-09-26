<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import PegawaiSearchModal from '$lib/components/pegawai/PegawaiSearchModal.svelte';

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// State Data Tabel
	let peremajaanList = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedJenisFilter = $state('');
	let page = $state(1);
	let limit = $state(10);
	let total = $state(0);
	let totalPages = $state(1);

	// State Statistik Ringkasan
	let stats = $state({ total: 0, breakdown: [] });
	let jenisOptions = $state([]);

	// State Modal
	let showSearchPegawaiModal = $state(false);
	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let showPreviewModal = $state(false);

	let previewPdfUrl = $state('');
	let previewTitle = $state('');
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);
	let submitting = $state(false);

	// State Form
	let selectedPegawai = $state(null);
	let form = $state({
		pegawai_id: '',
		jns_perubahan_id: '5',
		sk: '',
		tglSk: '',
		tmtSk: '',
		pengesahan: 'KEPALA BADAN KEPEGAWAIAN NEGARA',
		ket: '',
		sync_pegawai: true,
		nama_baru: '',
		nip_baru: '',
		tgl_lahir_baru: '',
		glr_dpn_baru: '',
		glr_blk_baru: ''
	});
	let selectedFileSK = $state(null);
	let fieldErrors = $state({});

	function getBadgeStyle(jnsId) {
		const idNum = Number(jnsId);
		switch (idNum) {
			case 5: // Pencantuman Gelar
				return {
					badge: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
					dot: 'bg-emerald-500'
				};
			case 2: // Perubahan Nama
				return {
					badge: 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300',
					dot: 'bg-blue-500'
				};
			case 3: // Perubahan NIP
				return {
					badge: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
					dot: 'bg-indigo-500'
				};
			case 4: // Perubahan Tanggal Lahir
				return {
					badge: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300',
					dot: 'bg-amber-500'
				};
			default:
				return {
					badge: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
					dot: 'bg-zinc-500'
				};
		}
	}

	onMount(async () => {
		await Promise.all([loadJenisOptions(), loadStats(), loadData()]);
	});

	async function loadJenisOptions() {
		try {
			const res = await api('/peremajaan-data-induk/jenis-options');
			jenisOptions = res.data || [];
			if (jenisOptions.length > 0 && !form.jns_perubahan_id) {
				form.jns_perubahan_id = jenisOptions[0].id.toString();
			}
		} catch (err) {
			console.error('Gagal memuat jenis perubahan:', err);
		}
	}

	async function loadStats() {
		try {
			const res = await api('/peremajaan-data-induk/stats');
			stats = res.data || { total: 0, breakdown: [] };
		} catch (err) {
			console.error('Gagal memuat statistik:', err);
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
				...(selectedJenisFilter ? { jns_perubahan_id: selectedJenisFilter } : {})
			});
			const res = await api(`/peremajaan-data-induk?${query.toString()}`);
			peremajaanList = res.data || [];
			total = res.meta?.total || 0;
			totalPages = res.meta?.totalPages || 1;
		} catch (err) {
			error = err.message || 'Gagal memuat data riwayat peremajaan data induk';
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

	function openCreateModal() {
		selectedPegawai = null;
		form = {
			pegawai_id: '',
			jns_perubahan_id: jenisOptions.length > 0 ? jenisOptions[0].id.toString() : '5',
			sk: '',
			tglSk: '',
			tmtSk: '',
			pengesahan: 'KEPALA BADAN KEPEGAWAIAN NEGARA',
			ket: '',
			sync_pegawai: true,
			nama_baru: '',
			nip_baru: '',
			tgl_lahir_baru: '',
			glr_dpn_baru: '',
			glr_blk_baru: ''
		};
		selectedFileSK = null;
		fieldErrors = {};
		showCreateModal = true;
	}

	function handlePegawaiSelect(peg) {
		selectedPegawai = {
			id: peg.id,
			nama: peg.nama || peg.ta_orang?.nama || '-',
			nipBaru: peg.nipBaru || peg.nip || '-',
			glrDpn: peg.gelar_depan || peg.glrDpn || peg.ta_orang?.glrDpn || peg.rwt_pend?.gd || '',
			glrBlk: peg.gelar_belakang || peg.glrBlk || peg.ta_orang?.glrBlk || peg.rwt_pend?.gb || '',
			tglLhr: peg.tglLhr || peg.ta_orang?.tglLhr || '',
			foto: peg.foto || peg.ta_orang?.foto || null,
			jabatan: peg.jabatan || peg.rwt_jabatan?.nama_jabatan || '-',
			unor: peg.unor || peg.rwt_jabatan?.ref_unitorganisasi?.nmUnor || '-'
		};
		form.pegawai_id = peg.id;
		// Prefill nilai saat ini
		form.nama_baru = selectedPegawai.nama;
		form.nip_baru = selectedPegawai.nipBaru;
		form.glr_dpn_baru = selectedPegawai.glrDpn;
		form.glr_blk_baru = selectedPegawai.glrBlk;
		if (selectedPegawai.tglLhr) {
			form.tgl_lahir_baru = selectedPegawai.tglLhr.split('T')[0];
		}
		showSearchPegawaiModal = false;
	}

	function handleFileChange(e) {
		const file = e.target.files[0];
		if (file) {
			if (file.type !== 'application/pdf') {
				toast.error('File SK harus berformat PDF');
				e.target.value = '';
				selectedFileSK = null;
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				toast.error('Ukuran file maksimal 5 MB');
				e.target.value = '';
				selectedFileSK = null;
				return;
			}
			selectedFileSK = file;
		} else {
			selectedFileSK = null;
		}
	}

	async function handleSubmit() {
		if (!form.pegawai_id) {
			toast.error('Silakan pilih pegawai yang bersangkutan');
			return;
		}

		if (!form.jns_perubahan_id) {
			toast.error('Pilih jenis perubahan data induk');
			return;
		}

		submitting = true;
		fieldErrors = {};

		try {
			const formData = new FormData();
			formData.append('pegawai_id', form.pegawai_id);
			formData.append('jns_perubahan_id', form.jns_perubahan_id);
			if (form.sk) formData.append('sk', form.sk);
			if (form.tglSk) formData.append('tglSk', form.tglSk);
			if (form.tmtSk) formData.append('tmtSk', form.tmtSk);
			if (form.pengesahan) formData.append('pengesahan', form.pengesahan);
			if (form.ket) formData.append('ket', form.ket);
			formData.append('sync_pegawai', form.sync_pegawai.toString());

			if (form.sync_pegawai) {
				if (form.nama_baru) formData.append('nama_baru', form.nama_baru);
				if (form.nip_baru) formData.append('nip_baru', form.nip_baru);
				if (form.tgl_lahir_baru) formData.append('tgl_lahir_baru', form.tgl_lahir_baru);
				if (form.glr_dpn_baru !== undefined) formData.append('glr_dpn_baru', form.glr_dpn_baru);
				if (form.glr_blk_baru !== undefined) formData.append('glr_blk_baru', form.glr_blk_baru);
			}

			if (selectedFileSK) {
				formData.append('file_sk', selectedFileSK);
			}

			const BASE_URL = import.meta.env.VITE_API_URL;
			const res = await fetch(`${BASE_URL}/peremajaan-data-induk`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			const data = await res.json();
			if (!res.ok) {
				if (res.status === 422 && data.errors) {
					fieldErrors = data.errors.reduce((acc, curr) => {
						acc[curr.field] = curr.message;
						return acc;
					}, {});
				}
				throw new Error(data.message || 'Gagal menyimpan perubahan data induk');
			}

			toast.success('Perubahan data induk berhasil disimpan');
			showCreateModal = false;
			await Promise.all([loadStats(), loadData()]);
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat menyimpan');
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(item) {
		itemToDelete = item;
		showDeleteModal = true;
	}

	async function executeDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/peremajaan-data-induk/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Data perubahan data induk berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			await Promise.all([loadStats(), loadData()]);
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data');
		} finally {
			deleteLoading = false;
		}
	}

	function openPdfPreview(item) {
		if (!item.file_sk) return;
		const cleanPath = item.file_sk.replace(/^\/+/, '').trim();
		previewPdfUrl = `${API_BASE}/${cleanPath}`;
		previewTitle = `SK ${item.nama_jenis_perubahan} - ${item.pegawai?.nama || 'Pegawai'}`;
		showPreviewModal = true;
	}
</script>

<svelte:head>
	<title>Peremajaan Data Induk | SIPASN</title>
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
				Peremajaan Data Induk
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
				Pengelolaan riwayat SK Pencantuman Gelar, Koreksi NIP, Perubahan Nama, dan Tanggal Lahir ASN beserta arsip dokumen SK.
			</p>
		</div>

		<Button variant="primary" onclick={openCreateModal} class="shadow-lg shadow-indigo-500/20">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
			Tambah Peremajaan Data Induk
		</Button>
	</div>

	<!-- Stats Bar -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3">
			<div class="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
			</div>
			<div>
				<p class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Riwayat Peremajaan</p>
				<p class="text-xl font-black text-zinc-900 dark:text-zinc-100">{stats.total || total}</p>
			</div>
		</div>

		{#each stats.breakdown as b}
			<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3">
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
					{#if b.id === 5}
						🎓
					{:else if b.id === 3}
						🔢
					{:else if b.id === 2}
						✍️
					{:else}
						📅
					{/if}
				</div>
				<div>
					<p class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[130px]" title={b.label}>{b.label}</p>
					<p class="text-xl font-black text-zinc-900 dark:text-zinc-100">{b.count}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Toolbar & Filters -->
	<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
		<div class="w-full sm:w-80 relative">
			<input
				type="text"
				placeholder="Cari Nama / NIP / No. SK / Keterangan..."
				bind:value={search}
				oninput={handleSearchInput}
				class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
			/>
			<svg class="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
		</div>

		<div class="w-full sm:w-auto flex items-center gap-2">
			<select
				bind:value={selectedJenisFilter}
				onchange={() => { page = 1; loadData(); }}
				class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none font-medium text-zinc-700 dark:text-zinc-300"
			>
				<option value="">Semua Jenis Perubahan</option>
				{#each jenisOptions as opt}
					<option value={opt.id.toString()}>{opt.jns_perubahan}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Table Area -->
	<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
		{#if loading}
			<LoadingState message="Memuat data riwayat peremajaan data induk..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadData} />
		{:else if peremajaanList.length === 0}
			<EmptyState message="Belum ada riwayat peremajaan data induk." icon="📂" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
							<th class="py-3.5 px-4">Pegawai</th>
							<th class="py-3.5 px-4">Jabatan & Unit Organisasi</th>
							<th class="py-3.5 px-4">Jenis Perubahan</th>
							<th class="py-3.5 px-4">SK Perubahan</th>
							<th class="py-3.5 px-4">TMT Berlaku</th>
							<th class="py-3.5 px-4">Keterangan / Detail</th>
							<th class="py-3.5 px-4 text-center">Dokumen SK</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
						{#each peremajaanList as item}
							{@const badgeStyle = getBadgeStyle(item.jns_perubahan_id)}
							<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
								<!-- Pegawai -->
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-3">
										<Avatar
											src={item.pegawai?.foto ? `${API_BASE}/${item.pegawai.foto}` : null}
											name={item.pegawai?.nama || 'P'}
											size="sm"
										/>
										<div>
											<p class="font-bold text-zinc-900 dark:text-zinc-100">
												{#if item.pegawai?.glrDpn}{item.pegawai.glrDpn} {/if}
												{item.pegawai?.nama || '-'}
												{#if item.pegawai?.glrBlk}, {item.pegawai.glrBlk}{/if}
											</p>
											<p class="text-[11px] font-mono text-zinc-500">NIP: {item.pegawai?.nipBaru || '-'}</p>
										</div>
									</div>
								</td>

								<!-- Jabatan & Unor -->
								<td class="py-3.5 px-4 max-w-xs">
									<p class="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.pegawai?.jabatan || '-'}</p>
									<p class="text-[11px] text-zinc-500 truncate">{item.pegawai?.unor || '-'}</p>
								</td>

								<!-- Jenis Perubahan -->
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-[10px] uppercase tracking-wider {badgeStyle.badge}">
										<span class="w-1.5 h-1.5 rounded-full {badgeStyle.dot}"></span>
										{item.nama_jenis_perubahan || 'Perubahan'}
									</span>
								</td>

								<!-- SK -->
								<td class="py-3.5 px-4">
									<p class="font-bold text-zinc-900 dark:text-zinc-100">{item.sk || '-'}</p>
									<p class="text-[11px] text-zinc-500">
										Tgl: {item.tglSk ? new Date(item.tglSk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
									</p>
								</td>

								<!-- TMT Berlaku -->
								<td class="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">
									{item.tmtSk ? new Date(item.tmtSk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
								</td>

								<!-- Keterangan -->
								<td class="py-3.5 px-4 max-w-xs text-zinc-600 dark:text-zinc-300">
									<p class="line-clamp-2 text-xs">{item.ket || '-'}</p>
								</td>

								<!-- Dokumen SK -->
								<td class="py-3.5 px-4 text-center">
									{#if item.file_sk}
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												openPdfPreview(item);
											}}
											class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
											Lihat SK
										</button>
									{:else}
										<span class="text-[11px] text-zinc-400 italic">Tidak ada file</span>
									{/if}
								</td>

								<!-- Aksi -->
								<td class="py-3.5 px-4 text-right">
									<button
										type="button"
										onclick={() => confirmDelete(item)}
										class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
										title="Hapus / Batalkan Perubahan"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			<div class="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
				<div>
					Menampilkan <span class="font-bold text-zinc-700 dark:text-zinc-300">{(page - 1) * limit + 1}</span> sampai <span class="font-bold text-zinc-700 dark:text-zinc-300">{Math.min(page * limit, total)}</span> dari <span class="font-bold text-zinc-700 dark:text-zinc-300">{total}</span> data
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="ghost"
						disabled={page <= 1}
						onclick={() => { page--; loadData(); }}
					>
						Sebelumnya
					</Button>
					<span class="px-3 py-1 font-bold text-zinc-700 dark:text-zinc-300">
						Halaman {page} dari {totalPages}
					</span>
					<Button
						variant="ghost"
						disabled={page >= totalPages}
						onclick={() => { page++; loadData(); }}
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Form Tambah Peremajaan Data Induk -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
				<div>
					<h2 class="text-base font-bold text-zinc-900 dark:text-zinc-50">Form Peremajaan Data Induk Pegawai</h2>
					<p class="text-xs text-zinc-500">Pencatatan SK Pencantuman Gelar, Koreksi NIP, Nama, atau Tanggal Lahir.</p>
				</div>
				<button onclick={() => showCreateModal = false} class="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 overflow-y-auto space-y-5">
				<!-- Step 1: Select Pegawai -->
				<div class="space-y-2">
					<label class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
						Pegawai yang Bersangkutan <span class="text-rose-500">*</span>
					</label>

					{#if selectedPegawai}
						<div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Avatar
									src={selectedPegawai.foto ? `${API_BASE}/${selectedPegawai.foto}` : null}
									name={selectedPegawai.nama}
									size="md"
								/>
								<div>
									<h4 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
										{#if selectedPegawai.glrDpn}{selectedPegawai.glrDpn} {/if}
										{selectedPegawai.nama}
										{#if selectedPegawai.glrBlk}, {selectedPegawai.glrBlk}{/if}
									</h4>
									<p class="text-xs font-mono text-zinc-500">NIP: {selectedPegawai.nipBaru}</p>
									<p class="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{selectedPegawai.jabatan} — {selectedPegawai.unor}</p>
								</div>
							</div>
							<Button variant="ghost" onclick={() => showSearchPegawaiModal = true} class="text-xs">
								Ganti Pegawai
							</Button>
						</div>
					{:else}
						<button
							type="button"
							onclick={() => showSearchPegawaiModal = true}
							class="w-full p-6 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
						>
							<div class="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 transition-colors">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							</div>
							<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Klik untuk Cari & Pilih Pegawai</span>
							<span class="text-[11px] text-zinc-400">Pencarian berdasarkan NIP, Nama Lengkap, atau Unit Organisasi</span>
						</button>
					{/if}
				</div>

				<!-- Step 2: Form Details -->
				<div class="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
					<div class="space-y-1">
						<label for="jns_perubahan_id" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
							Jenis Perubahan Data Induk <span class="text-rose-500">*</span>
						</label>
						<select
							id="jns_perubahan_id"
							bind:value={form.jns_perubahan_id}
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-800 dark:text-zinc-200"
						>
							{#each jenisOptions as opt}
								<option value={opt.id.toString()}>{opt.jns_perubahan}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input
							label="Nomor SK Perubahan"
							bind:value={form.sk}
							placeholder="Contoh: KR.IV.B.26-25/M.66-724/2026"
							error={fieldErrors.sk}
						/>

						<Input
							label="Tanggal SK"
							type="date"
							bind:value={form.tglSk}
							error={fieldErrors.tglSk}
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input
							label="TMT Berlaku"
							type="date"
							bind:value={form.tmtSk}
							error={fieldErrors.tmtSk}
						/>

						<Input
							label="Pejabat / Instansi Pengesah"
							bind:value={form.pengesahan}
							placeholder="Contoh: KEPALA BADAN KEPEGAWAIAN NEGARA"
							error={fieldErrors.pengesahan}
						/>
					</div>

					<!-- File Upload SK -->
					<div class="space-y-1">
						<label for="file_sk" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
							File Dokumen SK (PDF)
						</label>
						<input
							id="file_sk"
							type="file"
							accept="application/pdf"
							onchange={handleFileChange}
							class="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
						/>
						<p class="text-[10px] text-zinc-400">Format PDF, maksimal 5MB</p>
					</div>

					<div class="space-y-1">
						<label for="ket" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
							Keterangan / Rincian Perubahan
						</label>
						<textarea
							id="ket"
							bind:value={form.ket}
							placeholder="Catatan detail perubahan, misal: Pencantuman gelar S.Kom sesuai ijazah dan SK BKN..."
							rows="2"
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
						></textarea>
					</div>

					<!-- Option Sinkronisasi ke Profil Pegawai -->
					{#if selectedPegawai}
						<div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={form.sync_pegawai}
									class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-zinc-300"
								/>
								<span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
									Sinkronkan otomatis perubahan ke Profil Pokok Pegawai
								</span>
							</label>

							{#if form.sync_pegawai}
								{#if form.jns_perubahan_id === '5'}
									<!-- Pencantuman Gelar -->
									<div class="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
										<Input
											label="Gelar Depan Baru"
											bind:value={form.glr_dpn_baru}
											placeholder="Contoh: Drs. / Dr."
										/>
										<Input
											label="Gelar Belakang Baru"
											bind:value={form.glr_blk_baru}
											placeholder="Contoh: S.Kom / M.Si"
										/>
									</div>
								{:else if form.jns_perubahan_id === '2'}
									<!-- Perubahan Nama -->
									<div class="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
										<Input
											label="Nama Baru Pegawai (tanpa gelar)"
											bind:value={form.nama_baru}
											placeholder="Nama baru yang telah diperbaiki"
										/>
									</div>
								{:else if form.jns_perubahan_id === '3'}
									<!-- Perubahan NIP -->
									<div class="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
										<Input
											label="NIP Baru Pegawai (18 digit)"
											bind:value={form.nip_baru}
											placeholder="Contoh: 198001012005011001"
										/>
									</div>
								{:else if form.jns_perubahan_id === '4'}
									<!-- Perubahan Tanggal Lahir -->
									<div class="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
										<Input
											label="Tanggal Lahir Baru"
											type="date"
											bind:value={form.tgl_lahir_baru}
										/>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showCreateModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting} disabled={!selectedPegawai}>
					Simpan Peremajaan
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Search Pegawai -->
<PegawaiSearchModal
	open={showSearchPegawaiModal}
	onSelect={handlePegawaiSelect}
	onClose={() => showSearchPegawaiModal = false}
/>

<!-- Modal Delete Confirmation -->
<ConfirmDeleteModal
	bind:show={showDeleteModal}
	title="Hapus Riwayat Peremajaan Data Induk?"
	message="Catatan riwayat SK ini akan dihapus dari sistem."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>

<!-- Modal Preview Dokumen SK -->
{#if showPreviewModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
			<!-- Header Modal Preview -->
			<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
					</div>
					<div>
						<h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{previewTitle}</h3>
						<p class="text-xs text-zinc-500">Pratinjau Dokumen SK PDF</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<a
						href={previewPdfUrl}
						target="_blank"
						download
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
						Unduh
					</a>
					<button
						onclick={() => showPreviewModal = false}
						class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
					</button>
				</div>
			</div>

			<!-- PDF Viewer Embed -->
			<div class="flex-1 bg-zinc-100 dark:bg-zinc-950 p-2 sm:p-4">
				<iframe
					src={previewPdfUrl}
					title="Dokumen SK"
					class="w-full h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white"
				></iframe>
			</div>
		</div>
	</div>
{/if}
