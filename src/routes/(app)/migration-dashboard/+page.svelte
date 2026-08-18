<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	// State Jabatan Migration
	let stats = $state(null);
	let loading = $state(true);
	let error = $state(null);

	// State Unor Migration
	let unorStats = $state(null);
	let loadingUnor = $state(true);
	let migratingUnor = $state(false);

	async function loadStats() {
		loading = true;
		try {
			const res = await api('/pegawai/migration-stats');
			stats = res.data;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadUnorStats() {
		loadingUnor = true;
		try {
			const res = await api('/ref-unor/migration-stats');
			unorStats = res.data;
		} catch (err) {
			console.error('Gagal memuat statistik unor:', err);
		} finally {
			loadingUnor = false;
		}
	}

	async function runUnorMigration() {
		if (!confirm('Apakah Anda yakin ingin menjalankan migrasi data Unit Organisasi ke tabel ref_unitorganisasi?')) {
			return;
		}

		migratingUnor = true;
		try {
			const res = await api('/ref-unor/migrate', { method: 'POST' });
			toast.success(res.message || 'Migrasi Unit Organisasi berhasil diselesaikan!');
			await loadUnorStats();
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat migrasi Unit Organisasi');
		} finally {
			migratingUnor = false;
		}
	}

	onMount(() => {
		loadStats();
		loadUnorStats();
	});

	const migratedCount = $derived(stats ? stats.categories.reduce((acc, cat) => cat.source !== 'ref_nmjabsimpeglama' ? acc + cat.count : acc, 0) : 0);
	const migrationPercentage = $derived(stats ? (migratedCount / stats.total * 100).toFixed(1) : 0);
</script>

<div class="p-6 max-w-7xl mx-auto space-y-10">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Dashboard Migrasi Sistem</h1>
            <p class="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Pantau dan kelola migrasi skema database jabatan dan unit organisasi terpadu.</p>
        </div>
        <button 
            onclick={() => { loadStats(); loadUnorStats(); }}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={loading || loadingUnor ? 'animate-spin' : ''}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Refresh Semua Data
        </button>
    </div>

    <!-- SECTION 1: UNIT ORGANISASI MIGRATION (ref_unitorganisasi) -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 9h6"/><path d="M15 15h6"/></svg>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-zinc-900 dark:text-white">1. Migrasi Tabel Tunggal Unit Organisasi</h2>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">Penyatuan 4 tabel lama ke tabel tunggal <code class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400">ref_unitorganisasi</code></p>
                </div>
            </div>

            <button
                onclick={runUnorMigration}
                disabled={migratingUnor}
                class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95"
            >
                {#if migratingUnor}
                    <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Memproses Migrasi...</span>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    <span>{unorStats?.isMigrated ? 'Sinkron Ulang Migrasi UNOR' : 'Jalankan Migrasi UNOR'}</span>
                {/if}
            </button>
        </div>

        {#if loadingUnor && !unorStats}
            <div class="h-32 bg-white dark:bg-zinc-900 animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800"></div>
        {:else if unorStats}
            <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden">
                <div class="relative z-10">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm mb-2">
                                {#if unorStats.isMigrated}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Terkonsolidasi 100%
                                {:else}
                                    Belum Dimigrasi Penuh
                                {/if}
                            </span>
                            <h3 class="text-xl sm:text-2xl font-black">Status Target: ref_unitorganisasi</h3>
                        </div>
                        <div class="text-right">
                            <span class="text-3xl sm:text-4xl font-black">{unorStats.percentage}%</span>
                            <p class="text-xs text-emerald-200">Kesiapan Data</p>
                        </div>
                    </div>

                    <div class="w-full h-2.5 bg-emerald-900/40 rounded-full overflow-hidden mb-6">
                        <div class="h-full bg-white transition-all duration-1000" style="width: {unorStats.percentage}%"></div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-4 border-t border-white/10">
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-emerald-200">Total Unit</p>
                            <p class="text-lg font-black">{unorStats.target.total?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-emerald-300">dari {unorStats.source.total?.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-emerald-200">Unor Induk</p>
                            <p class="text-lg font-black">{unorStats.target.induk?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-emerald-300">sumber: 545</span>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-emerald-200">Unor</p>
                            <p class="text-lg font-black">{unorStats.target.unor?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-emerald-300">sumber: 1.922</span>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-emerald-200">Sub Unor</p>
                            <p class="text-lg font-black">{unorStats.target.sub?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-emerald-300">sumber: 4.753</span>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-emerald-200">Sub Unor Sub</p>
                            <p class="text-lg font-black">{unorStats.target.subSub?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-emerald-300">sumber: 4.623</span>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <p class="text-[10px] uppercase font-bold text-amber-200">Pos Pimpinan</p>
                            <p class="text-lg font-black text-amber-200">{unorStats.target.pimpinan?.toLocaleString('id-ID') || 0}</p>
                            <span class="text-[10px] text-amber-300">teridentifikasi</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- SECTION 2: JABATAN MIGRATION -->
    <div class="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/></svg>
            </div>
            <div>
                <h2 class="text-lg font-bold text-zinc-900 dark:text-white">2. Status Migrasi Jabatan Pegawai</h2>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Pengalihan dari tabel legacy <code class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ref_nmjabsimpeglama</code> ke tabel referensi jabatan baru</p>
            </div>
        </div>

        {#if loading && !stats}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {#each Array(4) as _}
                    <div class="h-40 bg-white dark:bg-zinc-900 animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800"></div>
                {/each}
            </div>
        {:else if error}
            <div class="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl">
                {error}
            </div>
        {:else if stats}
            <!-- Overall Progress -->
            <div class="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-indigo-100 font-medium">Progress Migrasi Jabatan Aktif</span>
                        <span class="text-3xl font-bold">{migrationPercentage}%</span>
                    </div>
                    <div class="w-full h-3 bg-indigo-500/50 rounded-full overflow-hidden mb-8">
                        <div class="h-full bg-white transition-all duration-1000" style="width: {migrationPercentage}%"></div>
                    </div>
                    <div class="flex flex-wrap gap-12">
                        <div>
                            <p class="text-indigo-200 text-[10px] uppercase tracking-wider font-bold mb-2">Total Pegawai PNS Aktif</p>
                            <p class="text-3xl font-bold text-white">{stats.total.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                            <p class="text-indigo-200 text-[10px] uppercase tracking-wider font-bold mb-2">Telah Menggunakan Referensi Baru</p>
                            <p class="text-3xl font-bold text-white">{migratedCount.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
                <!-- Decorative background -->
                <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white rounded-full opacity-10 blur-3xl"></div>
            </div>

            <!-- Categories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {#each stats.categories as cat}
                    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-4">
                            <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                                {#if cat.source === 'ref_jab'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/></svg>
                                {:else if cat.source === 'ref_jabfungsional'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                {:else if cat.source === 'ref_jabpelaksana'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-600"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2h7V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-3H4v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
                                {/if}
                            </div>
                            <Badge variant={cat.source === 'ref_nmjabsimpeglama' ? 'danger' : 'success'}>
                                {cat.source === 'ref_nmjabsimpeglama' ? 'Legacy' : 'Migrated'}
                            </Badge>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{cat.name}</p>
                            <p class="text-3xl font-black text-zinc-900 dark:text-white">{cat.count.toLocaleString('id-ID')}</p>
                            <div class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                 <p class="text-[10px] text-zinc-400 font-mono truncate">Table: {cat.source}</p>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Detail Table -->
            <div class="grid grid-cols-1 gap-6">
                <Card title="Detail Penggunaan Referensi Jabatan">
                    <div class="overflow-x-auto -p-5">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                                    <th class="px-6 py-4">Kategori Jabatan</th>
                                    <th class="px-6 py-4">Tabel Referensi</th>
                                    <th class="px-6 py-4">Jumlah</th>
                                    <th class="px-6 py-4">Kontribusi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {#each stats.categories as cat}
                                    <tr class="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: var(--tw-color-{cat.color}-500, currentColor)"></div>
                                                <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4">
                                            <code class="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400">
                                                {cat.source}
                                            </code>
                                        </td>
                                        <td class="px-6 py-4">
                                            <span class="text-sm font-bold text-zinc-900 dark:text-white">{cat.count.toLocaleString('id-ID')}</span>
                                        </td>
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div class="h-full transition-all duration-1000" style="width: {(cat.count / stats.total * 100).toFixed(1)}%; background-color: var(--tw-color-{cat.color}-500, currentColor)"></div>
                                                </div>
                                                <span class="text-xs font-black text-zinc-500 w-10">{(cat.count / stats.total * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        {/if}
    </div>
</div>
