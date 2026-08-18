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

	// Delete Confirmation State
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);

	let formData = $state({
		id: '',
		kode: '',
		jnsMutasi: ''
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await api(`/ref-jns-mutasi?search=${search}&page=${page}`);
			data = res.data;
			meta = res.meta;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
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
	});

	function handleSearch() {
		lastSearchUsed = search;
		page = 1;
		loadData();
	}

	function openCreate() {
		isEditing = false;
		formData = { id: '', kode: '', jnsMutasi: '' };
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = { 
			id: item.id, 
			kode: item.kode,
			jnsMutasi: item.jnsMutasi 
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
				kode: parseInt(formData.kode),
				jnsMutasi: formData.jnsMutasi
			};

			if (isEditing) {
				await api(`/ref-jns-mutasi/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis mutasi berhasil diperbarui');
			} else {
				await api('/ref-jns-mutasi', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis mutasi berhasil ditambahkan');
			}
			showModal = false;
			loadData();
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
			await api(`/ref-jns-mutasi/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jenis mutasi berhasil dihapus');
			showDeleteConfirm = false;
			itemToDelete = null;
			loadData();
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
				<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Referensi Jenis Mutasi</h1>
				<p class="text-zinc-500 dark:text-zinc-400">Manajemen data kategori mutasi kepegawaian</p>
			</div>
			<Button variant="primary" onclick={openCreate}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				Tambah Baru
			</Button>
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
						placeholder="Cari jenis mutasi..."
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
			{:else if data.length === 0}
				<EmptyState message="Tidak ada data jenis mutasi yang ditemukan." />
			{:else}
				<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead class="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
							<tr>
								<th class="px-4 py-3 w-16">Kode</th>
								<th class="px-4 py-3">Jenis Mutasi</th>
								<th class="px-4 py-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
							{#each data as item}
								<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
									<td class="px-4 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">{item.kode}</td>
									<td class="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">{item.jnsMutasi}</td>
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

				<Input
					label="Kode"
					type="number"
					bind:value={formData.kode}
					placeholder="Masukkan kode..."
					error={fieldErrors.kode}
					required
				/>

				<Input
					label="Jenis Mutasi"
					bind:value={formData.jnsMutasi}
					placeholder="Masukkan deskripsi jenis mutasi..."
					error={fieldErrors.jnsMutasi}
					required
				/>
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
	title="Hapus Referensi Jenis Mutasi?"
	message="Anda akan menghapus {itemToDelete?.jnsMutasi}. Tindakan ini tidak dapat dibatalkan melalui sistem."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
