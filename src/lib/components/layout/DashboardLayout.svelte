<script>
	import Sidebar from './Sidebar.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';
	import { sidebarStore } from '$lib/stores/sidebarStore';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';

	let { children } = $props();
	let ready = $state(false);

	const routeNames = {
		'/dashboard': 'Dashboard',
		'/pegawai': 'Data Pegawai',
		'/laporan/duk': 'Laporan DUK Pegawai',
		'/laporan/statistik': 'Statistik Kepegawaian',
		'/laporan/pensiun': 'Estimasi Pensiun (BUP)',
		'/users': 'Manajemen Pengguna',
		'/profile': 'Profil Pengguna',
		'/ref-jabatan': 'Referensi Master Jabatan Terpadu',
		'/ref-jns-jabatan': 'Referensi Jenis & Jenjang Jabatan',
		'/ref-unor': 'Referensi Unit Organisasi',
		'/ref-pendidikan': 'Referensi Pendidikan',
		'/ref-diklat': 'Referensi Diklat',
		'/ref-kedudukan-pns': 'Referensi Kedudukan PNS',
		'/ref-jns-mutasi': 'Referensi Jenis Mutasi',
		'/ref-jns-hukuman': 'Referensi Jenis Hukuman',
		'/ref-jns-unor': 'Referensi Jenis Unit Organisasi'
	};

	let pageTitle = $derived.by(() => {
		const path = $page.url.pathname;
		if (routeNames[path]) return routeNames[path];
		if (path.startsWith('/pegawai/')) return 'Detail Pegawai';
		return 'SIPASN';
	});

	onMount(async () => {
		try {
			const res = await api('/auth/me');
			authStore.setUser(res.data);
			ready = true;
		} catch (err) {
			console.error('Auth check failed', err);
			goto('/login');
		}
	});

	function toggleSidebar() {
		sidebarStore.toggle();
	}
</script>

<div class="min-h-screen bg-slate-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex">
	{#if ready}
		<Sidebar collapsed={$sidebarStore.collapsed} mobileOpen={$sidebarStore.mobileOpen} />
		
		<div class="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 {$sidebarStore.collapsed ? 'lg:ml-20' : 'lg:ml-64'}">
			<!-- Topbar -->
			<header class="sticky top-0 z-40 h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-8 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button 
						onclick={toggleSidebar}
						class="p-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer shadow-2xs"
						title="Toggle Sidebar"
						aria-label="Toggle Sidebar"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
						</svg>
					</button>

					<!-- Breadcrumb Navigation -->
					<div class="hidden sm:flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
						<a href="/dashboard" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">SIPASN</a>
						<span>/</span>
						<span class="text-zinc-800 dark:text-zinc-200 font-bold">{pageTitle}</span>
					</div>
				</div>
				
				<!-- Right Action Area -->
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs text-zinc-700 dark:text-zinc-200 text-xs font-bold">
						<img src="/logo-touna.png" alt="Kab. Tojo Una-Una" class="w-4 h-4 object-contain" />
						<span class="hidden sm:inline">Kab. Tojo Una-Una</span>
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
					</div>
				</div>
			</header>

			<!-- Page Body Container -->
			<main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
				{@render children()}
			</main>
		</div>
	{:else}
		<div class="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
			<div class="flex flex-col items-center gap-4">
				<div class="relative flex items-center justify-center">
					<div class="w-16 h-16 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
					<div class="absolute inset-0 flex items-center justify-center">
						<img src="/logo-touna.png" alt="Loading" class="w-7 h-7 object-contain drop-shadow-xs" />
					</div>
				</div>
				<p class="text-xs font-bold uppercase tracking-widest text-zinc-400 animate-pulse">Memuat Workspace SIPASN...</p>
			</div>
		</div>
	{/if}
</div>

