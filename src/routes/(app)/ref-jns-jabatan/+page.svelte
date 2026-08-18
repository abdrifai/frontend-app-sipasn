<script>
	import Card from '$lib/components/layout/Card.svelte';
	import JenisJabatanTab from '$lib/components/jabatan/JenisJabatanTab.svelte';
	import JenjangJabatanTab from '$lib/components/jabatan/JenjangJabatanTab.svelte';

	let activeTab = $state('jenis');
	let selectedJenisForJenjang = $state(null);

	const tabs = [
		{ 
			id: 'jenis', 
			label: 'Jenis Jabatan', 
			icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
			desc: 'Master klasifikasi jenis jabatan (Struktural, JPT, Fungsional, Administrasi)'
		},
		{ 
			id: 'jenjang', 
			label: 'Jenjang Jabatan', 
			icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12',
			desc: 'Tingkatan & jenjang per jenis jabatan (Ahli Utama, Madya, Muda, Pertama, Pelaksana, dll)'
		}
	];

	function handleSelectJenis(item) {
		selectedJenisForJenjang = item;
		activeTab = 'jenjang';
	}
</script>

<svelte:head>
	<title>Referensi Jenis & Jenjang Jabatan | SIPASN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Master Referensi Jenis & Jenjang Jabatan</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Pengelolaan terpadu klasifikasi jenis jabatan ASN beserta pemetaan tingkatan jenjang jabatannya
			</p>
		</div>
	</div>

	<!-- Modern Switcher Tabs -->
	<div class="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-2xl w-full sm:w-fit border border-zinc-200/80 dark:border-zinc-800/80">
		{#each tabs as tab}
			<button
				class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer
					{activeTab === tab.id 
						? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-800 font-extrabold' 
						: 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}"
				onclick={() => activeTab = tab.id}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d={tab.icon}/>
				</svg>
				<span>{tab.label}</span>
				{#if tab.id === 'jenjang' && selectedJenisForJenjang}
					<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Main Content Area -->
	<Card>
		{#if activeTab === 'jenis'}
			<JenisJabatanTab onSelectJenis={handleSelectJenis} />
		{:else if activeTab === 'jenjang'}
			<JenjangJabatanTab 
				bind:selectedJnsJab={selectedJenisForJenjang}
				onResetFilter={() => selectedJenisForJenjang = null}
			/>
		{/if}
	</Card>
</div>
