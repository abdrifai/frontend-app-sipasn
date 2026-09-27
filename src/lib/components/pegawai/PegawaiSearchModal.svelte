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
				search: search.trim(),
				status: 'semua'
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

	function checkIsAktif(p) {
		if (!p) return false;
		if (p.is_aktif !== undefined) return Boolean(p.is_aktif);
		if (p.status_pns) return !p.status_pns.toLowerCase().includes('non');
		if (p.kedudukanPns_id) return [1, 7, 8, 10].includes(Number(p.kedudukanPns_id));
		return true;
	}

	function handleSelect(p) {
		if (!checkIsAktif(p)) return;
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

	const allRetired = $derived(
		pegawai.length > 0 &&
		pegawai.every((p) => !checkIsAktif(p))
	);

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

			<!-- Modal Body: Results List / Messages (Flex Column Container for perfect centering) -->
			<div class="flex-1 overflow-y-auto min-h-0 flex flex-col">
				{#if loading}
					<div class="flex-1 flex items-center justify-center p-6">
						<LoadingState message="Mencari data pegawai..." />
					</div>
				{:else if error}
					<div class="flex-1 flex items-center justify-center p-6">
						<ErrorState message={error} onRetry={loadPegawai} />
					</div>
				{:else if !hasSearched || !search.trim()}
					<div class="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400 p-6 text-center">
						<div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						</div>
						<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Pencarian Cepat Pegawai</p>
						<p class="text-[11px] text-zinc-400 max-w-xs">Ketik NIP atau Nama pegawai pada kolom di atas untuk menampilkan hasil pencarian.</p>
					</div>
				{:else if pegawai.length === 0}
					<!-- 1. DATA TIDAK DITEMUKAN ATAU TIDAK ADA DALAM DATABASE (TEPAT DI TENGAH MODAL) -->
					<div class="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto animate-in fade-in duration-200">
						<div class="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3 shadow-inner">
							<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="8"/>
								<path d="m21 21-4.3-4.3"/>
								<line x1="8" y1="11" x2="14" y2="11"/>
							</svg>
						</div>
						<h4 class="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
							Data Tidak Ditemukan atau Tidak Ada dalam Database
						</h4>
						<p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 max-w-sm">
							Data pegawai dengan kata kunci <span class="font-semibold text-zinc-800 dark:text-zinc-200">"{search}"</span> tidak ditemukan atau tidak ada dalam database sistem.
						</p>
						<div class="w-full text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
							<div class="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
								Petunjuk
							</div>
							<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
								Pastikan NIP (18 digit tanpa spasi) atau ejaan Nama pegawai yang dimasukkan sudah benar dan terdaftar dalam database.
							</p>
						</div>
					</div>
				{:else if allRetired}
					<!-- 2. DATA DITEMUKAN TETAPI BERSTATUS PENSIUN (TEPAT DI TENGAH MODAL & TIDAK BISA DI-KLIK KE DETAIL) -->
					<div class="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto animate-in fade-in duration-200">
						<!-- Icon Pensiun -->
						<div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-sm">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"/>
								<line x1="12" y1="8" x2="12" y2="12"/>
								<line x1="12" y1="16" x2="12.01" y2="16"/>
							</svg>
						</div>

						<h4 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
							Pegawai Telah Pensiun
						</h4>
						<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 max-w-sm">
							Data pegawai ditemukan dalam database, namun pegawai yang bersangkutan telah berstatus pensiun.
						</p>

						<!-- Informasi Pegawai Pensiun (Statis / Tidak Bisa Di-Klik) -->
						<div class="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-4 text-left space-y-3 shadow-2xs select-none">
							{#each pegawai as p (p.id)}
								<div class="flex items-center gap-3">
									<Avatar 
										src={p.foto ? (p.foto.startsWith('http') ? p.foto : `${API_BASE}/${p.foto}`) : ''} 
										name={p.nama} 
										size="md" 
									/>
									<div class="min-w-0 flex-1 space-y-0.5">
										<div class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
											{p.nama}
										</div>
										<div class="text-xs font-mono text-zinc-500 dark:text-zinc-400">
											NIP: {p.nip}
										</div>
										{#if p.unit_kerja && p.unit_kerja !== '-'}
											<div class="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
												Unit Kerja Terakhir: {p.unit_kerja}
											</div>
										{/if}
									</div>
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shrink-0">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
										Pegawai telah pensiun
									</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
						{#each pegawai as p (p.id)}
							{@const isAktif = checkIsAktif(p)}
							{#if isAktif}
								<!-- Pegawai Aktif (Bisa Di-Klik) -->
								<button 
									type="button"
									onclick={() => handleSelect(p)}
									class="w-full text-left p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors group"
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
												{#if p.golongan && p.golongan !== '-'}
													<Badge variant="indigo">{p.golongan}</Badge>
												{/if}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
													Aktif
												</span>
											</div>

											<p class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-snug break-words">
												{p.jabatan}
											</p>
											{#if p.unit_kerja}
												<p class="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug break-words mt-0.5">
													{p.unit_kerja}
												</p>
											{/if}
										</div>
									</div>

									<!-- Subtle Arrow Indicator on Hover -->
									<div class="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
									</div>
								</button>
							{:else}
								<!-- Pegawai Telah Pensiun dalam daftar campuran (TIDAK BISA DI-KLIK) -->
								<div 
									class="w-full text-left p-3 sm:px-4 flex items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-rose-500 opacity-80 cursor-not-allowed select-none pointer-events-none"
									title="Pegawai telah pensiun dan tidak dapat dipilih"
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
												<p class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate">
													{p.nama}
												</p>
												<span class="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
													{p.nip}
												</span>
												<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
													<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
													Pegawai telah pensiun
												</span>
											</div>

											<p class="text-xs font-medium text-rose-600 dark:text-rose-400 leading-snug break-words">
												Pegawai telah pensiun
											</p>
											{#if p.unit_kerja && p.unit_kerja !== '-'}
												<p class="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug break-words mt-0.5">
													Unit Kerja Terakhir: {p.unit_kerja}
												</p>
											{/if}
										</div>
									</div>

									<span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-1 rounded-md shrink-0">
										Tidak dapat dipilih
									</span>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<!-- Modal Footer: Static Fixed Height Bar -->
			<div class="h-12 px-3.5 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-between gap-2.5 text-xs shrink-0">
				{#if allRetired}
					<div class="flex items-center justify-between w-full text-[11px] text-zinc-400">
						<span class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
							<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
							Status: Pegawai Pensiun
						</span>
						<span class="hidden sm:inline">Navigasi: <kbd class="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Esc</kbd> Tutup</span>
					</div>
				{:else if hasSearched && pegawai.length > 0}
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
