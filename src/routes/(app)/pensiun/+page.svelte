<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import PegawaiSearchModal from '$lib/components/pegawai/PegawaiSearchModal.svelte';

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// Table Data State
	let pensiunList = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedKedudukanFilter = $state('');
	let page = $state(1);
	let limit = $state(10);
	let total = $state(0);
	let totalPages = $state(1);

	// Kedudukan Options
	let kedudukanOptions = $state([]);

	// Modal States
	let showSearchPegawaiModal = $state(false);
	let showProcessModal = $state(false);
	let showDeleteModal = $state(false);
	let showPreviewModal = $state(false);

	let previewPdfUrl = $state('');
	let previewTitle = $state('');

	let itemToDelete = $state(null);
	let deleteLoading = $state(false);
	let submitting = $state(false);

	// Selected Pegawai & Form State
	let selectedPegawai = $state(null);
	let form = $state({
		pegawai_id: '',
		kedudukanpns_id: '',
		no_sk: '',
		tgl_sk: '',
		tmt_pensiun: '',
		ket: ''
	});
	let selectedFileSK = $state(null);
	let fieldErrors = $state({});

	onMount(async () => {
		await loadKedudukanOptions();
		await loadData();
	});

	async function loadKedudukanOptions() {
		try {
			const res = await api('/pensiun/kedudukan-options');
			kedudukanOptions = res.data || [];
			if (kedudukanOptions.length > 0 && !form.kedudukanpns_id) {
				form.kedudukanpns_id = kedudukanOptions[0].id.toString();
			}
		} catch (err) {
			console.error('Gagal memuat opsi kedudukan pensiun:', err);
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
				...(selectedKedudukanFilter ? { kedudukanpns_id: selectedKedudukanFilter } : {})
			});
			const res = await api(`/pensiun?${query.toString()}`);
			pensiunList = res.data || [];
			total = res.meta?.total || 0;
			totalPages = res.meta?.totalPages || 1;
		} catch (err) {
			error = err.message || 'Gagal memuat data pensiun';
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

	function openCreateProcess() {
		selectedPegawai = null;
		form = {
			pegawai_id: '',
			kedudukanpns_id: kedudukanOptions.length > 0 ? kedudukanOptions[0].id.toString() : '2',
			no_sk: '',
			tgl_sk: '',
			tmt_pensiun: '',
			ket: ''
		};
		selectedFileSK = null;
		fieldErrors = {};
		showProcessModal = true;
	}

	function handlePegawaiSelectFromModal(peg) {
		selectedPegawai = {
			id: peg.id,
			nama: peg.ta_orang?.nama || peg.nama || '-',
			nipBaru: peg.nipBaru || peg.nip || '-',
			foto: peg.ta_orang?.foto || peg.foto || null,
			jabatan: peg.rwt_jabatan?.nama_jabatan || peg.jabatan || '-',
			unor: peg.rwt_jabatan?.ref_unitorganisasi?.nmUnor || peg.unor || '-'
		};
		form.pegawai_id = peg.id;
		showSearchPegawaiModal = false;
	}

	function handleFileChange(e) {
		const file = e.target.files[0];
		if (file) {
			if (file.type !== 'application/pdf') {
				toast.error('File SK Pensiun harus berformat PDF');
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

	async function handleSubmitProcess() {
		if (!form.pegawai_id) {
			toast.error('Silakan pilih pegawai yang akan diproses pensiun');
			return;
		}

		if (!form.kedudukanpns_id) {
			toast.error('Pilih jenis pensiun');
			return;
		}

		submitting = true;
		fieldErrors = {};

		try {
			const formData = new FormData();
			formData.append('pegawai_id', form.pegawai_id);
			formData.append('kedudukanpns_id', form.kedudukanpns_id);
			if (form.no_sk) formData.append('no_sk', form.no_sk);
			if (form.tgl_sk) formData.append('tgl_sk', form.tgl_sk);
			if (form.tmt_pensiun) formData.append('tmt_pensiun', form.tmt_pensiun);
			if (form.ket) formData.append('ket', form.ket);

			if (selectedFileSK) {
				formData.append('file_sk', selectedFileSK);
			}

			const BASE_URL = import.meta.env.VITE_API_URL;
			const res = await fetch(`${BASE_URL}/pensiun`, {
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
				throw new Error(data.message || 'Gagal menyimpan penetapan pensiun');
			}

			toast.success('Penetapan pensiun pegawai berhasil disimpan');
			showProcessModal = false;
			await loadData();
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
			await api(`/pensiun/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Data pensiun berhasil dibatalkan/dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			await loadData();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data pensiun');
		} finally {
			deleteLoading = false;
		}
	}

	function openPdfPreview(item) {
		if (!item.file_sk) {
			toast.info('Dokumen SK belum diunggah');
			return;
		}
		previewPdfUrl = `${API_BASE}/${item.file_sk}`;
		previewTitle = `SK Pensiun - ${item.pegawai?.nama || 'Pegawai'}`;
		showPreviewModal = true;
	}
</script>

<svelte:head>
	<title>Manajemen Pensiun Pegawai | SIPASN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
					Layanan Kepegawaian
				</span>
			</div>
			<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
				Manajemen Pensiun Pegawai
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
				Pengelolaan penetapan pensiun ASN, pembaruan status kedudukan, dan pengarsipan SK Pensiun.
			</p>
		</div>

		<Button variant="primary" onclick={openCreateProcess} class="shadow-lg shadow-indigo-500/20">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
			Proses Pensiun Pegawai
		</Button>
	</div>

	<!-- Stats Bar -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
			</div>
			<div>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Pegawai Pensiun</p>
				<p class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{total}</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
			</div>
			<div>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Status Kedudukan</p>
				<p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">Ter-update Otomatis</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
			</div>
			<div>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Arsip Digital SK</p>
				<p class="text-sm font-bold text-indigo-600 dark:text-indigo-400">PDF Terintegrasi</p>
			</div>
		</div>
	</div>

	<!-- Toolbar & Filters -->
	<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
		<div class="w-full sm:w-80 relative">
			<input
				type="text"
				placeholder="Cari No. SK / Keterangan..."
				bind:value={search}
				oninput={handleSearchInput}
				class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
			/>
			<svg class="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
		</div>

		<div class="w-full sm:w-auto flex items-center gap-2">
			<select
				bind:value={selectedKedudukanFilter}
				onchange={() => { page = 1; loadData(); }}
				class="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none font-medium text-zinc-700 dark:text-zinc-300"
			>
				<option value="">Semua Jenis Pensiun</option>
				{#each kedudukanOptions as opt}
					<option value={opt.id.toString()}>{opt.kedudukanpns}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Table Area -->
	<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
		{#if loading}
			<LoadingState message="Memuat data riwayat pensiun..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadData} />
		{:else if pensiunList.length === 0}
			<EmptyState message="Belum ada riwayat penetapan pensiun." icon="📜" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
							<th class="py-3.5 px-4">Pegawai</th>
							<th class="py-3.5 px-4">Jabatan & Unit Organisasi</th>
							<th class="py-3.5 px-4">Kedudukan / Jenis Pensiun</th>
							<th class="py-3.5 px-4">SK Pensiun</th>
							<th class="py-3.5 px-4">TMT Pensiun</th>
							<th class="py-3.5 px-4 text-center">Dokumen SK</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
						{#each pensiunList as item}
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
											<p class="font-bold text-zinc-900 dark:text-zinc-100">{item.pegawai?.nama || '-'}</p>
											<p class="text-[11px] font-mono text-zinc-500">NIP: {item.pegawai?.nipBaru || '-'}</p>
										</div>
									</div>
								</td>

								<!-- Jabatan & Unor -->
								<td class="py-3.5 px-4 max-w-xs">
									<p class="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.pegawai?.jabatan || '-'}</p>
									<p class="text-[11px] text-zinc-500 truncate">{item.pegawai?.unor || '-'}</p>
								</td>

								<!-- Jenis Pensiun -->
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
										{item.nama_kedudukan || 'PENSIUN'}
									</span>
								</td>

								<!-- SK Pensiun -->
								<td class="py-3.5 px-4">
									<p class="font-bold text-zinc-900 dark:text-zinc-100">{item.no_sk || '-'}</p>
									<p class="text-[11px] text-zinc-500">
										Tgl SK: {item.tgl_sk ? new Date(item.tgl_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
									</p>
								</td>

								<!-- TMT Pensiun -->
								<td class="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">
									{item.tmt_pensiun ? new Date(item.tmt_pensiun).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
								</td>

								<!-- Dokumen SK -->
								<td class="py-3.5 px-4 text-center">
									{#if item.file_sk}
										<button
											onclick={() => openPdfPreview(item)}
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-semibold text-[11px] transition-all cursor-pointer"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
											Lihat SK
										</button>
									{:else}
										<span class="text-zinc-400 italic text-[11px]">Tidak ada</span>
									{/if}
								</td>

								<!-- Aksi -->
								<td class="py-3.5 px-4 text-right">
									<button
										onclick={() => confirmDelete(item)}
										class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
										title="Batalkan / Hapus Pensiun"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-950/40 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
				<span>Total: <b>{total}</b> data</span>
				<div class="flex items-center gap-2">
					<Button variant="ghost" disabled={page <= 1} onclick={() => { page--; loadData(); }}>Sebelumnya</Button>
					<span>Halaman {page} dari {totalPages}</span>
					<Button variant="ghost" disabled={page >= totalPages} onclick={() => { page++; loadData(); }}>Selanjutnya</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Form Penetapan Pensiun -->
{#if showProcessModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
				<div>
					<h2 class="text-base font-bold text-zinc-900 dark:text-zinc-50">Form Penetapan Pensiun Pegawai</h2>
					<p class="text-xs text-zinc-500">Ubah status kedudukan pegawai dari Aktif menjadi Pensiun & lampirkan SK.</p>
				</div>
				<button onclick={() => showProcessModal = false} class="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 overflow-y-auto space-y-5">
				<!-- Step 1: Select Pegawai -->
				<div class="space-y-2">
					<label class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
						Pegawai yang Dipensiunkan <span class="text-rose-500">*</span>
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
									<h4 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{selectedPegawai.nama}</h4>
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
							<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Klik untuk Cari & Pilih Pegawai Aktif</span>
							<span class="text-[11px] text-zinc-400">Pencarian berdasarkan NIP, Nama Lengkap, atau Unit Organisasi</span>
						</button>
					{/if}
				</div>

				<!-- Step 2: Form Details -->
				<div class="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
					<div class="space-y-1">
						<label for="kedudukanpns_id" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
							Jenis Pensiun / Status Kedudukan Baru <span class="text-rose-500">*</span>
						</label>
						<select
							id="kedudukanpns_id"
							bind:value={form.kedudukanpns_id}
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-800 dark:text-zinc-200"
						>
							{#each kedudukanOptions as opt}
								<option value={opt.id.toString()}>{opt.kedudukanpns}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input
							label="Nomor SK Pensiun"
							bind:value={form.no_sk}
							placeholder="Contoh: 800/123/BKPSDM-2026"
							error={fieldErrors.no_sk}
						/>

						<Input
							label="Tanggal SK Pensiun"
							type="date"
							bind:value={form.tgl_sk}
							error={fieldErrors.tgl_sk}
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input
							label="TMT Pensiun (Terhitung Mulai Tanggal)"
							type="date"
							bind:value={form.tmt_pensiun}
							error={fieldErrors.tmt_pensiun}
						/>

						<!-- File Upload SK Pensiun -->
						<div class="space-y-1">
							<label for="file_sk" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
								File SK Pensiun (PDF)
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
					</div>

					<div class="space-y-1">
						<label for="ket" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block">
							Keterangan / Alasan Pensiun
						</label>
						<textarea
							id="ket"
							bind:value={form.ket}
							placeholder="Catatan tambahan mengenai penetapan pensiun..."
							rows="2"
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
						></textarea>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showProcessModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmitProcess} loading={submitting} disabled={!selectedPegawai}>
					Simpan & Tetapkan Pensiun
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Search Pegawai -->
<PegawaiSearchModal
	open={showSearchPegawaiModal}
	onSelect={handlePegawaiSelectFromModal}
	onClose={() => showSearchPegawaiModal = false}
/>

<!-- Modal Delete Confirmation -->
<ConfirmDeleteModal
	bind:show={showDeleteModal}
	title="Batalkan / Hapus Pensiun?"
	message="Catatan pensiun ini akan dihapus. Jika tidak ada catatan pensiun lain, status kedudukan pegawai akan dikembalikan menjadi PNS AKTIF."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>

<!-- Modal Preview SK Pensiun PDF -->
{#if showPreviewModal}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-150">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
				<h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{previewTitle}</h3>
				<div class="flex items-center gap-2">
					<a
						href={previewPdfUrl}
						target="_blank"
						download
						class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
					>
						Unduh PDF
					</a>
					<button onclick={() => showPreviewModal = false} class="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</button>
				</div>
			</div>
			<div class="flex-1 bg-zinc-100 dark:bg-zinc-950 p-2">
				<iframe src={previewPdfUrl} title="Dokumen SK Pensiun" class="w-full h-full rounded-2xl border-0"></iframe>
			</div>
		</div>
	</div>
{/if}
