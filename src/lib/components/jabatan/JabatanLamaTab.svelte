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

	let data = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
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
		nmJab: '',
		jnsRumpunJab_id: '',
		jnsRumpunJab_kode: '',
		rumpunJab_id: '',
		eselon_id: '',
		eselon_kode: ''
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await api(`/ref-jabatan/lama?search=${search}&page=${page}`);
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
		formData = { 
			id: '', 
			kode: '', 
			nmJab: '', 
			jnsRumpunJab_id: '', 
			jnsRumpunJab_kode: '', 
			rumpunJab_id: '', 
			eselon_id: '', 
			eselon_kode: '' 
		};
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = { 
			id: item.id, 
			kode: item.kode || '', 
			nmJab: item.nmJab, 
			jnsRumpunJab_id: item.jnsRumpunJab_id || '', 
			jnsRumpunJab_kode: item.jnsRumpunJab_kode || '', 
			rumpunJab_id: item.rumpunJab_id || '', 
			eselon_id: item.eselon_id || '', 
			eselon_kode: item.eselon_kode || ''
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
			if (isEditing) {
				await api(`/ref-jabatan/lama/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(formData)
				});
				toast.success('Jabatan lama berhasil diperbarui');
			} else {
				await api('/ref-jabatan/lama', {
					method: 'POST',
					body: JSON.stringify(formData)
				});
				toast.success('Jabatan lama berhasil ditambahkan');
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
			await api(`/ref-jabatan/lama/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jabatan lama berhasil dihapus');
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
	<div class="flex justify-between items-center">
		<div class="relative w-72">
			<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
			</span>
			<input
				type="text"
				bind:value={search}
				placeholder="Cari nama jabatan lama..."
				class="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
			/>
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
						<th class="px-6 py-4">Nama Jabatan</th>
						<th class="px-6 py-4">Kode</th>
						<th class="px-6 py-4">Rumpun</th>
						<th class="px-6 py-4">Eselon</th>
						<th class="px-6 py-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
					{#each data as item}
						<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-6 py-4">
								<div class="font-bold text-zinc-900 dark:text-zinc-100">{item.nmJab}</div>
								<div class="text-[10px] text-zinc-400 font-mono mt-0.5">{item.id}</div>
							</td>
							<td class="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">{item.kode || '-'}</td>
							<td class="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs truncate max-w-xs">{item.jnsRumpunJab_id || '-'}</td>
							<td class="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs">{item.eselon_id || '-'}</td>
							<td class="px-6 py-4 text-right whitespace-nowrap space-x-1">
								<button class="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" onclick={() => openEdit(item)}>
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button class="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" onclick={() => confirmDelete(item)}>
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
		<div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
				<h2 class="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">
					{isEditing ? 'Ubah Jabatan Lama' : 'Tambah Jabatan Lama'}
				</h2>
				<button onclick={() => showModal = false} class="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-4 overflow-y-auto flex-grow">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				<Input
					label="Nama Jabatan"
					bind:value={formData.nmJab}
					placeholder="Masukkan nama jabatan..."
					error={fieldErrors.nmJab}
					required
				/>

				<Input
					label="Kode"
					bind:value={formData.kode}
					placeholder="Masukkan kode..."
					error={fieldErrors.kode}
				/>

				<Input
					label="Jenis Rumpun Jabatan (UUID)"
					bind:value={formData.jnsRumpunJab_id}
					placeholder="Masukkan UUID rumpun..."
					error={fieldErrors.jnsRumpunJab_id}
					required
				/>

				<Input
					label="Kode Rumpun"
					bind:value={formData.jnsRumpunJab_kode}
					placeholder="Masukkan kode rumpun..."
					error={fieldErrors.jnsRumpunJab_kode}
				/>

				<Input
					label="Eselon (UUID)"
					bind:value={formData.eselon_id}
					placeholder="Masukkan UUID eselon..."
					error={fieldErrors.eselon_id}
					required
				/>

				<Input
					label="Kode Eselon"
					bind:value={formData.eselon_kode}
					placeholder="Masukkan kode eselon..."
					error={fieldErrors.eselon_kode}
				/>
			</div>

			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 flex-shrink-0">
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
	message="Tindakan ini tidak dapat dibatalkan (hard delete)."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
