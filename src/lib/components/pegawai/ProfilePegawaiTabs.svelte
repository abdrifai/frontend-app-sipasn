<script>
	// Standalone Riwayat Components
	import RiwayatIdentitas from './riwayat/RiwayatIdentitas.svelte';
	import RiwayatJabatan from './riwayat/RiwayatJabatan.svelte';
	import RiwayatGolongan from './riwayat/RiwayatGolongan.svelte';
	import RiwayatPendidikan from './riwayat/RiwayatPendidikan.svelte';
	import RiwayatDiklat from './riwayat/RiwayatDiklat.svelte';
	import RiwayatKgb from './riwayat/RiwayatKgb.svelte';
	import RiwayatHukdis from './riwayat/RiwayatHukdis.svelte';
	import RiwayatCpnsPns from './riwayat/RiwayatCpnsPns.svelte';
	import RiwayatProfesi from './riwayat/RiwayatProfesi.svelte';
	import RiwayatOrtu from './riwayat/RiwayatOrtu.svelte';
	import RiwayatPasangan from './riwayat/RiwayatPasangan.svelte';
	import RiwayatAnak from './riwayat/RiwayatAnak.svelte';

	let {
		pegawai = {},
		loading = false,
		error = null,
		onRetry = null,
		onReload = null,
		variant = 'card', // 'card' | 'embedded'
		defaultCategory = 'data-pokok',
		defaultTab = 'identitas'
	} = $props();

	let selectedCategory = $state(defaultCategory);
	let activeTab = $state(defaultTab);
	let copiedField = $state(null);

	function copyToClipboard(text, fieldName) {
		if (!text || text === '-') return;
		navigator.clipboard.writeText(text);
		copiedField = fieldName;
		setTimeout(() => {
			if (copiedField === fieldName) copiedField = null;
		}, 2000);
	}

	const orang = $derived(pegawai?.ta_orang || {});

	// Daftar Kategori Utama (Terpusat)
	const categories = [
		{ id: 'all', label: 'Semua Data', icon: '📂' },
		{ id: 'data-pokok', label: 'Data Pokok', icon: '👤' },
		{ id: 'karir', label: 'Karir & KGB', icon: '💼' },
		{ id: 'pendidikan', label: 'Pendidikan & Diklat', icon: '🎓' },
		{ id: 'keluarga', label: 'Keluarga', icon: '👨‍👩‍👧‍👦' },
	];

	// Definisi Semua Tab Beserta Mapping Kategori & Badge Count Dinamis (Terpusat)
	const tabs = $derived([
		{ id: 'identitas', label: 'Identitas Pegawai', icon: 'user', category: 'data-pokok' },
		{ id: 'jabatan', label: 'Riwayat Jabatan', icon: 'briefcase', category: 'karir', count: pegawai?.riwayat_jabatan?.length ?? null },
		{ id: 'golongan', label: 'Riwayat Golongan', icon: 'award', category: 'karir', count: pegawai?.riwayat_golongan?.length ?? null },
		{ id: 'pendidikan', label: 'Pendidikan', icon: 'graduation-cap', category: 'pendidikan', count: pegawai?.riwayat_pendidikan?.length ?? null },
		{ id: 'diklat', label: 'Diklat & Kursus', icon: 'file-text', category: 'pendidikan', count: pegawai?.riwayat_diklat?.length ?? null },
		{ id: 'kgb', label: 'Riwayat KGB', icon: 'trending-up', category: 'karir', count: pegawai?.riwayat_kgb?.length ?? null },
		{ id: 'hukdis', label: 'Hukuman Disiplin', icon: 'shield-alert', category: 'karir', count: pegawai?.riwayat_hukdis?.length ?? 0, isDanger: true },
		{ id: 'cpns_pns', label: 'CPNS / PNS', icon: 'landmark', category: 'data-pokok', count: pegawai?.data_cpns_pns?.length ?? null },
		{ id: 'profesi', label: 'Profesi', icon: 'stethoscope', category: 'pendidikan', count: pegawai?.riwayat_profesi?.length ?? null },
		{ id: 'ortu', label: 'Orang Tua', icon: 'users', category: 'keluarga', count: pegawai?.riwayat_ortu?.length ?? null },
		{ id: 'pasangan', label: 'Pasangan (Suami/Istri)', icon: 'heart', category: 'keluarga', count: pegawai?.riwayat_pasangan?.length ?? null },
		{ id: 'anak', label: 'Anak', icon: 'smile', category: 'keluarga', count: pegawai?.riwayat_anak?.length ?? null },
	]);

	const visibleTabs = $derived(
		selectedCategory === 'all' 
			? tabs 
			: tabs.filter(t => t.category === selectedCategory)
	);

	function setCategory(catId) {
		selectedCategory = catId;
		const available = catId === 'all' ? tabs : tabs.filter(t => t.category === catId);
		if (!available.some(t => t.id === activeTab) && available.length > 0) {
			activeTab = available[0].id;
		}
	}

	function selectTab(tabId) {
		activeTab = tabId;
	}
