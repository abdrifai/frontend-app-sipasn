<script>
	import { goto } from '$app/navigation';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import { api } from '$lib/utils/api.js';
	import { sidebarStore } from '$lib/stores/sidebarStore.js';
	import { tick } from 'svelte';

	let {
		open = false,
		onSelect = null,
		onClose = () => {}
	} = $props();

	let search = $state('');
	let pegawai = $state([]);
	let loading = $state(false);
	let error = $state(null);
	let page = $state(1);
	let limit = $state(10);
	let total = $state(0);
	let totalPages = $state(1);
	let hasSearched = $state(false);
	let inputRef = $state(null);

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// Saat modal dibuka, fokuskan input otomatis
	$effect(() => {
		if (open) {
			tick().then(() => {
				if (inputRef) inputRef.focus();
			});
		} else {
			search = '';
			pegawai = [];
			hasSearched = false;
			error = null;
		}
	});

	async function loadPegawai() {
		if (!search.trim()) {
			pegawai = [];
			total = 0;
			totalPages = 1;
			loading = false;
			hasSearched = false;
			return;
		}

		loading = true;
		error = null;
		hasSearched = true;

		try {
			const query = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				search: search.trim()
			});
			const res = await api(`/pegawai?${query.toString()}`);
			pegawai = res.data || [];
			totalPages = res.meta?.totalPages || 1;
			total = res.meta?.total || 0;
		} catch (err) {
			error = err.message || 'Gagal mencari data pegawai';
		} finally {
			loading = false;
		}
	}

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		if (!search.trim()) {
			pegawai = [];
			total = 0;
			hasSearched = false;
			return;
		}

		searchTimeout = setTimeout(() => {
			page = 1;
			loadPegawai();
		}, 300);
	}

	function handleSearchSubmit(e) {
		e?.preventDefault?.();
		clearTimeout(searchTimeout);
		if (search.trim()) {
			page = 1;
			loadPegawai();
		}
	}

	function handleClearSearch() {
		search = '';
		pegawai = [];
		total = 0;
		hasSearched = false;
		if (inputRef) inputRef.focus();
	}

	function handleSelect(p) {
		if (!p?.id) return;
		onClose();
		if (onSelect && typeof onSelect === 'function') {
			onSelect(p);
		} else {
			sidebarStore.collapse();
			goto(`/pegawai/${p.id}`, { invalidateAll: true });
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Escape' && open) {
			onClose();
		}
	}

	function handlePageChange(newPage) {
		if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
			page = newPage;
			loadPegawai();
		}
	}

	const visiblePages = $derived.by(() => {
		const pages = [];
		const maxVisible = 5;
		let start = Math.max(1, page - 2);
		let end = Math.min(totalPages, start + maxVisible - 1);
		if (end - start < maxVisible - 1) {
			start = Math.max(1, end - maxVisible + 1);
		}
		for (let i = start; i <= end; i++) {
			pages.push(i);
		}
		return pages;
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
	<!-- Backdrop Overlay -->
	<div 
		class="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		role="presentation"
	>
		<!-- Modal Content Box (Static Steady Size) -->
		<div 
			class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl h-[560px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Modal Header with Search Input (Fixed Height Header) -->
			<div class="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 shrink-0">
				<div class="flex items-center justify-between gap-3 mb-2.5">
					<div class="flex items-center gap-2">
						<div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						</div>
						<h3 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
							Cari Data Pegawai
						</h3>
					</div>

					<button 
						onclick={onClose}
						class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
						title="Tutup (Esc)"
						aria-label="Tutup"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</button>
				</div>

				<form onsubmit={handleSearchSubmit} class="relative group">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input 
						bind:this={inputRef}
						type="text" 
						placeholder="Ketik NIP (contoh: 198...) atau Nama lengkap pegawai..." 
						bind:value={search}
						oninput={handleSearchInput}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleSearchSubmit(e);
							}
						}}
						class="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-medium shadow-2xs"
					/>
					{#if search}
						<button 
							type="button"
							onclick={handleClearSearch}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded transition-colors cursor-pointer"
							title="Hapus pencarian"
							aria-label="Hapus pencarian"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					{/if}
				</form>

				<div class="flex items-center justify-between mt-2 text-[11px] text-zinc-400 px-0.5">
					<span>
						{#if search && hasSearched}
							Ditemukan <strong class="text-indigo-600 dark:text-indigo-400 font-semibold">{total} pegawai</strong> untuk "{search}"
						{:else}
							Ketik minimal 1 karakter untuk mencari otomatis
						{/if}
					</span>
					<span class="hidden sm:inline">Tekan <kbd class="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Esc</kbd> untuk keluar</span>
				</div>
			</div>

			<!-- Modal Body: Results List / Table (Fixed Flexible Container) -->
			<div class="flex-1 overflow-y-auto min-h-0">
				{#if loading}
					<div class="h-full flex items-center justify-center py-16">
						<LoadingState message="Mencari data pegawai..." />
					</div>
				{:else if error}
					<div class="h-full flex items-center justify-center p-6">
						<ErrorState message={error} onRetry={loadPegawai} />
					</div>
				{:else if !hasSearched || !search.trim()}
					<div class="h-full flex flex-col items-center justify-center gap-2 text-zinc-400 py-16 px-4 text-center">
						<div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						</div>
						<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Pencarian Cepat Pegawai</p>
						<p class="text-[11px] text-zinc-400 max-w-xs">Ketik NIP atau Nama pegawai pada kolom di atas untuk menampilkan hasil pencarian.</p>
					</div>
				{:else if pegawai.length === 0}
					<div class="h-full flex items-center justify-center py-16">
						<EmptyState message={`Tidak ditemukan pegawai dengan kata kunci "${search}".`} />
					</div>
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
						{#each pegawai as p (p.id)}
							<a 
								href="/pegawai/{p.id}"
								onclick={(e) => {
									e.preventDefault();
									handleSelect(p);
								}}
								class="w-full text-left p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors group block"
							>
								<!-- Pegawai Info -->
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<Avatar 
										src={p.foto ? (p.foto.startsWith('http') ? p.foto : `${API_BASE}/${p.foto}`) : ''} 
										name={p.nama} 
										size="md" 
									/>
									<div class="min-w-0 flex-1 space-y-0.5">
										<div class="flex flex-wrap items-center gap-2">
											<p class="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
												{p.nama}
											</p>
											<span class="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
												{p.nip}
											</span>
											<Badge variant="indigo">{p.golongan}</Badge>
										</div>

										<p class="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
											{p.jabatan}
										</p>
										<p class="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
											{p.unit_kerja}
										</p>
									</div>
								</div>

								<!-- Subtle Arrow Indicator on Hover -->
								<div class="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Modal Footer: Static Fixed Height Bar -->
			<div class="h-12 px-3.5 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-between gap-2.5 text-xs shrink-0">
				{#if hasSearched && pegawai.length > 0}
					<p class="text-zinc-500 dark:text-zinc-400 text-[11px] truncate">
						Menampilkan <strong class="text-zinc-700 dark:text-zinc-200">{(page - 1) * limit + 1}</strong> - <strong class="text-zinc-700 dark:text-zinc-200">{Math.min(page * limit, total)}</strong> dari <strong class="text-zinc-700 dark:text-zinc-200">{total.toLocaleString('id-ID')}</strong> pegawai
					</p>

					<div class="flex items-center gap-1 shrink-0">
						<button 
							disabled={page <= 1 || loading}
							onclick={() => handlePageChange(page - 1)}
							class="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors cursor-pointer"
						>
							Sebelumnya
						</button>

						{#each visiblePages as p}
							<button 
								onclick={() => handlePageChange(p)}
								class="w-6 h-6 rounded-md font-semibold text-xs transition-colors cursor-pointer {page === p ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'}"
							>
								{p}
							</button>
						{/each}

						<button 
							disabled={page >= totalPages || loading}
							onclick={() => handlePageChange(page + 1)}
							class="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors cursor-pointer"
						>
							Berikutnya
						</button>
					</div>
				{:else}
					<div class="flex items-center justify-between w-full text-[11px] text-zinc-400">
						<span>Pencarian realtime berdasarkan NIP atau Nama pegawai</span>
						<span class="hidden sm:inline">Navigasi: <kbd class="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Esc</kbd> Tutup</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
