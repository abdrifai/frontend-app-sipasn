<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { api } from '$lib/utils/api';

	let totalPegawaiAktif = $state(0);
	let totalUnorIndukAktif = $state(0);
	let loading = $state(true);

	const recentActivities = [
		{
			title: 'Pembaruan Data Riwayat Jabatan',
			detail: 'Integrasi master jabatan terpadu ref_jabatan',
			time: 'Baru saja',
			color: 'bg-emerald-500'
		},
		{
			title: 'Sinkronisasi Unit Organisasi',
			detail: 'Pemetaan 90 OPD Aktif Kab. Tojo Una-Una',
			time: '1 jam yang lalu',
			color: 'bg-indigo-500'
		},
		{
			title: 'Laporan Estimasi Pensiun Diperbarui',
			detail: 'Perhitungan BUP dan proyeksi TMT pensiun',
			time: '3 jam yang lalu',
			color: 'bg-rose-500'
		},
		{
			title: 'Verifikasi DUK Kepegawaian',
			detail: 'Penyusunan urutan kepangkatan OPD',
			time: 'Hari ini',
			color: 'bg-amber-500'
		}
	];

	async function loadDashboardStats() {
		loading = true;
		try {
			const [statsResult, unorResult] = await Promise.allSettled([
				api('/pegawai/stats'),
				api('/ref-unor/induk?limit=1&instansi_kode=7209&isAktif=1')
			]);

			if (statsResult.status === 'fulfilled') {
				totalPegawaiAktif = statsResult.value.data?.total || 0;
			}
			if (unorResult.status === 'fulfilled') {
				totalUnorIndukAktif = unorResult.value.meta?.total || 0;
			}
		} catch (err) {
			console.error('Gagal memuat statistik dashboard:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDashboardStats();
	});
</script>

<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
	<!-- Welcome Hero Banner -->
	<div class="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 text-white overflow-hidden shadow-lg border border-indigo-700/50">
		<!-- Decorative Background Glow -->
		<div class="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
		<div class="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

		<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div class="space-y-3 max-w-2xl">
				<div class="flex flex-wrap items-center gap-2">
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
						<img src="/logo-touna.png" alt="Tojo Una-Una" class="w-3.5 h-3.5 object-contain" />
						KABUPATEN TOJO UNA-UNA
					</span>
					<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
						⭐ SIVIA PATUJU
					</span>
				</div>
				<h2 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
					Halo, {$authStore.user?.nama_lengkap || $authStore.user?.nama || 'Administrator'}! 👋
				</h2>
				<p class="text-indigo-100/90 text-xs sm:text-sm font-medium leading-relaxed">
					Selamat datang di Sistem Informasi Pengelolaan Aparatur Sipil Negara (SIPASN) Pemerintah Kabupaten Tojo Una-Una.
				</p>
			</div>

			<div class="hidden md:flex items-center justify-center shrink-0">
				<div class="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-white/10 backdrop-blur-md p-2.5 border border-white/20 shadow-2xl flex items-center justify-center">
					<img src="/logo-touna.png" alt="Lambang Kabupaten Tojo Una-Una" class="w-full h-full object-contain filter drop-shadow-md" />
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Grid: Hanya Pegawai Aktif & Unor Induk Aktif -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
		<!-- Card 1: Pegawai Aktif -->
		<div class="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
			<div class="flex items-start justify-between">
				<div class="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
					PNS Aktif
				</span>
			</div>
			<div class="mt-5">
				<p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Jumlah Pegawai Aktif</p>
				{#if loading}
					<div class="h-9 w-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg mt-1"></div>
				{:else}
					<div class="flex items-baseline gap-2 mt-1">
						<p class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
							{totalPegawaiAktif.toLocaleString('id-ID')}
						</p>
						<span class="text-xs font-semibold text-zinc-400">Orang</span>
					</div>
				{/if}
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
					PNS Aktif Pemda, Diperkerjakan, dan Non-Job
				</p>
			</div>
			<div class="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
		</div>

		<!-- Card 2: Unor Induk Aktif -->
		<div class="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
			<div class="flex items-start justify-between">
				<div class="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
				</div>
				<span class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
					<span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
					Kab. Tojo Una-Una
				</span>
			</div>
			<div class="mt-5">
				<p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Jumlah Unor Induk Aktif</p>
				{#if loading}
					<div class="h-9 w-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg mt-1"></div>
				{:else}
					<div class="flex items-baseline gap-2 mt-1">
						<p class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
							{totalUnorIndukAktif.toLocaleString('id-ID')}
						</p>
						<span class="text-xs font-semibold text-zinc-400">Unit Organisasi / OPD</span>
					</div>
				{/if}
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
					Dinas, Badan, Inspektorat, Sekretariat, & Kecamatan Aktif
				</p>
			</div>
			<div class="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
		</div>
	</div>

	<!-- Main Dashboard Sections: Bantuan & Aktivitas Terbaru -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Sidebar Section: Butuh Bantuan -->
		<div class="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 text-white relative overflow-hidden group shadow-xl shadow-indigo-500/10 flex flex-col justify-between">
			<div class="relative z-10 space-y-4">
				<div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
				</div>
				<h3 class="text-2xl font-black tracking-tight">Butuh Bantuan?</h3>
				<p class="text-sm text-indigo-100/90 leading-relaxed font-medium">
					Pelajari panduan tata kelola data kepegawaian, verifikasi DUK, dan prosedur manajemen mutasi di SIPASN.
				</p>
			</div>
			<div class="relative z-10 pt-6">
				<a 
					href="/pegawai" 
					class="inline-flex items-center justify-center w-full py-3.5 bg-white text-indigo-600 rounded-2xl text-xs sm:text-sm font-black hover:bg-indigo-50 transition-colors shadow-md text-center"
				>
					Buka Data Pegawai
				</a>
			</div>
			<div class="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
		</div>
		
		<!-- Aktivitas Terbaru -->
		<div class="p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-50">Aktivitas Terbaru</h3>
					<span class="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
						Sistem Terkini
					</span>
				</div>
				<ul class="space-y-5">
					{#each recentActivities as act}
						<li class="flex items-start gap-3.5">
							<div class="w-2.5 h-2.5 rounded-full {act.color} mt-1.5 shrink-0 ring-4 ring-zinc-50 dark:ring-zinc-800/60"></div>
							<div class="space-y-0.5 flex-1">
								<p class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
									{act.title}
								</p>
								<p class="text-xs text-zinc-500 dark:text-zinc-400">
									{act.detail}
								</p>
							</div>
							<span class="text-[10px] font-semibold text-zinc-400 whitespace-nowrap">
								{act.time}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</div>
