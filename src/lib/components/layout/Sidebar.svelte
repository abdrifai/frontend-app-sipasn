<script>
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';
	import { sidebarStore } from '$lib/stores/sidebarStore';
	import { api } from '$lib/utils/api.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ThemeToggle from '../ui/ThemeToggle.svelte';
	import AppLogo from '../ui/AppLogo.svelte';

	const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

	let { collapsed = false, mobileOpen = false } = $props();

	let isMobile = $state(false);

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	let isCollapsedDesktop = $derived(collapsed && !isMobile);

	function handleNavClick() {
		if (isMobile) {
			sidebarStore.closeMobile();
		}
	}

	async function handleLogout() {
		try {
			await api('/auth/logout', { method: 'POST' });
		} catch (err) {
			console.error('Logout failed:', err);
		} finally {
			authStore.clear();
			goto('/login');
		}
	}

	const menuItems = [
		{
			category: 'UTAMA',
			items: [
				{
					name: 'Dashboard',
					path: '/dashboard',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/></svg>`
				},
				{
					name: 'Data Pegawai',
					path: '/pegawai',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
				}
			]
		},
		{
			category: 'PELAPORAN & ANALISIS',
			items: [
				{
					name: 'Laporan',
					id: 'laporan',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`,
					children: [
						{ name: 'Daftar Urut Kepangkatan', path: '/laporan/duk' },
						{ name: 'Statistik Kepegawaian', path: '/laporan/statistik' },
						{ name: 'Estimasi Pensiun (BUP)', path: '/laporan/pensiun' }
					]
				}
			]
		},
		{
			category: 'SISTEM & MASTER DATA',
			items: [
				{
					name: 'Pengaturan & Master',
					id: 'pengaturan',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1-1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
					children: [
						{
							name: 'Manajemen User',
							path: '/users'
						},
						{
							name: 'Master Referensi',
							id: 'referensi',
							isSubGroup: true,
							children: [
								{ name: 'Pendidikan', path: '/ref-pendidikan' },
								{ name: 'Diklat', path: '/ref-diklat' },
								{ name: 'Jabatan Terpadu', path: '/ref-jabatan' },
								{ name: 'Jenis & Jenjang Jabatan', path: '/ref-jns-jabatan' },
								{ name: 'Kedudukan PNS', path: '/ref-kedudukan-pns' },
								{ name: 'Jenis Mutasi', path: '/ref-jns-mutasi' },
								{ name: 'Jenis Hukuman', path: '/ref-jns-hukuman' },
								{ name: 'Unit Organisasi (OPD)', path: '/ref-unor' },
								{ name: 'Jenis Unit Organisasi', path: '/ref-jns-unor' }
							]
						}
					]
				}
			]
		}
	];

	let expandedGroups = $state({
		pengaturan: false,
		referensi: false,
		laporan: false
	});

	function toggleGroup(id) {
		expandedGroups[id] = !expandedGroups[id];
	}

	// Auto-expand if child is active
	$effect(() => {
		const path = $page.url.pathname;
		if (path === '/users') expandedGroups.pengaturan = true;
		if (path.startsWith('/ref-')) {
			expandedGroups.pengaturan = true;
			expandedGroups.referensi = true;
		}
		if (path.startsWith('/laporan/')) expandedGroups.laporan = true;
	});

	// Auto close mobile menu when path changes
	$effect(() => {
		$page.url.pathname;
		if (typeof window !== 'undefined' && window.innerWidth < 1024) {
			sidebarStore.closeMobile();
		}
	});

	function handleKeyDown(e) {
		if (e.key === 'Escape' && mobileOpen) {
			sidebarStore.closeMobile();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if mobileOpen}
	<!-- Backdrop Overlay for Mobile -->
	<button
		type="button"
		aria-label="Tutup menu navigasi"
		onclick={() => sidebarStore.closeMobile()}
		class="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-40 transition-opacity duration-300 lg:hidden cursor-pointer"
	></button>
{/if}

<aside
	class="fixed left-0 top-0 bottom-0 h-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-r border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 z-50 flex flex-col
		w-72 {isCollapsedDesktop ? 'lg:w-20' : 'lg:w-64'}
		{mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}"
>
	<!-- Logo / Brand Header -->
	<div
		class="h-20 flex items-center justify-between {isCollapsedDesktop ? 'lg:justify-center lg:px-2 px-5' : 'px-5'} border-b border-zinc-100 dark:border-zinc-900 group hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
	>
		<a 
			href="/dashboard"
			onclick={handleNavClick}
			class="flex items-center gap-2"
			title="SIPASN Kabupaten Tojo Una-Una"
		>
			<AppLogo 
				size={isCollapsedDesktop ? 'sm' : 'md'} 
				iconOnly={isCollapsedDesktop}
				variant="glow"
				subtitle="Kab. Tojo Una-Una"
			/>
		</a>

		<!-- Close Button for Mobile -->
		<button
			type="button"
			onclick={() => sidebarStore.closeMobile()}
			class="lg:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
			aria-label="Tutup Sidebar"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/>
				<line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-none">
		{#each menuItems as group}
			<div class="space-y-1">
				{#if !isCollapsedDesktop}
					<p class="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
						{group.category}
					</p>
				{/if}
				{#each group.items as item}
					{#if item.children}
						<div class="space-y-1">
							<button
								onclick={() => toggleGroup(item.id)}
								class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer group
									{item.children.some((c) => $page.url.pathname === c.path || (c.children?.some(sc => $page.url.pathname === sc.path)))
										? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
										: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'}"
							>
								<span class="shrink-0 transition-transform duration-200 group-hover:scale-110">
									{@html item.icon}
								</span>
								{#if !isCollapsedDesktop}
									<span class="truncate">{item.name}</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="ml-auto transition-transform duration-300 {expandedGroups[item.id] ? 'rotate-180' : ''}"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								{/if}
							</button>

							{#if expandedGroups[item.id] && !isCollapsedDesktop}
								<div class="pl-7 pr-1 py-1 space-y-1 border-l-2 border-zinc-100 dark:border-zinc-800/80 ml-4">
									{#each item.children as child}
										{#if child.children}
											<!-- Sub Group -->
											<div class="space-y-1 pt-1">
												<button
													onclick={() => toggleGroup(child.id)}
													class="w-full flex items-center justify-between py-1.5 px-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer
														{child.children.some(sc => $page.url.pathname === sc.path)
															? 'text-indigo-600 dark:text-indigo-400 font-bold'
															: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
												>
													<span class="truncate">{child.name}</span>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
														stroke-linecap="round"
														stroke-linejoin="round"
														class="transition-transform duration-300 {expandedGroups[child.id] ? 'rotate-180' : ''}"
													>
														<path d="m6 9 6 6 6-6" />
													</svg>
												</button>
												{#if expandedGroups[child.id]}
													<div class="pl-3 py-1 space-y-1 border-l border-zinc-200/70 dark:border-zinc-700/60 ml-2">
														{#each child.children as subChild}
															<a
																href={subChild.path}
																onclick={handleNavClick}
																class="block py-1.5 px-2 text-xs rounded-lg transition-all duration-200
																	{$page.url.pathname === subChild.path
																		? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-500/10'
																		: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}"
															>
																{subChild.name}
															</a>
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<a
												href={child.path}
												onclick={handleNavClick}
												class="flex items-center py-2 px-2.5 text-xs font-semibold rounded-lg transition-all duration-200
													{$page.url.pathname === child.path
														? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10'
														: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}"
											>
												{child.name}
											</a>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<a
							href={item.path}
							onclick={handleNavClick}
							class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 group
								{$page.url.pathname === item.path
									? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
									: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<span class="shrink-0 transition-transform duration-200 group-hover:scale-110">
								{@html item.icon}
							</span>
							{#if !isCollapsedDesktop}
								<span class="truncate">{item.name}</span>
							{/if}
							{#if $page.url.pathname === item.path && !isCollapsedDesktop}
								<div class="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>
							{/if}
						</a>
					{/if}
				{/each}
			</div>
		{/each}
	</nav>

	<!-- User / Profile Footer -->
	<div class="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/40">
		{#if !isCollapsedDesktop}
			<div class="flex items-center gap-3 p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs">
				<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shrink-0 flex items-center justify-center text-white text-xs font-black overflow-hidden shadow-sm">
					{#if $authStore.user?.profile_photo_path}
						<img src={`${API_BASE}/${$authStore.user.profile_photo_path}`} alt="Avatar" class="w-full h-full object-cover" />
					{:else}
						{$authStore.user?.nama_lengkap?.charAt(0) || $authStore.user?.nama?.charAt(0) || 'U'}
					{/if}
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
						{$authStore.user?.nama_lengkap || $authStore.user?.nama || 'Administrator'}
					</p>
					<a href="/profile" onclick={handleNavClick} class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold mt-0.5 inline-block">
						Lihat Profil
					</a>
				</div>
			</div>
		{/if}
		<div class="flex items-center justify-between px-1">
			<ThemeToggle />
			{#if !isCollapsedDesktop}
				<button 
					onclick={handleLogout}
					class="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer flex items-center gap-1.5"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
					Logout
				</button>
			{/if}
		</div>
	</div>
</aside>
