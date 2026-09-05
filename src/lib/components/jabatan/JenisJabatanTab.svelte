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

	let { onSelectJenis = null } = $props();

	let data = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedStatus = $state('');
	let page = $state(1);
	let meta = $state({ totalPages: 1 });

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
		kode: '',
		jnsjab: '',
		kode_sapk: '',
		is_aktif: 1
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const statusQuery = selectedStatus !== '' ? `&is_aktif=${selectedStatus}` : '';
			const res = await api(`/ref-jabatan/jenis?search=${search}&page=${page}${statusQuery}`);
			data = res.data;
			meta = res.meta;
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

	onMount(() => {
		loadData();
	});

	function openCreate() {
		isEditing = false;
		formData = { id: '', kode: '', jnsjab: '', kode_sapk: '', is_aktif: 1 };
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = { 
			id: item.id, 
			kode: item.kode, 
			jnsjab: item.jnsjab, 
			kode_sapk: item.kode_sapk || '',
			is_aktif: item.is_aktif !== undefined && item.is_aktif !== null ? item.is_aktif : 1
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
				kode: formData.kode,
				jnsjab: formData.jnsjab,
				kode_sapk: formData.kode_sapk ? parseInt(formData.kode_sapk) : null,
				is_aktif: formData.is_aktif !== undefined ? parseInt(formData.is_aktif) : 1
			};

			if (isEditing) {
				await api(`/ref-jabatan/jenis/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis jabatan berhasil diperbarui');
			} else {
				await api('/ref-jabatan/jenis', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis jabatan berhasil ditambahkan');
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
			await api(`/ref-jabatan/jenis/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jenis jabatan berhasil dihapus');
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
	<div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
		<div class="flex items-center gap-3 flex-1 flex-wrap">
			<div class="relative w-full sm:w-72">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</span>
				<input
					type="text"
					bind:value={search}
					placeholder="Cari jenis jabatan..."
					class="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
				/>
			</div>

			<select
				bind:value={selectedStatus}
				onchange={() => { page = 1; loadData(); }}
				class="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
			>
				<option value="">Semua Status</option>
				<option value="1">Aktif</option>
				<option value="0">Non-Aktif</option>
			</select>
		</div>

		<Button variant="primary" onclick={openCreate}>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
			Tambah Baru
		</Button>
	</div>

	{#if loading}
		<LoadingState message="Memuat data..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadData} />
	{:else if data.length === 0}
		<EmptyState message="Tidak ada data ditemukan." />
	{:else}
		<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
			<table class="w-full text-left text-sm">
				<thead class="bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
					<tr>
						<th class="px-6 py-4">Kode</th>
						<th class="px-6 py-4">Jenis Jabatan</th>
						<th class="px-6 py-4">Kode SAPK</th>
						<th class="px-6 py-4 text-center">Status</th>
						<th class="px-6 py-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
					{#each data as item}
						<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-6 py-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.kode}</td>
							<td class="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
								{#if onSelectJenis}
									<button 
										class="group inline-flex items-center gap-2 font-bold text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
										onclick={() => onSelectJenis(item)}
										title="Klik untuk melihat jenjang jabatan pada jenis ini"
									>
										<span>{item.jnsjab}</span>
										<span class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 px-2 py-0.5 rounded-lg opacity-85 group-hover:opacity-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
											Lihat Jenjang ➔
										</span>
									</button>
								{:else}
									{item.jnsjab}
								{/if}
							</td>
							<td class="px-6 py-4 text-zinc-500 dark:text-zinc-400">{item.kode_sapk || '-'}</td>
							<td class="px-6 py-4 text-center">
								<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold {item.is_aktif === 1 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80'}">
									<span class="w-1.5 h-1.5 rounded-full {item.is_aktif === 1 ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
									{item.is_aktif === 1 ? 'Aktif' : 'Non-Aktif'}
								</span>
							</td>
							<td class="px-6 py-4 text-right whitespace-nowrap space-x-1">
								<button class="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" onclick={() => openEdit(item)} title="Ubah Jenis Jabatan">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button class="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" onclick={() => confirmDelete(item)} title="Hapus Jenis Jabatan">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex items-center justify-between">
			<p class="text-xs font-bold text-zinc-400">Menampilkan {data.length} data — Halaman {meta.page} dari {meta.totalPages}</p>
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
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
				<div class="flex items-center gap-3 flex-wrap">
					<h2 class="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">
						{isEditing ? 'Ubah Jenis Jabatan' : 'Tambah Jenis Jabatan'}
					</h2>

					<!-- Toggle Switch Status (Aktif / Non Aktif) -->
					<div class="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200 {formData.is_aktif === 1 ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'}">
						<button
							type="button"
							role="switch"
							aria-checked={formData.is_aktif === 1}
							onclick={() => formData.is_aktif = formData.is_aktif === 1 ? 0 : 1}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {formData.is_aktif === 1 ? 'bg-emerald-500' : 'bg-rose-400'}"
						>
							<span
								class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out {formData.is_aktif === 1 ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>
						<span class="text-xs font-black tracking-wider uppercase {formData.is_aktif === 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">
							{formData.is_aktif === 1 ? 'Aktif' : 'Non Aktif'}
						</span>
					</div>
				</div>

				<button onclick={() => showModal = false} class="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-5">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				<Input
					label="Kode"
					bind:value={formData.kode}
					placeholder="Masukkan kode..."
					error={fieldErrors.kode}
					required
				/>

				<Input
					label="Nama Jenis Jabatan"
					bind:value={formData.jnsjab}
					placeholder="Masukkan nama jenis jabatan..."
					error={fieldErrors.jnsjab}
					required
				/>

				<Input
					label="Kode SAPK"
					type="number"
					bind:value={formData.kode_sapk}
					placeholder="Masukkan kode SAPK..."
					error={fieldErrors.kode_sapk}
				/>
			</div>

			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting}>
					{isEditing ? 'Simpan Perubahan' : 'Tambah Data'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDeleteModal
	bind:show={showDeleteConfirm}
	title="Hapus Data?"
	message="Tindakan ini tidak dapat dibatalkan (soft delete)."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
