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

	// Tabs State
	let activeTab = $state('jenis'); // 'jenis' or 'jenjang'

	// Data State
	let jenisData = $state([]);
	let jenjangData = $state([]);
	let jenisOptions = $state([]); // For jenjang form select
	
	let loading = $state(true);
	let error = $state(null);
	
	// Search & Pagination State
	let search = $state('');
	let page = $state(1);
	let meta = $state({ totalPages: 1 });

	// Modal & Form State
	let showModal = $state(false);
	let isEditing = $state(false);
	let submitting = $state(false);
	let formError = $state(null);
	let fieldErrors = $state({});

	// Delete Confirmation State
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);

	let formJenis = $state({
		id: '',
		kode: '',
		jnsDiklat: ''
	});

	let formJenjang = $state({
		id: '',
		jnsDiklat_id: '',
		kode: '',
		jenjangDiklat: ''
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const endpoint = activeTab === 'jenis' ? '/ref-diklat/jenis' : '/ref-diklat/jenjang';
			const res = await api(`${endpoint}?search=${search}&page=${page}`);
			if (activeTab === 'jenis') {
				jenisData = res.data;
			} else {
				jenjangData = res.data;
			}
			meta = res.meta;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadJenisOptions() {
		try {
			const res = await api('/ref-diklat/jenis?limit=100');
			jenisOptions = res.data;
		} catch (err) {
			console.error('Failed to load jenis diklat options:', err);
		}
	}

	let lastSearchUsed = '';
	const debouncedSearch = debounce(() => {
		if (search !== lastSearchUsed) {
			handleSearch();
		}
	}, 500);

	$effect(() => {
		debouncedSearch();
	});

	onMount(() => {
		loadData();
		loadJenisOptions();
	});

	function handleTabChange(tab) {
		activeTab = tab;
		search = '';
		page = 1;
		loadData();
	}

	function handleSearch() {
		lastSearchUsed = search;
		page = 1;
		loadData();
	}

	function openCreate() {
		isEditing = false;
		fieldErrors = {};
		formError = null;
		if (activeTab === 'jenis') {
			formJenis = { id: '', kode: '', jnsDiklat: '' };
		} else {
			formJenjang = { id: '', jnsDiklat_id: '', kode: '', jenjangDiklat: '' };
		}
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		fieldErrors = {};
		formError = null;
		if (activeTab === 'jenis') {
			formJenis = { id: item.id, kode: item.kode, jnsDiklat: item.jnsDiklat };
		} else {
			formJenjang = { 
				id: item.id, 
				jnsDiklat_id: item.jnsDiklat_id, 
				kode: item.kode, 
				jenjangDiklat: item.jenjangDiklat 
			};
		}
		showModal = true;
	}

	async function handleSubmit() {
		submitting = true;
		formError = null;
		fieldErrors = {};
		try {
			const endpoint = activeTab === 'jenis' ? '/ref-diklat/jenis' : '/ref-diklat/jenjang';
			const body = activeTab === 'jenis' ? formJenis : formJenjang;
			const id = body.id;
			
			// Remove ID from body for create/update
			const { id: _, ...payload } = body;

			if (isEditing) {
				await api(`${endpoint}/${id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success(`Data ${activeTab === 'jenis' ? 'jenis' : 'jenjang'} diklat berhasil diperbarui`);
			} else {
				await api(endpoint, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success(`Data ${activeTab === 'jenis' ? 'jenis' : 'jenjang'} diklat berhasil ditambahkan`);
			}
			showModal = false;
			loadData();
			if (activeTab === 'jenis') loadJenisOptions();
		} catch (err) {
			if (err.statusCode === 422) {
				if (Array.isArray(err.errors)) {
					err.errors.forEach(e => {
						fieldErrors[e.field] = e.message;
					});
				} else {
					fieldErrors = err.errors;
				}
			} else {
				formError = err.message;
			}
		} finally {
			submitting = false;
		}
	}

	function handleDelete(item) {
		itemToDelete = item;
		showDeleteConfirm = true;
	}

	async function executeDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			const endpoint = activeTab === 'jenis' ? '/ref-diklat/jenis' : '/ref-diklat/jenjang';
			await api(`${endpoint}/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success(`Data ${activeTab === 'jenis' ? 'jenis' : 'jenjang'} diklat berhasil dihapus`);
			showDeleteConfirm = false;
			itemToDelete = null;
			loadData();
			if (activeTab === 'jenis') loadJenisOptions();
		} catch (err) {
			toast.error('Gagal menghapus: ' + err.message);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="space-y-6">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Referensi Diklat</h1>
				<p class="text-zinc-500 dark:text-zinc-400">Manajemen data jenis dan jenjang diklat</p>
			</div>
			<Button variant="primary" onclick={openCreate}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				Tambah Baru
			</Button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-zinc-200 dark:border-zinc-800">
			<button
				class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'jenis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				onclick={() => handleTabChange('jenis')}
			>
				Jenis Diklat
				{#if activeTab === 'jenis'}
					<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
				{/if}
			</button>
			<button
				class="px-6 py-3 text-sm font-medium transition-colors relative {activeTab === 'jenjang' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				onclick={() => handleTabChange('jenjang')}
			>
				Jenjang Diklat
				{#if activeTab === 'jenjang'}
					<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
				{/if}
			</button>
		</div>

		<Card>
			<div class="flex gap-2 mb-6">
				<div class="relative flex-1">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</span>
					<input
						type="text"
						bind:value={search}
						placeholder="Cari kode atau nama..."
						class="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
						onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					/>
				</div>
				<Button variant="secondary" onclick={handleSearch}>Cari</Button>
			</div>

			{#if loading}
				<LoadingState message="Memuat data referensi..." />
			{:else if error}
				<ErrorState message={error} onRetry={loadData} />
			{:else if (activeTab === 'jenis' ? jenisData.length : jenjangData.length) === 0}
				<EmptyState message="Tidak ada data yang ditemukan." />
			{:else}
				<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead class="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
							<tr>
								<th class="px-4 py-3">Kode</th>
								{#if activeTab === 'jenis'}
									<th class="px-4 py-3">Jenis Diklat</th>
								{:else}
									<th class="px-4 py-3">Jenjang Diklat</th>
									<th class="px-4 py-3">Jenis Diklat Parent</th>
								{/if}
								<th class="px-4 py-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
							{#each (activeTab === 'jenis' ? jenisData : jenjangData) as item}
								<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
									<td class="px-4 py-4 whitespace-nowrap">
										<span class="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
											{item.kode || '-'}
										</span>
									</td>
									<td class="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">
										{activeTab === 'jenis' ? item.jnsDiklat : item.jenjangDiklat}
									</td>
									{#if activeTab === 'jenjang'}
										<td class="px-4 py-4 text-zinc-500 dark:text-zinc-400">
											{jenisOptions.find(j => j.id === item.jnsDiklat_id)?.jnsDiklat || '-'}
										</td>
									{/if}
									<td class="px-4 py-4 text-right space-x-2">
										<button
											class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
											onclick={() => openEdit(item)}
											aria-label="Ubah"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											class="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
											onclick={() => handleDelete(item)}
											aria-label="Hapus"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="flex items-center justify-between mt-6">
					<p class="text-sm text-zinc-500">Halaman {meta.page} dari {meta.totalPages}</p>
					<div class="flex gap-2">
						<Button
							variant="secondary"
							disabled={page === 1}
							onclick={() => { page--; loadData(); }}
						>
							Sebelumnya
						</Button>
						<Button
							variant="secondary"
							disabled={page >= meta.totalPages}
							onclick={() => { page++; loadData(); }}
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</Card>
	</div>

{#if showModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
				<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50">
					{isEditing ? 'Ubah Referensi' : 'Tambah Referensi Baru'}
				</h2>
				<button onclick={() => showModal = false} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-4">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				{#if activeTab === 'jenis'}
					<Input
						label="Kode Jenis Diklat"
						bind:value={formJenis.kode}
						placeholder="Contoh: 01"
						error={fieldErrors.kode}
						required
					/>
					<Input
						label="Nama Jenis Diklat"
						bind:value={formJenis.jnsDiklat}
						placeholder="Contoh: Diklat Penjenjangan"
						error={fieldErrors.jnsDiklat}
						required
					/>
				{:else}
					<div class="space-y-1">
						<label for="jnsDiklat" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Jenis Diklat</label>
						<select
							id="jnsDiklat"
							bind:value={formJenjang.jnsDiklat_id}
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border {fieldErrors.jnsDiklat_id ? 'border-rose-400' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
						>
							<option value="">Pilih Jenis Diklat</option>
							{#each jenisOptions as opt}
								<option value={opt.id}>{opt.jnsDiklat}</option>
							{/each}
						</select>
						{#if fieldErrors.jnsDiklat_id}
							<p class="text-[10px] font-bold text-rose-500">{fieldErrors.jnsDiklat_id}</p>
						{/if}
					</div>
					<Input
						label="Kode Jenjang Diklat"
						bind:value={formJenjang.kode}
						placeholder="Contoh: 01"
						error={fieldErrors.kode}
						required
					/>
					<Input
						label="Nama Jenjang Diklat"
						bind:value={formJenjang.jenjangDiklat}
						placeholder="Contoh: Diklat Pim Tk.I"
						error={fieldErrors.jenjangDiklat}
						required
					/>
				{/if}
			</div>

			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting}>
					{isEditing ? 'Simpan Perubahan' : 'Tambah Referensi'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDeleteModal 
	bind:show={showDeleteConfirm}
	title="Hapus Referensi?"
	message="Anda akan menghapus data ini. Tindakan ini tidak dapat dibatalkan melalui sistem."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
