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

	let { selectedJnsJab = $bindable(null), onResetFilter = null } = $props();

	let data = $state([]);
	let jenisJabatanOptions = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let page = $state(1);
	let meta = $state({ totalPages: 1, total: 0 });

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
		jnsjab_id: '',
		jenjangjab: ''
	});

	async function loadJenisJabatan() {
		try {
			const res = await api('/ref-jabatan/jenis?limit=100');
			jenisJabatanOptions = res.data || [];
		} catch (err) {
			console.error('Failed to load jenis jabatan:', err);
		}
	}

	function resolveFilterJnsId(item) {
		if (!item) return null;
		if (item.kode_sapk === 2) return 2; // JF
		if (item.kode_sapk === 1) {
			const name = (item.jnsjab || '').toUpperCase();
			if (name.includes('PIMPINAN TINGGI') || name.includes('JPT')) return 3;
			return 1; // Struktural
		}
		if (item.kode_sapk === 4) return 1; // Administrasi / Pelaksana
		const name = (item.jnsjab || '').toUpperCase();
		if (name.includes('FUNGSIONAL')) return 2;
		if (name.includes('PIMPINAN TINGGI') || name.includes('JPT')) return 3;
		return 1;
	}

	function findMatchingJnsOpt(jnsId) {
		if (!jnsId) return jenisJabatanOptions[0]?.id || '';
		// 1. Direct match by UUID
		const matchExact = jenisJabatanOptions.find(o => o.id === jnsId);
		if (matchExact) return matchExact.id;

		const num = parseInt(jnsId, 10);
		// 2. Direct match by numeric kode (misal jnsId = 17 -> cocok dengan kode "17")
		const matchByKode = jenisJabatanOptions.find(o => parseInt(o.kode, 10) === num);
		if (matchByKode) return matchByKode.id;

		// 3. Fallback untuk data legacy (1 = Struktural, 2 = JF, 3 = JPT)
		if (num === 2) {
			const jf = jenisJabatanOptions.find(o => o.kode === '16' || o.kode === '12' || (o.jnsjab || '').toUpperCase().includes('FUNGSIONAL'));
			if (jf) return jf.id;
		}
		if (num === 3) {
			const jpt = jenisJabatanOptions.find(o => o.kode === '14' || (o.jnsjab || '').toUpperCase().includes('PIMPINAN TINGGI'));
			if (jpt) return jpt.id;
		}
		if (num === 1) {
			const str = jenisJabatanOptions.find(o => o.kode === '10' || (o.jnsjab || '').toUpperCase().includes('STRUKTURAL'));
			if (str) return str.id;
		}

		const fallback = jenisJabatanOptions.find(o => o.kode_sapk === num);
		return fallback ? fallback.id : (jenisJabatanOptions[0]?.id || '');
	}

	function getJenisLabel(jnsId) {
		if (!jnsId) return '-';
		// 1. Direct match by UUID
		const matchExact = jenisJabatanOptions.find(o => o.id === jnsId);
		if (matchExact) return `${matchExact.kode} - ${matchExact.jnsjab}`;

		const num = parseInt(jnsId, 10);
		// 2. Direct match by numeric kode (misal 17 -> "17 - PELAKSANA")
		const matchByKode = jenisJabatanOptions.find(o => parseInt(o.kode, 10) === num);
		if (matchByKode) return `${matchByKode.kode} - ${matchByKode.jnsjab}`;

		// 3. Fallback untuk data legacy (1, 2, 3)
		if (num === 2) {
			const jf = jenisJabatanOptions.find(o => o.kode === '16' || o.kode === '12' || (o.jnsjab || '').toUpperCase().includes('FUNGSIONAL'));
			if (jf) return `${jf.kode} - ${jf.jnsjab}`;
			return '16 - JABATAN FUNGSIONAL (JF)';
		}
		if (num === 3) {
			const jpt = jenisJabatanOptions.find(o => o.kode === '14' || (o.jnsjab || '').toUpperCase().includes('PIMPINAN TINGGI'));
			if (jpt) return `${jpt.kode} - ${jpt.jnsjab}`;
			return '14 - JABATAN PIMPINAN TINGGI (JPT)';
		}
		if (num === 1) {
			const str = jenisJabatanOptions.find(o => o.kode === '10' || (o.jnsjab || '').toUpperCase().includes('STRUKTURAL'));
			if (str) return `${str.kode} - ${str.jnsjab}`;
			return '10 - STRUKTURAL';
		}

		const fallback = jenisJabatanOptions.find(o => o.kode_sapk === num);
		if (fallback) return `${fallback.kode} - ${fallback.jnsjab}`;

		return `Kode: ${jnsId}`;
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const query = new URLSearchParams();
			if (search) query.set('search', search);
			
			const targetJnsId = resolveFilterJnsId(selectedJnsJab);
			if (targetJnsId) {
				query.set('jnsjab_id', targetJnsId.toString());
			}

			query.set('page', page.toString());
			query.set('limit', '10');

			const res = await api(`/ref-jabatan/jenjang?${query.toString()}`);
			data = res.data || [];
			meta = res.meta || { totalPages: 1, total: data.length };
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	const debouncedSearch = debounce(() => {
		page = 1;
		loadData();
	}, 500);

	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});

	$effect(() => {
		if (selectedJnsJab !== undefined) {
			page = 1;
			loadData();
		}
	});

	onMount(async () => {
		await loadJenisJabatan();
		await loadData();
	});

	function clearFilter() {
		selectedJnsJab = null;
		if (onResetFilter) onResetFilter();
		page = 1;
		loadData();
	}

	function openCreate() {
		isEditing = false;
		formData = { 
			id: '', 
			jnsjab_id: selectedJnsJab ? selectedJnsJab.id : (jenisJabatanOptions[0]?.id || ''), 
			jenjangjab: '' 
		};
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = { 
			id: item.id, 
			jnsjab_id: findMatchingJnsOpt(item.jnsjab_id), 
			jenjangjab: item.jenjangjab 
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
				jnsjab_id: formData.jnsjab_id,
				jenjangjab: formData.jenjangjab.trim()
			};

			if (isEditing) {
				await api(`/ref-jabatan/jenjang/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Jenjang jabatan berhasil diperbarui');
			} else {
				await api('/ref-jabatan/jenjang', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Jenjang jabatan berhasil ditambahkan');
			}
			showModal = false;
			loadData();
		} catch (err) {
			if (err.statusCode === 422) {
				fieldErrors = err.errors.reduce((acc, curr) => ({ ...acc, [curr.field]: curr.message }), {});
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
			await api(`/ref-jabatan/jenjang/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jenjang jabatan berhasil dihapus');
			showDeleteConfirm = false;
			loadData();
		} catch (err) {
			toast.error(err.message);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Filter Banner jika difilter dari Jenis Jabatan -->
	{#if selectedJnsJab}
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50 via-indigo-50/60 to-purple-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl animate-in fade-in duration-200">
			<div class="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-indigo-950 dark:text-indigo-200">
				<span class="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-[10px] tracking-wider uppercase shadow-2xs">
					Filter Aktif
				</span>
				<span>
					Menampilkan jenjang untuk jenis jabatan: <strong class="text-indigo-600 dark:text-indigo-400 font-bold">{selectedJnsJab.jnsjab}</strong>
				</span>
			</div>
			<button
				class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 hover:border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer w-fit"
				onclick={clearFilter}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				<span>Reset & Tampilkan Semua</span>
			</button>
		</div>
	{/if}

	<div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
		<div class="relative flex-1 sm:max-w-xs">
			<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
			</span>
			<input
				type="text"
				bind:value={search}
				placeholder="Cari jenjang jabatan..."
				class="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-medium text-zinc-900 dark:text-zinc-100"
			/>
		</div>
		<Button variant="primary" onclick={openCreate}>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
			Tambah Jenjang Baru
		</Button>
	</div>

	{#if loading}
		<LoadingState message="Memuat data jenjang jabatan..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadData} />
	{:else if data.length === 0}
		<EmptyState message="Tidak ada data jenjang jabatan yang ditemukan." />
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
			<table class="w-full text-left text-xs sm:text-sm">
				<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200/80 dark:border-zinc-800">
					<tr>
						<th class="px-6 py-3.5 w-16">ID</th>
						<th class="px-6 py-3.5">Nama Jenjang Jabatan</th>
						<th class="px-6 py-3.5">Jenis Jabatan (ref_jnsjab)</th>
						<th class="px-6 py-3.5 text-right w-28">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
					{#each data as item}
						<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-6 py-4 font-mono text-xs text-zinc-400">{item.id}</td>
							<td class="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{item.jenjangjab}</td>
							<td class="px-6 py-4">
								<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold
									{item.jnsjab_id === 2 
										? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' 
										: item.jnsjab_id === 3
											? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20'
											: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20'}">
									{getJenisLabel(item.jnsjab_id)}
								</span>
							</td>
							<td class="px-6 py-4 text-right whitespace-nowrap space-x-1">
								<button class="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer" onclick={() => openEdit(item)} title="Ubah Data">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button class="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer" onclick={() => confirmDelete(item)} title="Hapus Data">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
			<p class="font-bold text-zinc-400">Total {meta.total || data.length} data — Halaman {meta.page} dari {meta.totalPages}</p>
			<div class="flex gap-2">
				<Button variant="secondary" disabled={page === 1} onclick={() => { page--; loadData(); }}>
					Sebelumnya
				</Button>
				<Button variant="secondary" disabled={page >= meta.totalPages} onclick={() => { page++; loadData(); }}>
					Selanjutnya
				</Button>
			</div>
		</div>
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
				<h2 class="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">
					{isEditing ? 'Ubah Jenjang Jabatan' : 'Tambah Jenjang Jabatan'}
				</h2>
				<button onclick={() => showModal = false} class="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-4">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				<Input
					label="Nama Jenjang Jabatan"
					bind:value={formData.jenjangjab}
					placeholder="Contoh: Ahli Pertama / Madya / Pengawas..."
					error={fieldErrors.jenjangjab}
					required
				/>

				<div class="flex flex-col gap-1.5">
					<label for="form_jnsjab_id" class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
						Jenis Jabatan (Referensi ref_jnsjab) <span class="text-rose-500">*</span>
					</label>
					<select
						id="form_jnsjab_id"
						bind:value={formData.jnsjab_id}
						class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-zinc-900 dark:text-zinc-100"
						required
					>
						<option value="">Pilih Jenis Jabatan</option>
						{#each jenisJabatanOptions as opt}
							<option value={opt.id}>{opt.kode} - {opt.jnsjab}</option>
						{/each}
					</select>
					{#if fieldErrors.jnsjab_id}
						<p class="text-xs text-rose-500">{fieldErrors.jnsjab_id}</p>
					{/if}
				</div>
			</div>

			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
				<Button variant="secondary" onclick={() => showModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting}>
					{isEditing ? 'Simpan Perubahan' : 'Tambah Jenjang'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDeleteModal
	bind:show={showDeleteConfirm}
	title="Hapus Jenjang Jabatan"
	message="Apakah Anda yakin ingin menghapus data jenjang ini? Tindakan ini tidak dapat dibatalkan."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