</script>

<div class="{variant === 'card' 
	? 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden transition-all duration-300' 
	: 'overflow-hidden'}">
	
	<!-- Category Filter & Tab Navigation Header -->
	<div class="bg-zinc-50/60 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800/80 p-3 sm:px-4 space-y-2.5">
		<!-- Category Selector Chips (Minimalist Rounded Pills) -->
		<div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
			{#each categories as cat}
				<button
					type="button"
					onclick={() => setCategory(cat.id)}
					class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer
						{selectedCategory === cat.id 
							? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs' 
							: 'bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/70 hover:bg-zinc-100 dark:hover:bg-zinc-700/60'}"
				>
					<span>{cat.icon}</span>
					<span>{cat.label}</span>
				</button>
			{/each}
		</div>

		<!-- Garis Pemisah Visual Antara Kategori dan Sub-Kategori -->
		<div class="h-px bg-zinc-200/80 dark:bg-zinc-800/80 w-full"></div>

		<!-- Tabs Ribbon (Sub-Kategori / Riwayat) -->
		<div class="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-0.5">
			{#each visibleTabs as tab}
				<button
					type="button"
					onclick={() => selectTab(tab.id)}
					class="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer
						{activeTab === tab.id
							? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700 ring-1 ring-indigo-500/10'
							: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/50'}"
				>
					{#if tab.icon === 'user'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					{:else if tab.icon === 'landmark'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
					{:else if tab.icon === 'briefcase'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
					{:else if tab.icon === 'award'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="m15.4 12.5 2.1 7.5-5.5-3-5.5 3 2.1-7.5"/></svg>
					{:else if tab.icon === 'trending-up'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
					{:else if tab.icon === 'shield-alert'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
					{:else if tab.icon === 'stethoscope'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
					{:else if tab.icon === 'graduation-cap'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
					{:else if tab.icon === 'file-text'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
					{:else if tab.icon === 'users'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					{:else if tab.icon === 'heart'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
					{:else if tab.icon === 'smile'}
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
					{/if}

					<span>{tab.label}</span>

					{#if tab.count !== undefined && tab.count !== null}
						<span class="px-1.5 py-0.2 text-[10px] rounded-full font-bold
							{tab.isDanger && tab.count > 0 
								? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' 
								: (activeTab === tab.id 
									? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
									: 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400')}"
						>
							{tab.count}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Tab Content Area -->
	<div class="p-3 sm:p-6">
		{#if loading && !pegawai?.id}
			<div class="space-y-3 py-4 animate-pulse">
				<div class="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="h-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl"></div>
					<div class="h-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl"></div>
					<div class="h-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl"></div>
					<div class="h-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl"></div>
				</div>
			</div>
		{:else if error}
			<div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs">
				<p class="font-semibold">{error}</p>
				{#if onRetry}
					<button 
						onclick={onRetry}
						class="mt-2 underline font-bold hover:no-underline cursor-pointer"
					>
						Coba Muat Ulang
					</button>
				{/if}
			</div>
		{:else if activeTab === 'identitas'}
			<RiwayatIdentitas 
				{orang} 
				fullData={pegawai} 
				pegawaiId={pegawai?.id}
				{copiedField} 
				{copyToClipboard} 
				onSuccess={onReload}
			/>
		{:else if activeTab === 'jabatan'}
			<RiwayatJabatan 
				riwayat={pegawai?.riwayat_jabatan || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'golongan'}
			<RiwayatGolongan 
				riwayat={pegawai?.riwayat_golongan || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'pendidikan'}
			<RiwayatPendidikan 
				riwayat={pegawai?.riwayat_pendidikan || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'diklat'}
			<RiwayatDiklat 
				riwayat={pegawai?.riwayat_diklat || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'kgb'}
			<RiwayatKgb 
				riwayat={pegawai?.riwayat_kgb || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'hukdis'}
			<RiwayatHukdis 
				riwayat={pegawai?.riwayat_hukdis || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'cpns_pns'}
			<RiwayatCpnsPns 
				riwayat={pegawai?.data_cpns_pns || pegawai?.riwayat_cpns_pns || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'profesi'}
			<RiwayatProfesi 
				riwayat={pegawai?.riwayat_profesi || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'ortu'}
			<RiwayatOrtu 
				riwayat={pegawai?.riwayat_ortu || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'pasangan'}
			<RiwayatPasangan 
				riwayat={pegawai?.riwayat_pasangan || []} 
				pegawaiId={pegawai?.id}
				onSuccess={onReload}
			/>
		{:else if activeTab === 'anak'}
			<RiwayatAnak 
				riwayat={pegawai?.riwayat_anak || []} 
				pegawaiId={pegawai?.id}
				riwayatPasangan={pegawai?.riwayat_pasangan || []}
				onSuccess={onReload}
			/>
		{/if}
	</div>
</div>
