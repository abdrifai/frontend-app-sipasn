<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { debounce } from '$lib/utils/debounce.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';

	let { initialKategori = '' } = $props();

	let data = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedKategori = $state(initialKategori);
	let selectedEselon = $state('');
	let page = $state(1);
	let meta = $state({ total: 0, totalPages: 1 });

	// Stats counts
	let stats = $state({
		total: 0,
		struktural: 0,
		fungsional: 0,
		pelaksana: 0
	});

	// Options for relations
	let jenisOptions = $state([]);
	let jenjangOptions = $state([]);
	let eselonOptions = $state([]);

	let showModal = $state(false);
	let isEditing = $state(false);
	let submitting = $state(false);
	let formError = $state(null);
	let fieldErrors = $state({});

	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);

	let formData = $state({
		id: '',
		nama_jabatan: '',
		kode: '',
		kategori: 'PELAKSANA',
		jns_jab_id: '',
		jenjang_jab_id: '',
		eselon_id: '',
		bup: 58,
		kelas_jabatan: ''
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const queryParams = new URLSearchParams({
				page: page.toString(),
				limit: '15',
				search: search.trim(),
				...(selectedKategori ? { kategori: selectedKategori } : {}),
				...(selectedEselon ? { eselon_id: selectedEselon } : {})
			});

			const res = await api(`/ref-jabatan?${queryParams.toString()}`);
			data = res.data;
			meta = res.meta;
		} catch (err) {
			error = err.message || 'Gagal memuat data master jabatan';
		} finally {
			loading = false;
		}
	}

	async function loadStats() {
		try {
			const res = await api('/ref-jabatan/stats');
			if (res.data) {
				stats = {
					total: res.data.total || 0,
					struktural: res.data.struktural || 0,
					fungsional: res.data.fungsional || 0,
					pelaksana: res.data.pelaksana || 0
				};
			}
		} catch (err) {
			console.error('Failed to load stats:', err);
		}
	}

	async function loadOptions() {
		try {
			const [jns, jnj, esl] = await Promise.all([
				api('/ref-jabatan/jenis?limit=100'),
				api('/ref-jabatan/jenjang?limit=100'),
				api('/ref-unor/eselon')
			]);
			jenisOptions = jns.data || [];
			jenjangOptions = jnj.data || [];
			eselonOptions = esl.data || [];
		} catch (err) {
			console.error('Failed to load options:', err);
		}
	}

	const debouncedSearch = debounce(() => {
		page = 1;
		loadData();
	}, 400);

	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});

	function handleKategoriFilter(kat) {
		selectedKategori = kat;
		page = 1;
		loadData();
	}

	function handleEselonFilter(e) {
		selectedEselon = e.target.value;
		page = 1;
		loadData();
	}

	onMount(() => {
		loadData();
		loadStats();
		loadOptions();
	});

	function openCreate() {
		isEditing = false;
		formData = {
			id: '',
			nama_jabatan: '',
			kode: '',
			kategori: selectedKategori || 'PELAKSANA',
			jns_jab_id: '',
			jenjang_jab_id: '',
			eselon_id: '',
			bup: 58,
			kelas_jabatan: ''
		};
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = { 
			id: item.id, 
			nama_jabatan: item.nama_jabatan || item.nm_jab || '', 
			kode: item.kode || '',
			kategori: item.kategori || 'PELAKSANA',
			jns_jab_id: item.jns_jab_id || '', 
			jenjang_jab_id: item.jenjang_jab_id || '', 
			eselon_id: item.eselon_id || '',
			bup: item.bup || 58,
			kelas_jabatan: item.kelas_jabatan || ''
		};
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	async function handleSubmit() {
		submitting = true;
		formError = null;
		fieldErrors = {};
		try {
			const payload = {
				nama_jabatan: formData.nama_jabatan.trim(),
				kode: formData.kode?.trim() || null,
				kategori: formData.kategori,
				jns_jab_id: formData.jns_jab_id || null,
				jenjang_jab_id: formData.jenjang_jab_id ? parseInt(formData.jenjang_jab_id) : null,
				eselon_id: formData.eselon_id || null,
				bup: formData.bup ? parseInt(formData.bup) : 58,
				kelas_jabatan: formData.kelas_jabatan ? parseInt(formData.kelas_jabatan) : null
			};

			if (isEditing) {
				await api(`/ref-jabatan/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Master jabatan berhasil diperbarui');
			} else {
				await api('/ref-jabatan', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Master jabatan baru berhasil ditambahkan');
			}
			showModal = false;
			loadData();
			loadStats();
		} catch (err) {
			if (err.statusCode === 422) {
				fieldErrors = err.errors?.reduce((acc, curr) => ({ ...acc, [curr.field]: curr.message }), {}) || {};
			} else {
				formError = err.message;
			}
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(item) {
		itemToDelete = item;
		showDeleteConfirm = true;
	}

	async function executeDelete() {
		deleteLoading = true;
		try {
			await api(`/ref-jabatan/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jabatan berhasil dinonaktifkan');
			showDeleteConfirm = false;
			loadData();
			loadStats();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus jabatan');
		} finally {
			deleteLoading = false;
		}
	}

	function getKategoriBadge(kat) {
		switch (kat) {
			case 'STRUKTURAL':
				return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
			case 'FUNGSIONAL':
				return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
			case 'PELAKSANA':
			default:
				return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
		}
	}
</script>

<div class="space-y-6">
	<!-- Mini Stats Bar -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<button 
			onclick={() => handleKategoriFilter('')}
			class="p-4 rounded-2xl border text-left transition-all {selectedKategori === '' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'}"
		>
			<div class="text-[11px] font-bold uppercase tracking-wider opacity-70">Semua Master</div>
			<div class="text-xl sm:text-2xl font-black mt-1">{stats.total || meta.total || 0}</div>
		</button>

		<button 
			onclick={() => handleKategoriFilter('STRUKTURAL')}
			class="p-4 rounded-2xl border text-left transition-all {selectedKategori === 'STRUKTURAL' ? 'bg-indigo-600 text-white border-transparent shadow-md' : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300'}"
		>
			<div class="text-[11px] font-bold uppercase tracking-wider {selectedKategori === 'STRUKTURAL' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}">Struktural</div>
			<div class="text-xl sm:text-2xl font-black mt-1">{stats.struktural}</div>
		</button>

		<button 
			onclick={() => handleKategoriFilter('FUNGSIONAL')}
			class="p-4 rounded-2xl border text-left transition-all {selectedKategori === 'FUNGSIONAL' ? 'bg-emerald-600 text-white border-transparent shadow-md' : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300'}"
		>
			<div class="text-[11px] font-bold uppercase tracking-wider {selectedKategori === 'FUNGSIONAL' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}">Fungsional (JF)</div>
			<div class="text-xl sm:text-2xl font-black mt-1">{stats.fungsional}</div>
		</button>

		<button 
			onclick={() => handleKategoriFilter('PELAKSANA')}
			class="p-4 rounded-2xl border text-left transition-all {selectedKategori === 'PELAKSANA' ? 'bg-amber-600 text-white border-transparent shadow-md' : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-amber-300'}"
		>
			<div class="text-[11px] font-bold uppercase tracking-wider {selectedKategori === 'PELAKSANA' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}">Pelaksana (JA)</div>
			<div class="text-xl sm:text-2xl font-black mt-1">{stats.pelaksana}</div>
		</button>
	</div>

	<!-- Controls & Filters -->
	<div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
		<div class="flex flex-1 items-center gap-2 max-w-xl">
			<div class="relative flex-1">
				<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</span>
				<input
					type="text"
					bind:value={search}
					placeholder="Cari nama jabatan atau kode..."
					class="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-zinc-400"
				/>
			</div>

			<select
				value={selectedEselon}
				onchange={handleEselonFilter}
				class="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
			>
				<option value="">Semua Eselon</option>
				{#each eselonOptions as esl}
					<option value={esl.id}>{esl.eselon}</option>
				{/each}
			</select>
		</div>

		<Button variant="primary" onclick={openCreate}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
			Tambah Jabatan
		</Button>
	</div>

	<!-- Table Area -->
	{#if loading}
		<LoadingState message="Memuat daftar master jabatan..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadData} />
	{:else if data.length === 0}
		<EmptyState message="Tidak ada data master jabatan yang sesuai dengan filter." />
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
			<table class="w-full text-left text-xs sm:text-sm">
				<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
					<tr>
						<th class="px-5 py-3.5">Nama Jabatan</th>
						<th class="px-4 py-3.5">Kategori</th>
						<th class="px-4 py-3.5">Eselon</th>
						<th class="px-4 py-3.5">BUP (Usia)</th>
						<th class="px-4 py-3.5">Jenjang / Jenis</th>
						<th class="px-5 py-3.5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
					{#each data as item}
						<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-5 py-3.5">
								<div class="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
									{item.nama_jabatan || item.nm_jab}
								</div>
								{#if item.kode}
									<div class="text-[10px] text-zinc-400 font-mono mt-0.5">Kode: {item.kode}</div>
								{/if}
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider {getKategoriBadge(item.kategori)}">
									{item.kategori || 'PELAKSANA'}
								</span>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								{#if item.ref_eselon}
									<span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
										{item.ref_eselon.eselon}
									</span>
								{:else}
									<span class="text-zinc-400 text-xs">-</span>
								{/if}
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<span class="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									{item.bup || 58} Thn
								</span>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<div class="text-xs font-medium text-zinc-800 dark:text-zinc-200">
									{item.ref_jenjangjab?.jenjangjab || item.ref_jnsjab?.jnsjab || '-'}
								</div>
							</td>
							<td class="px-5 py-3.5 text-right whitespace-nowrap space-x-1">
								<button 
									class="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all" 
									onclick={() => openEdit(item)}
									title="Edit Jabatan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button 
									class="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all" 
									onclick={() => confirmDelete(item)}
									title="Hapus Jabatan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
			<p class="text-xs font-semibold text-zinc-500">
				Menampilkan <span class="text-zinc-900 dark:text-zinc-100 font-bold">{data.length}</span> dari <span class="text-zinc-900 dark:text-zinc-100 font-bold">{meta.total}</span> data — Halaman {meta.page} dari {meta.totalPages}
			</p>
			<div class="flex items-center gap-2">
				<Button variant="secondary" disabled={page <= 1} onclick={() => { page--; loadData(); }}>
					Sebelumnya
				</Button>
				<Button variant="secondary" disabled={page >= meta.totalPages} onclick={() => { page++; loadData(); }}>
					Selanjutnya
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- Modal Form Tambah / Edit Jabatan -->
{#if showModal}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/80 dark:bg-zinc-900/80">
				<div>
					<h2 class="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
						{isEditing ? 'Ubah Data Master Jabatan' : 'Tambah Master Jabatan Baru'}
					</h2>
					<p class="text-xs text-zinc-400 font-medium">Tabel Terpadu ref_jabatan</p>
				</div>
				<button onclick={() => showModal = false} class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-4 overflow-y-auto flex-1">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				<div class="space-y-1.5">
					<label for="nama_jabatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Nama Lengkap Jabatan <span class="text-rose-500">*</span>
					</label>
					<input
						id="nama_jabatan"
						type="text"
						bind:value={formData.nama_jabatan}
						placeholder="Contoh: KEPALA BADAN PENDAPATAN DAERAH"
						class="w-full px-3.5 py-2 bg-white dark:bg-zinc-800 border {fieldErrors.nama_jabatan ? 'border-rose-400' : 'border-zinc-300 dark:border-zinc-700'} rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
					/>
					{#if fieldErrors.nama_jabatan}
						<p class="text-[10px] font-bold text-rose-500">{fieldErrors.nama_jabatan}</p>
					{/if}
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="kategori" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Kategori Jabatan <span class="text-rose-500">*</span>
						</label>
						<select
							id="kategori"
							bind:value={formData.kategori}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
						>
							<option value="STRUKTURAL">STRUKTURAL (Manajerial)</option>
							<option value="FUNGSIONAL">FUNGSIONAL (JF)</option>
							<option value="PELAKSANA">PELAKSANA (JA)</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="kode" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Kode BKN / SAPK</label>
						<input
							id="kode"
							type="text"
							bind:value={formData.kode}
							placeholder="Kode BKN jika ada..."
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="eselon" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Level Eselon</label>
						<select
							id="eselon"
							bind:value={formData.eselon_id}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
						>
							<option value="">Non Eselon / Kosong</option>
							{#each eselonOptions as opt}
								<option value={opt.id}>{opt.eselon}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="bup" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Batas Usia Pensiun (Tahun)</label>
						<input
							id="bup"
							type="number"
							bind:value={formData.bup}
							placeholder="58, 60, atau 65"
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="jns_jab" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Jenis Jabatan (Referensi)</label>
						<select
							id="jns_jab"
							bind:value={formData.jns_jab_id}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
						>
							<option value="">-- Pilih Jenis --</option>
							{#each jenisOptions as opt}
								<option value={opt.id}>{opt.jnsjab}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="jenjang_jab" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Jenjang Jabatan</label>
						<select
							id="jenjang_jab"
							bind:value={formData.jenjang_jab_id}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
						>
							<option value="">-- Pilih Jenjang --</option>
							{#each jenjangOptions as opt}
								<option value={opt.id}>{opt.jenjangjab}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<div class="px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting}>
					{isEditing ? 'Simpan Perubahan' : 'Tambah Jabatan'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDeleteModal
	bind:show={showDeleteConfirm}
	title="Nonaktifkan Master Jabatan?"
	message="Anda akan menonaktifkan jabatan {itemToDelete?.nama_jabatan || itemToDelete?.nm_jab}."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
