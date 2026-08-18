<script>
	import Card from '$lib/components/layout/Card.svelte';
	import JabatanTab from '$lib/components/jabatan/JabatanTab.svelte';
	import JenjangJabatanTab from '$lib/components/jabatan/JenjangJabatanTab.svelte';
	import JenisJabatanTab from '$lib/components/jabatan/JenisJabatanTab.svelte';

	let activeTab = $state('semua');

	const tabs = [
		{ id: 'semua', label: 'Semua Jabatan', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
		{ id: 'struktural', label: 'Struktural', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
		{ id: 'fungsional', label: 'Fungsional (JF)', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
		{ id: 'pelaksana', label: 'Pelaksana (JA)', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
		{ id: 'jenjang', label: 'Jenjang Jabatan', icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12' },
		{ id: 'jenis', label: 'Jenis Jabatan', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' }
	];
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Master Referensi Jabatan</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Database Master Terpadu ASN: Jabatan Struktural, Fungsional (JF), Pelaksana (JA), dan Konfigurasi Jenjang
			</p>
		</div>
	</div>

	<!-- Modern Tabs Filter Bar -->
	<div class="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-2xl w-full overflow-x-auto border border-zinc-200/80 dark:border-zinc-800/80 scrollbar-none">
		{#each tabs as tab}
			<button
				class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all
					{activeTab === tab.id 
						? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-800 font-extrabold' 
						: 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}"
				onclick={() => activeTab = tab.id}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d={tab.icon}/>
				</svg>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Main Content Area -->
	<Card>
		{#if activeTab === 'semua'}
			<JabatanTab initialKategori="" />
		{:else if activeTab === 'struktural'}
			<JabatanTab initialKategori="STRUKTURAL" />
		{:else if activeTab === 'fungsional'}
			<JabatanTab initialKategori="FUNGSIONAL" />
		{:else if activeTab === 'pelaksana'}
			<JabatanTab initialKategori="PELAKSANA" />
		{:else if activeTab === 'jenjang'}
			<JenjangJabatanTab />
		{:else if activeTab === 'jenis'}
			<JenisJabatanTab />
		{/if}
	</Card>
</div>
