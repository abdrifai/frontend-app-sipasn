<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';

	// State Catatan
	let catatanList = $state([]);
	let categories = $state([]);
	let loading = $state(true);
	let error = $state(null);

	// Filter & Pagination State
	let searchQuery = $state('');
	let selectedCategory = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	// Modal States
	let showEditorModal = $state(false);
	let showReaderModal = $state(false);
	let showDeleteModal = $state(false);

	let isEditing = $state(false);
	let currentEditId = $state(null);
	let activeCatatan = $state(null);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);
	let savingLoading = $state(false);

	// Form State
	let form = $state({
		judul: '',
		konten: '',
		kategori: 'Umum',
		penulis: '',
		is_pinned: false
	});
	let formErrors = $state({});

	const defaultCategories = ['Umum', 'Kebijakan', 'Memo Internal', 'Notula Rapat', 'Penting', 'Ide & Konsep'];

	onMount(async () => {
		await loadCatatan();
	});

	async function loadCatatan(page = 1) {
		loading = true;
		error = null;
		currentPage = page;
		try {
			const query = new URLSearchParams({
				page: String(page),
				limit: '12'
			});
			if (searchQuery.trim()) query.append('search', searchQuery.trim());
			if (selectedCategory) query.append('kategori', selectedCategory);

			const res = await api(`/catatan?${query.toString()}`);
			catatanList = res.data || [];
			totalItems = res.meta?.total || 0;
			totalPages = res.meta?.totalPages || 1;

			if (res.categories && res.categories.length > 0) {
				const merged = Array.from(new Set([...defaultCategories, ...res.categories]));
				categories = merged;
			} else {
				categories = defaultCategories;
			}
		} catch (err) {
			error = err.message || 'Gagal memuat daftar catatan';
			toast.error(error);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadCatatan(1);
	}

	function handleCategoryClick(cat) {
		selectedCategory = selectedCategory === cat ? '' : cat;
		loadCatatan(1);
	}

	function openCreateModal() {
		isEditing = false;
		currentEditId = null;
		form = {
			judul: '',
			konten: '',
			kategori: selectedCategory || 'Umum',
			penulis: '',
			is_pinned: false
		};
		formErrors = {};
		showEditorModal = true;
	}

	function openEditModal(item, e) {
		e?.stopPropagation?.();
		isEditing = true;
		currentEditId = item.id;
		form = {
			judul: item.judul || '',
			konten: item.konten || '',
			kategori: item.kategori || 'Umum',
			penulis: item.penulis || '',
			is_pinned: Boolean(item.is_pinned)
		};
		formErrors = {};
		showReaderModal = false;
		showEditorModal = true;
	}

	function openReader(item) {
		activeCatatan = item;
		showReaderModal = true;
	}

	function confirmDelete(item, e) {
		e?.stopPropagation?.();
		itemToDelete = item;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			await api(`/catatan/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Catatan berhasil dihapus');
			showDeleteModal = false;
			showReaderModal = false;
			itemToDelete = null;
			await loadCatatan(currentPage);
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus catatan');
		} finally {
			deleteLoading = false;
		}
	}

	async function handleTogglePin(item, e) {
		e?.stopPropagation?.();
		try {
			const res = await api(`/catatan/${item.id}/pin`, { method: 'PATCH' });
			toast.success(res.message || 'Status sematan diperbarui');
			await loadCatatan(currentPage);
			if (activeCatatan && activeCatatan.id === item.id) {
				activeCatatan.is_pinned = !activeCatatan.is_pinned;
			}
		} catch (err) {
			toast.error(err.message || 'Gagal mengubah sematan');
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		formErrors = {};

		if (!form.judul.trim()) {
			formErrors.judul = 'Judul catatan wajib diisi';
			return;
		}
		if (!form.konten.trim()) {
			formErrors.konten = 'Isi catatan tidak boleh kosong';
			return;
		}

		savingLoading = true;
		try {
			const payload = {
				judul: form.judul.trim(),
				konten: form.konten.trim(),
				kategori: form.kategori || 'Umum',
				penulis: form.penulis ? form.penulis.trim() : null,
				is_pinned: form.is_pinned
			};

			if (isEditing) {
				await api(`/catatan/${currentEditId}`, {
					method: 'PUT',
					body: JSON.stringify(payload)
				});
				toast.success('Catatan berhasil diperbarui');
			} else {
				await api('/catatan', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Catatan baru berhasil dibuat');
			}

			showEditorModal = false;
			await loadCatatan(isEditing ? currentPage : 1);
		} catch (err) {
			if (err.errors) {
				formErrors = err.errors;
			}
			toast.error(err.message || 'Gagal menyimpan catatan');
		} finally {
			savingLoading = false;
		}
	}

	function formatDateIndo(dateStr) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch (e) {
			return dateStr;
		}
	}

	function estimateReadTime(text) {
		if (!text) return '1 mnt baca';
		const words = text.trim().split(/\s+/).length;
		const minutes = Math.ceil(words / 180);
		return `${minutes} mnt baca`;
	}

	function insertSnippet(prefix, suffix = '') {
		const textarea = document.getElementById('konten_catatan');
		if (!textarea) return;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = form.konten;
		const selectedText = text.substring(start, end) || 'Teks contoh';
		form.konten = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
		}, 10);
	}
</script>

<svelte:head>
	<title>Catatan & Memo — SIPASN</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- Top Header & Breadcrumb (Sesuai Data Matching) -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
		<div>
			<div class="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
				<span>Utama</span>
				<span>/</span>
				<span class="text-blue-600 dark:text-blue-400 font-semibold">Catatan & Memo</span>
			</div>
			<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
				<span>Catatan & Memo Kepegawaian</span>
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
				Ruang penulisan dan dokumentasi catatan internal, ringkasan kebijakan, notula rapat, dan artikel kepegawaian.
			</p>
		</div>

		<div class="flex items-center gap-2.5 shrink-0">
			<Button
				variant="secondary"
				onclick={() => loadCatatan(currentPage)}
				disabled={loading}
				class="text-xs"
			>
				<svg class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
				Segarkan
			</Button>

			<Button
				variant="primary"
				onclick={openCreateModal}
				class="text-xs cursor-pointer"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
				Tulis Catatan Baru
			</Button>
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
		<!-- Search & Input Row -->
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
			<div class="relative flex-1 max-w-md">
				<svg class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				<input
					type="text"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					placeholder="Cari judul, isi catatan, atau penulis..."
					class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9.5 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400"
				/>
			</div>

			<Button variant="secondary" onclick={handleSearch} class="text-xs shrink-0">
				Cari
			</Button>
		</div>

		<!-- Status / Category Tabs (Sesuai Style Tabs Data Matching) -->
		<div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
			<button
				type="button"
				onclick={() => handleCategoryClick('')}
				class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
					{!selectedCategory ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'}"
			>
				<span>Semua Kategori</span>
				<span class="px-1.5 py-0.5 rounded-md text-[10px] {!selectedCategory ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}">
					{totalItems}
				</span>
			</button>

			{#each categories as cat}
				<button
					type="button"
					onclick={() => handleCategoryClick(cat)}
					class="px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2
						{selectedCategory === cat ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'}"
				>
					<span>{cat}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Content Area -->
	{#if loading}
		<div class="py-16">
			<LoadingState message="Memuat catatan..." />
		</div>
	{:else if error}
		<div class="p-6">
			<div class="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-rose-200 dark:border-rose-900/50">
				<p class="text-rose-600 dark:text-rose-400 text-xs sm:text-sm mb-3">{error}</p>
				<Button variant="secondary" onclick={() => loadCatatan(1)} class="text-xs">Coba Lagi</Button>
			</div>
		</div>
	{:else if catatanList.length === 0}
		<div class="py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs text-center p-8">
			<div class="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h6"/></svg>
			</div>
			<h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Belum Ada Catatan</h3>
			<p class="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
				{searchQuery || selectedCategory ? 'Tidak ada catatan yang sesuai dengan kata kunci atau kategori yang dipilih.' : 'Mulai tulis catatan, memo, atau artikel pertama Anda untuk keperluan dokumentasi.'}
			</p>
			<Button variant="primary" onclick={openCreateModal} class="text-xs">
				Tulis Catatan Pertama
			</Button>
		</div>
	{:else}
		<!-- Cards Grid (Article Layout) -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each catatanList as item (item.id)}
				<div
					role="button"
					tabindex="0"
					onclick={() => openReader(item)}
					onkeydown={(e) => e.key === 'Enter' && openReader(item)}
					class="group relative bg-white dark:bg-zinc-900 border rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/80 flex flex-col justify-between text-left cursor-pointer {item.is_pinned ? 'border-blue-300 dark:border-blue-800/90 bg-blue-50/15 dark:bg-blue-950/10' : 'border-zinc-200/80 dark:border-zinc-800 shadow-xs'}"
				>
					<div>
						<!-- Top Meta Header -->
						<div class="flex items-center justify-between gap-2 mb-3">
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
									{item.kategori || 'Umum'}
								</span>
								{#if item.is_pinned}
									<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22L12 23L13 22V16H18V14L16 12Z"/></svg>
										Disematkan
									</span>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
								<button
									onclick={(e) => handleTogglePin(item, e)}
									class="p-1 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
									title={item.is_pinned ? 'Lepas Sematan' : 'Sematkan di Atas'}
								>
									<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={item.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22L12 23L13 22V16H18V14L16 12Z"/></svg>
								</button>
								<button
									onclick={(e) => openEditModal(item, e)}
									class="p-1 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
									title="Edit Catatan"
								>
									<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
								</button>
								<button
									onclick={(e) => confirmDelete(item, e)}
									class="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
									title="Hapus Catatan"
								>
									<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						</div>

						<!-- Title -->
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2 leading-snug">
							{item.judul}
						</h3>

						<!-- Content Excerpt -->
						<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-3 leading-relaxed font-normal whitespace-pre-line">
							{item.konten}
						</p>
					</div>

					<!-- Bottom Meta Info -->
					<div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
						<div class="flex items-center gap-2 truncate">
							{#if item.penulis}
								<span class="text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[120px]">
									{item.penulis}
								</span>
								<span>•</span>
							{/if}
							<span class="flex items-center gap-1 font-normal shrink-0">
								<svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
								{formatDateIndo(item.updated_at || item.created_at)}
							</span>
						</div>
						<span class="text-[11px] text-zinc-400 shrink-0">
							{estimateReadTime(item.konten)}
						</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination Controls -->
		{#if totalPages > 1}
			<div class="px-4 sm:px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<div>
					Menampilkan <span class="font-bold text-zinc-800 dark:text-zinc-200">{(currentPage - 1) * 12 + 1}</span> - <span class="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(currentPage * 12, totalItems)}</span> dari <span class="font-bold text-zinc-800 dark:text-zinc-200">{totalItems}</span> catatan
				</div>
				<div class="flex items-center gap-1">
					<button
						type="button"
						disabled={currentPage <= 1}
						onclick={() => loadCatatan(currentPage - 1)}
						class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer text-xs"
					>
						Sebelumnya
					</button>
					<span class="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						{currentPage} / {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onclick={() => loadCatatan(currentPage + 1)}
						class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer text-xs"
					>
						Berikutnya
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- READER MODAL (Mode Membaca Artikel/Catatan) -->
{#if showReaderModal && activeCatatan}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showReaderModal = false; }}
	>
		<div class="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
			<!-- Reader Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h6"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
							<span>Detail Catatan & Memo</span>
							<span class="px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
								{activeCatatan.kategori || 'Umum'}
							</span>
							{#if activeCatatan.is_pinned}
								<span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
									★ Disematkan
								</span>
							{/if}
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Dokumentasi catatan dan artikel internal kepegawaian
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						onclick={(e) => openEditModal(activeCatatan, e)}
						class="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
					>
						<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
						Edit
					</button>
					<button
						onclick={() => (showReaderModal = false)}
						class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
						aria-label="Tutup"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				</div>
			</div>

			<!-- Reader Body (Article Typography) -->
			<div class="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-zinc-900">
				<div>
					<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
						{activeCatatan.judul}
					</h1>
					<div class="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 mt-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
						{#if activeCatatan.penulis}
							<span class="font-semibold text-zinc-700 dark:text-zinc-300">
								Penulis: {activeCatatan.penulis}
							</span>
							<span>•</span>
						{/if}
						<span>{formatDateIndo(activeCatatan.updated_at || activeCatatan.created_at)}</span>
						<span>•</span>
						<span>{estimateReadTime(activeCatatan.konten)}</span>
					</div>
				</div>

				<div class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed space-y-4 whitespace-pre-line font-normal">
					{activeCatatan.konten}
				</div>
			</div>

			<!-- Reader Footer -->
			<div class="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end shrink-0">
				<Button variant="secondary" onclick={() => (showReaderModal = false)} class="text-xs">
					Tutup
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- EDITOR MODAL (Tulis & Edit Catatan / Artikel) -->
{#if showEditorModal}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showEditorModal = false; }}
	>
		<div class="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
			<!-- Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
					</div>
					<div>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
							{isEditing ? 'Edit Catatan / Artikel' : 'Tulis Catatan / Artikel Baru'}
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							{isEditing ? 'Perbarui informasi dan isi catatan kepegawaian' : 'Simpan catatan, ringkasan rapat, atau dokumentasi penting'}
						</p>
					</div>
				</div>
				<button
					onclick={() => (showEditorModal = false)}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
					aria-label="Tutup"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={handleSubmit} class="p-6 overflow-y-auto space-y-4 flex-1">
				<!-- Title Input -->
				<div class="space-y-1">
					<label for="judul_catatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Judul Catatan / Artikel <span class="text-rose-500">*</span>
					</label>
					<input
						id="judul_catatan"
						type="text"
						bind:value={form.judul}
						placeholder="Tulis judul yang jelas dan deskriptif..."
						class="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
					/>
					{#if formErrors.judul}
						<p class="text-xs text-rose-500">{formErrors.judul}</p>
					{/if}
				</div>

				<!-- Meta Controls: Category & Author & Pin -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<!-- Category -->
					<div class="space-y-1">
						<label for="kategori_catatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Kategori
						</label>
						<select
							id="kategori_catatan"
							bind:value={form.kategori}
							class="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
						>
							{#each categories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>

					<!-- Author / Penulis -->
					<div class="space-y-1">
						<label for="penulis_catatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Penulis / Bagian
						</label>
						<input
							id="penulis_catatan"
							type="text"
							bind:value={form.penulis}
							placeholder="Misal: Bagian Organisasi"
							class="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
						/>
					</div>

					<!-- Pin Checkbox -->
					<div class="flex items-center gap-2 sm:pt-6">
						<label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							<input
								type="checkbox"
								bind:checked={form.is_pinned}
								class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700"
							/>
							Sematkan di Atas (Pin)
						</label>
					</div>
				</div>

				<!-- Content Textarea with Helper Bar -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="konten_catatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Isi Catatan / Artikel <span class="text-rose-500">*</span>
						</label>
						<!-- Quick Formatting Helpers -->
						<div class="flex items-center gap-1 text-[11px] text-zinc-400">
							<button type="button" onclick={() => insertSnippet('**', '**')} class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 font-semibold text-xs cursor-pointer" title="Tebal">B</button>
							<button type="button" onclick={() => insertSnippet('*', '*')} class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 italic text-xs cursor-pointer" title="Miring">I</button>
							<button type="button" onclick={() => insertSnippet('### ')} class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 font-semibold text-xs cursor-pointer" title="Sub-judul">H3</button>
							<button type="button" onclick={() => insertSnippet('- ')} class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs cursor-pointer" title="Poin List">• List</button>
						</div>
					</div>
					<textarea
						id="konten_catatan"
						bind:value={form.konten}
						rows="12"
						placeholder="Tulis artikel atau catatan secara leluasa di sini... Mendukung penulisan paragraf, daftar poin, dan format teks."
						class="w-full px-4 py-3 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 leading-relaxed resize-y font-normal"
					></textarea>
					{#if formErrors.konten}
						<p class="text-xs text-rose-500">{formErrors.konten}</p>
					{/if}
				</div>

				<!-- Footer Actions -->
				<div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200/80 dark:border-zinc-800">
					<Button variant="ghost" onclick={() => (showEditorModal = false)} class="text-xs">
						Batal
					</Button>
					<Button type="submit" variant="primary" loading={savingLoading} class="text-xs">
						{isEditing ? 'Simpan Perubahan' : 'Terbitkan Catatan'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- CONFIRM DELETE MODAL -->
<ConfirmDeleteModal
	open={showDeleteModal}
	title="Hapus Catatan"
	message={`Apakah Anda yakin ingin menghapus catatan "${itemToDelete?.judul || ''}"? Tindakan ini tidak dapat dibatalkan.`}
	loading={deleteLoading}
	onConfirm={handleDelete}
	onClose={() => (showDeleteModal = false)}
/>
