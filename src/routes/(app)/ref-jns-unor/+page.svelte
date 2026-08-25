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
	let meta = $state({ totalPages: 1, total: 0 });

	let instansiOptions = $state([]);

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
		instansi_id: '',
		kode: '',
		jnsunor: ''
	});

	async function loadInstansi() {
		try {
			const res = await api('/ref-instansi?limit=1000');
			instansiOptions = res.data || [];
		} catch (err) {
			console.error('Failed to load instansi options:', err);
		}
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await api(`/ref-unor/jnsunor?search=${search}&page=${page}&limit=10`);
			data = res.data || [];
			meta = res.meta || { totalPages: 1, total: 0 };
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
		loadInstansi();
		loadData();
	});

	function handleSearch() {
		lastSearchUsed = search;
		page = 1;
		loadData();
	}

	function openCreate() {
		isEditing = false;
		const defaultInstansi = instansiOptions.length > 0 ? instansiOptions[0].id : '';
		formData = { id: '', instansi_id: defaultInstansi, kode: '', jnsunor: '' };
		fieldErrors = {};
		formError = null;
		showModal = true;
	}

	function openEdit(item) {
		isEditing = true;
		formData = {
			id: item.id,
			instansi_id: item.instansi_id || '',
			kode: item.kode,
			jnsunor: item.jnsunor
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
				instansi_id: formData.instansi_id,
				kode: parseInt(formData.kode, 10),
				jnsunor: formData.jnsunor
			};

			if (isEditing) {
				await api(`/ref-unor/jnsunor/${formData.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis Unit Organisasi berhasil diperbarui');
			} else {
				await api('/ref-unor/jnsunor', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Jenis Unit Organisasi berhasil ditambahkan');
			}
			showModal = false;
			loadData();
		} catch (err) {
			if (err.statusCode === 422) {
				if (Array.isArray(err.errors)) {
					fieldErrors = err.errors.reduce((acc, curr) => {
						acc[curr.field] = curr.message;
						return acc;
					}, {});
				} else {
					fieldErrors = err.errors || {};
				}
				formError = err.message || 'Validasi gagal, periksa isian form.';
			} else {
				formError = err.message || 'Terjadi kesalahan saat menyimpan data.';
			}
			toast.error(formError);
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(item) {
		itemToDelete = item;
		showDeleteConfirm = true;
	}

	async function executeDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/ref-unor/jnsunor/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Jenis Unit Organisasi berhasil dihapus');
			showDeleteConfirm = false;
			loadData();
		} catch (err) {
			toast.error('Gagal menghapus: ' + err.message);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Referensi Jenis Unit Organisasi - SIPASN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
				Referensi Jenis Unit Organisasi
			</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
				Kelola data master Jenis Unit Organisasi (ref_jnsunor) untuk klasifikasi OPD/Unor
			</p>
		</div>
		<div>
			<Button variant="primary" onclick={openCreate}>
				<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Tambah Jenis Unor
			</Button>
		</div>
	</div>

	<!-- Main Card Content -->
	<Card>
		<!-- Filter & Search Toolbar -->
		<div class="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="relative w-full sm:w-80">
				<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={search}
					placeholder="Cari jenis unor atau kode..."
					class="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
				/>
			</div>
			{#if meta && meta.total !== undefined}
				<span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">
					Total <b>{meta.total}</b> Data
				</span>
			{/if}
		</div>

		<!-- Data Table View -->
		{#if loading}
			<LoadingState message="Memuat data jenis unit organisasi..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadData} />
		{:else if data.length === 0}
			<EmptyState message="Belum ada data jenis unit organisasi." />
		{:else}
			<div class="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
				<table class="w-full text-left text-sm">
					<thead class="bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						<tr>
							<th class="py-3.5 px-4 w-16 text-center">No</th>
							<th class="py-3.5 px-4 w-28">Kode</th>
							<th class="py-3.5 px-4">Jenis Unit Organisasi</th>
							<th class="py-3.5 px-4 w-32 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
						{#each data as item, i (item.id)}
							<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
								<td class="py-3.5 px-4 text-center font-medium text-zinc-400 dark:text-zinc-500">
									{(page - 1) * 10 + i + 1}
								</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
										{item.kode}
									</span>
								</td>
								<td class="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
									{item.jnsunor}
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										<button
											onclick={() => openEdit(item)}
											class="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer"
											title="Edit"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											onclick={() => confirmDelete(item)}
											class="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
											title="Hapus"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

			<!-- Pagination Controls -->
			{#if meta.totalPages > 1}
				<div class="mt-5 flex items-center justify-between">
					<p class="text-xs text-zinc-500 dark:text-zinc-400">
						Halaman <b>{page}</b> dari <b>{meta.totalPages}</b>
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={page <= 1}
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
		{/if}
	</Card>
</div>

<!-- Modal Form Tambah / Edit -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
					{isEditing ? 'Ubah Jenis Unit Organisasi' : 'Tambah Jenis Unit Organisasi'}
				</h3>
				<button
					onclick={() => showModal = false}
					class="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Form Body -->
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-6 space-y-4">
				{#if formError}
					<div class="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				<Input
					label="Kode Jenis Unor"
					type="number"
					bind:value={formData.kode}
					placeholder="Contoh: 720915"
					error={fieldErrors.kode}
					required
				/>

				<Input
					label="Nama Jenis Unit Organisasi (jnsunor)"
					bind:value={formData.jnsunor}
					placeholder="Contoh: DINAS, BALAI, SEKOLAH..."
					error={fieldErrors.jnsunor}
					required
				/>

				<div class="space-y-1.5">
					<label for="instansi_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Instansi
					</label>
					<select
						id="instansi_id"
						bind:value={formData.instansi_id}
						class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100"
						required
					>
						<option value="">Pilih Instansi</option>
						{#each instansiOptions as opt}
							<option value={opt.id}>{opt.kode} - {opt.instansi}</option>
						{/each}
					</select>
					{#if fieldErrors.instansi_id}
						<p class="text-xs text-rose-500">{fieldErrors.instansi_id}</p>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="pt-4 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
					<Button variant="secondary" onclick={() => showModal = false}>
						Batal
					</Button>
					<Button variant="primary" type="submit" loading={submitting}>
						Simpan
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
<ConfirmDeleteModal
	open={showDeleteConfirm}
	title="Hapus Jenis Unit Organisasi"
	message={`Apakah Anda yakin ingin menghapus "${itemToDelete?.jnsunor || ''}"? Tindakan ini tidak dapat dibatalkan.`}
	loading={deleteLoading}
	onConfirm={executeDelete}
	onCancel={() => showDeleteConfirm = false}
/>
