<script>
	import { api } from '$lib/utils/api.js';
	import { debounce } from '$lib/utils/debounce.js';

	let {
		selectedId = $bindable(''),
		selectedNomor = $bindable(''),
		selectedTipeRelasi = $bindable(''),
		excludeId = null,
		label = 'Peraturan Terkait',
		placeholder = 'Cari berdasarkan nomor/judul peraturan (contoh: Perbup No. 12 Tahun 2023)...',
		showRelasiSelect = true,
		disabled = false
	} = $props();

	let searchQuery = $state('');
	let searchResults = $state([]);
	let loadingSearch = $state(false);
	let isDropdownOpen = $state(false);
	let selectedItem = $state(null);

	const RELASI_OPTIONS = [
		{ value: 'MENGUBAH', label: 'Mengubah (Mengubah sebagian pasal/ketentuan peraturan ini)', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
		{ value: 'MENCABUT', label: 'Mencabut (Menyatakan peraturan ini tidak berlaku lagi)', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200' },
		{ value: 'DIUBAH_OLEH', label: 'Diubah Oleh (Peraturan perubahan di kemudian hari)', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
		{ value: 'DICABUT_OLEH', label: 'Dicabut Oleh (Peraturan pengganti di kemudian hari)', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
		{ value: 'DASAR_HUKUM', label: 'Dasar Hukum / Peraturan Induk', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
		{ value: 'TERKAIT', label: 'Rujukan Terkait Lainnya', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-zinc-200' }
	];

	async function performSearch(query) {
		if (!query || query.trim().length < 2) {
			searchResults = [];
			loadingSearch = false;
			return;
		}
		loadingSearch = true;
		try {
			const res = await api(`/ref-peraturan/lookup?search=${encodeURIComponent(query.trim())}${excludeId ? `&exclude_id=${excludeId}` : ''}`);
			searchResults = res.data || [];
		} catch (err) {
			console.error('Gagal mencari peraturan:', err);
			searchResults = [];
		} finally {
			loadingSearch = false;
		}
	}

	const debouncedSearch = debounce((q) => {
		performSearch(q);
	}, 300);

	function handleInput(e) {
		searchQuery = e.target.value;
		isDropdownOpen = true;
		debouncedSearch(searchQuery);
	}

	function selectPeraturan(item) {
		selectedItem = item;
		selectedId = item.id;
		selectedNomor = item.nomor_peraturan;
		if (showRelasiSelect && !selectedTipeRelasi) {
			selectedTipeRelasi = 'MENGUBAH';
		}
		searchQuery = '';
		searchResults = [];
		isDropdownOpen = false;
	}

	function handleManualInputBlur() {
		setTimeout(() => {
			if (searchQuery.trim() && !selectedId) {
				selectedNomor = searchQuery.trim();
				if (showRelasiSelect && !selectedTipeRelasi) selectedTipeRelasi = 'TERKAIT';
			}
			isDropdownOpen = false;
		}, 200);
	}

	function clearSelection() {
		selectedItem = null;
		selectedId = '';
		selectedNomor = '';
		if (showRelasiSelect) selectedTipeRelasi = '';
		searchQuery = '';
		searchResults = [];
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
			{label}
		</label>
		{#if selectedNomor}
			<button
				type="button"
				onclick={clearSelection}
				class="text-[11px] text-zinc-400 hover:text-red-500 transition"
			>
				Hapus Pilihan
			</button>
		{/if}
	</div>

	<!-- Tampilan Item yang Sudah Dipilih -->
	{#if selectedNomor}
		<div class="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
			<div class="flex items-start justify-between gap-2">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-1.5 flex-wrap">
						<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
							{selectedNomor}
						</span>
						{#if selectedId}
							<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
								Terhubung ke Database
							</span>
						{:else}
							<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
								Teks Manual
							</span>
						{/if}
					</div>
					{#if selectedItem?.judul}
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
							{selectedItem.judul}
						</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={clearSelection}
					class="text-zinc-400 hover:text-red-500 p-1"
					title="Batalkan pilihan"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Pilih Tipe Relasi / Status Hubungan (Jika showRelasiSelect diaktifkan) -->
			{#if showRelasiSelect}
				<div>
					<label for="relasi-select" class="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
						Status Hubungan Regulasi:
					</label>
					<select
						id="relasi-select"
						bind:value={selectedTipeRelasi}
						class="w-full px-2.5 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
					>
						{#each RELASI_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Search Input & Dropdown -->
		<div class="relative">
			<div class="relative">
				<input
					type="text"
					{disabled}
					value={searchQuery}
					oninput={handleInput}
					onfocus={() => isDropdownOpen = true}
					onblur={handleManualInputBlur}
					{placeholder}
					class="w-full pl-9 pr-8 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 outline-none transition"
				/>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				{#if loadingSearch}
					<span class="animate-spin h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full absolute right-3 top-3"></span>
				{/if}
			</div>

			<!-- Autocomplete Dropdown -->
			{#if isDropdownOpen && searchResults.length > 0}
				<div class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each searchResults as item}
						<button
							type="button"
							onmousedown={() => selectPeraturan(item)}
							class="w-full text-left p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition flex flex-col gap-0.5"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
									{item.nomor_peraturan}
								</span>
								<span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
									{item.jenis_peraturan} - {item.tahun}
								</span>
							</div>
							<p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
								{item.judul}
							</p>
						</button>
					{/each}
				</div>
			{:else if isDropdownOpen && searchQuery.trim().length >= 2 && !loadingSearch && searchResults.length === 0}
				<div class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-center">
					<p class="text-xs text-zinc-500 dark:text-zinc-400">
						Tidak ada arsip yang cocok di database.
					</p>
					<p class="text-[11px] text-zinc-400 mt-1">
						Tekan di luar kolom untuk tetap menggunakan teks: <span class="font-semibold text-zinc-700 dark:text-zinc-300">"{searchQuery}"</span>
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
