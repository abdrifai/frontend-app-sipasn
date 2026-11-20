<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import { toast } from '$lib/stores/toastStore.js';

	// State Data Utama
	let pegawaiList = $state([]);
	let stats = $state({
		total: 0,
		laki_laki: 0,
		perempuan: 0,
		avg_masa_kerja_tahun: 0,
		per_golongan: {},
		per_tahun: {}
	});
	let meta = $state({
		page: 1,
		limit: 15,
		total: 0,
		totalPages: 1
	});

	// Filter States
	let selectedYear = $state('');
	let selectedUnorId = $state('');
	let selectedGender = $state('');
	let searchQuery = $state('');
	let page = $state(1);
	let limit = $state(15);

	// Option States
	let availableYears = $state([]);
	let unorOptions = $state([]);
	let loadingYears = $state(false);
	let loadingUnor = $state(false);
	let loadingData = $state(false);
	let error = $state(null);
	let exportingExcel = $state(false);

	let selectedUnorLabel = $derived.by(() => {
		if (!selectedUnorId) return 'Semua Unit Organisasi / Satuan Kerja';
		const found = unorOptions.find((o) => String(o.value) === String(selectedUnorId));
		return found ? found.label : 'Unit Organisasi Terpilih';
	});

	let selectedYearLabel = $derived.by(() => {
		return selectedYear ? `Tahun ${selectedYear}` : 'Semua Tahun Pengangkatan';
	});

	async function loadYears() {
		loadingYears = true;
		try {
			const res = await api('/laporan-pengangkatan/years');
			availableYears = res.data || [];
		} catch (err) {
			toast.error(err.message || 'Gagal memuat daftar tahun pengangkatan');
		} finally {
			loadingYears = false;
		}
	}

	async function loadUnorOptions() {
		if (unorOptions.length > 0) return;
		loadingUnor = true;
		try {
			const res = await api('/ref-unor/induk?limit=1000&instansi_kode=7209&isAktif=1');
			unorOptions = (res.data || []).map((item) => ({
				value: String(item.id),
				label: item.nmUnor
			}));
		} catch (err) {
			toast.error(err.message || 'Gagal memuat daftar unit organisasi');
		} finally {
			loadingUnor = false;
		}
	}

	async function loadData(targetPage = 1) {
		page = targetPage;
		loadingData = true;
		error = null;

		try {
			const params = new URLSearchParams({
				page: String(targetPage),
				limit: String(limit),
				search: searchQuery.trim()
			});

			if (selectedYear) {
				params.append('tahun', selectedYear);
			}
			if (selectedUnorId) {
				params.append('unorInduk_id', selectedUnorId);
			}
			if (selectedGender) {
				params.append('jenis_kelamin', selectedGender);
			}

			const res = await api(`/laporan-pengangkatan?${params.toString()}`);
			pegawaiList = res.data || [];
			meta = res.meta || { page: 1, limit, total: 0, totalPages: 1 };
			stats = res.stats || {
				total: 0,
				laki_laki: 0,
				perempuan: 0,
				avg_masa_kerja_tahun: 0,
				per_golongan: {},
				per_tahun: {}
			};
		} catch (err) {
			error = err.message || 'Gagal memuat data laporan pengangkatan';
		} finally {
			loadingData = false;
		}
	}

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			loadData(1);
		}, 300);
	}

	function resetFilters() {
		selectedYear = '';
		selectedUnorId = '';
		selectedGender = '';
		searchQuery = '';
		page = 1;
		loadData(1);
	}

	function selectYearPill(yr) {
		selectedYear = selectedYear === String(yr) ? '' : String(yr);
		loadData(1);
	}

	async function handleExportExcel() {
		exportingExcel = true;
		try {
			const params = new URLSearchParams({
				search: searchQuery.trim()
			});
			if (selectedYear) params.append('tahun', selectedYear);
			if (selectedUnorId) params.append('unorInduk_id', selectedUnorId);
			if (selectedGender) params.append('jenis_kelamin', selectedGender);

			const res = await fetch(`${import.meta.env.VITE_API_URL}/laporan-pengangkatan/export?${params.toString()}`, {
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Gagal mengunduh file Excel');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const safeYear = selectedYear ? `_${selectedYear}` : '_Semua_Tahun';
			a.download = `Laporan_TMT_CPNS${safeYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('Laporan Excel berhasil diunduh');
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat mengunduh Excel');
		} finally {
			exportingExcel = false;
		}
	}

	function handlePrint() {
		window.print();
	}

	onMount(() => {
		loadYears();
		loadUnorOptions();
		loadData(1);
	});
</script>

<svelte:head>
	<title>Laporan Pegawai Berdasarkan Tahun Pengangkatan (TMT CPNS) — SIPASN</title>
</svelte:head>

<!-- ========================================================================= -->
<!-- LEMBAR CETAK RESMI (HANYA MUNCUL SAAT PRINT / CETAK KE PDF DI BROWSER)   -->
<!-- ========================================================================= -->
<div class="hidden print:block print:w-full print:m-0 print:p-0 font-serif text-black">
	<!-- Kop Surat Resmi -->
	<div class="text-center mb-4 pb-2 border-b-2 border-black">
		<h1 class="text-base font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN TOJO UNA-UNA</h1>
		<h2 class="text-sm font-bold uppercase">BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA</h2>
		<h3 class="text-xs font-bold uppercase mt-1">DAFTAR PEGAWAI NEGERI SIPIL BERDASARKAN TAHUN PENGANGKATAN (TMT CPNS)</h3>
		<p class="text-xs uppercase font-semibold text-zinc-800 mt-0.5">
			KRITERIA: {selectedYearLabel.toUpperCase()} | {selectedUnorLabel.toUpperCase()}
		</p>
		<div class="mt-2 text-[10px] flex justify-between border-t border-black/40 pt-1 font-sans">
			<span>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
			<span>Total: {meta.total} Pegawai (L: {stats.laki_laki}, P: {stats.perempuan})</span>
		</div>
	</div>

	<!-- Tabel Cetak Resmi -->
	<table class="w-full border-collapse border border-black text-[9pt] leading-tight">
		<thead>
			<tr class="bg-zinc-200">
				<th class="border border-black p-1.5 text-center w-8">NO</th>
				<th class="border border-black p-1.5 text-left w-48">NAMA / NIP</th>
				<th class="border border-black p-1.5 text-center w-8">L/P</th>
				<th class="border border-black p-1.5 text-center w-24">TMT CPNS</th>
				<th class="border border-black p-1.5 text-center w-24">MASA KERJA</th>
				<th class="border border-black p-1.5 text-left w-32">GOL / PANGKAT</th>
				<th class="border border-black p-1.5 text-left">JABATAN</th>
				<th class="border border-black p-1.5 text-left w-48">UNIT ORGANISASI</th>
			</tr>
		</thead>
		<tbody>
			{#each pegawaiList as p, idx (p.id)}
				<tr class="break-inside-avoid">
					<td class="border border-black p-1 text-center font-mono">{(page - 1) * limit + idx + 1}</td>
					<td class="border border-black p-1">
						<div class="font-bold">{p.nama}</div>
						<div class="font-mono text-[8pt] text-zinc-700">{p.nip}</div>
					</td>
					<td class="border border-black p-1 text-center">{p.jenis_kelamin}</td>
					<td class="border border-black p-1 text-center font-mono">
						{p.tmt_cpns}
					</td>
					<td class="border border-black p-1 text-center">
						{p.masa_kerja}
					</td>
					<td class="border border-black p-1">
						{p.pangkat_gol}
					</td>
					<td class="border border-black p-1">
						<div>{p.jabatan}</div>
						{#if p.eselon && p.eselon !== '-'}
							<div class="text-[8pt] italic">Eselon {p.eselon}</div>
						{/if}
					</td>
					<td class="border border-black p-1">
						{p.unit_kerja}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Lembar Tanda Tangan Pengesahan Cetak -->
	<div class="mt-8 flex justify-end break-inside-avoid font-sans">
		<div class="text-center w-72">
			<p class="text-[9pt]">Ampana, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
			<p class="text-[9pt] font-semibold mt-0.5">Kepala Badan Kepegawaian dan Pengembangan SDM</p>
			<div class="h-20"></div>
			<p class="text-[9pt] font-bold underline">RUSLI, S.Sos, M.Si</p>
			<p class="text-[8pt] font-mono text-zinc-800">NIP. 197710281998031004</p>
		</div>
	</div>
</div>

<!-- ========================================================================= -->
<!-- TAMPILAN INTERAKTIF UTAMA (DISEMBUNYIKAN SAAT PRINT)                      -->
<!-- ========================================================================= -->
<div class="space-y-6 print:hidden animate-in fade-in slide-in-from-bottom-3 duration-500 pb-16">
	<!-- Header Banner & Penjelasan -->
	<div class="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
		<div class="absolute -right-10 -bottom-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
			<div class="space-y-2 max-w-2xl">
				<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
					Pelaporan & Analisis Angkatan
				</div>
				<h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
					Laporan Pegawai Berdasarkan Tahun Pengangkatan (TMT CPNS)
				</h1>
				<p class="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
					Menyajikan daftar lengkap Pegawai Negeri Sipil aktif berdasarkan <strong>Tahun Pengangkatan Pertama (TMT CPNS)</strong>, durasi masa kerja pengabdian, jenjang kepangkatan, dan unit organisasi penempatan.
				</p>
			</div>

			<!-- Tombol Aksi Toolbar -->
			<div class="flex flex-wrap items-center gap-3 shrink-0">
				<button
					type="button"
					onclick={handleExportExcel}
					disabled={exportingExcel || loadingData}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
				>
					{#if exportingExcel}
						<span class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
						<span>Mengunduh...</span>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9H8"/></svg>
						<span>Export Excel</span>
					{/if}
				</button>

				<button
					type="button"
					onclick={handlePrint}
					disabled={loadingData || meta.total === 0}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
					<span>Cetak / Simpan PDF</span>
				</button>
			</div>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Total Pegawai -->
		<div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-4">
			<div class="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div>
				<p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Pegawai</p>
				<p class="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-0.5">{(stats.total || 0).toLocaleString('id-ID')}</p>
				<p class="text-[11px] text-zinc-400 mt-0.5 truncate">{selectedYearLabel}</p>
			</div>
		</div>

		<!-- Card 2: Laki-laki vs Perempuan -->
		<div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-4">
			<div class="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="m21 3-6.75 6.75"/><circle cx="10" cy="14" r="6"/><circle cx="10" cy="14" r="6"/><path d="M10 20v4"/><path d="M7 22h6"/></svg>
			</div>
			<div>
				<p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Gender</p>
				<div class="flex items-baseline gap-2 mt-0.5">
					<span class="text-lg font-black text-sky-600 dark:text-sky-400">{stats.laki_laki} L</span>
					<span class="text-zinc-300 dark:text-zinc-700 font-bold">/</span>
					<span class="text-lg font-black text-rose-500 dark:text-rose-400">{stats.perempuan} P</span>
				</div>
				<p class="text-[11px] text-zinc-400 mt-0.5">
					{stats.total > 0 ? Math.round((stats.laki_laki / stats.total) * 100) : 0}% Pria : {stats.total > 0 ? Math.round((stats.perempuan / stats.total) * 100) : 0}% Wanita
				</p>
			</div>
		</div>

		<!-- Card 3: Rata-Rata Masa Kerja -->
		<div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-4">
			<div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
			</div>
			<div>
				<p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Rata-Rata Pengabdian</p>
				<p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
					{stats.avg_masa_kerja_tahun} <span class="text-xs font-semibold text-zinc-400">Tahun</span>
				</p>
				<p class="text-[11px] text-zinc-400 mt-0.5">Dihitung dari TMT CPNS</p>
			</div>
		</div>

		<!-- Card 4: Kriteria Unit Kerja -->
		<div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-4">
			<div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
			</div>
			<div class="min-w-0">
				<p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Cakupan Unit</p>
				<p class="text-sm font-black text-zinc-900 dark:text-zinc-50 mt-1 truncate" title={selectedUnorLabel}>
					{selectedUnorId ? selectedUnorLabel : 'Seluruh Instansi'}
				</p>
				<p class="text-[11px] text-zinc-400 mt-0.5 truncate">Kabupaten Tojo Una-Una</p>
			</div>
		</div>
	</div>

	<!-- Pills Selector Cepat Angkatan (Top Years) -->
	{#if availableYears.length > 0}
		<div class="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pilih Cepat Angkatan (Tahun Pengangkatan):</p>
				<span class="text-[11px] text-zinc-400">{availableYears.length} Tahun Terdata</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onclick={() => selectYearPill('')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {selectedYear === '' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'}"
				>
					Semua Tahun
				</button>
				{#each availableYears.slice(0, 15) as item (item.year)}
					<button
						type="button"
						onclick={() => selectYearPill(item.year)}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {selectedYear === String(item.year) ? 'bg-indigo-600 text-white shadow-sm scale-105' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}"
					>
						<span>{item.year}</span>
						<span class="px-1.5 py-0.2 rounded-full text-[10px] {selectedYear === String(item.year) ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}">
							{item.count}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Filter & Pencarian Toolbar -->
	<div class="p-6 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
			<!-- Filter Tahun Dropdown -->
			<div class="md:col-span-3">
				<label for="filter-year-select" class="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
					Tahun Pengangkatan (TMT CPNS)
				</label>
				<select
					id="filter-year-select"
					bind:value={selectedYear}
					onchange={() => loadData(1)}
					class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
				>
					<option value="">Semua Tahun Pengangkatan</option>
					{#each availableYears as item (item.year)}
						<option value={String(item.year)}>
							Tahun {item.year} ({item.count} Pegawai)
						</option>
					{/each}
				</select>
			</div>

			<!-- Filter Unit Organisasi Combobox -->
			<div class="md:col-span-4">
				<label for="filter-unor-combobox" class="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
					Unit Organisasi / Satuan Kerja (OPD)
				</label>
				<Combobox
					id="filter-unor-combobox"
					options={unorOptions}
					bind:value={selectedUnorId}
					placeholder={loadingUnor ? 'Memuat unit organisasi...' : 'Pilih Unit Organisasi / OPD...'}
					onchange={(val) => { selectedUnorId = val || ''; loadData(1); }}
				/>
			</div>

			<!-- Filter Jenis Kelamin -->
			<div class="md:col-span-2">
				<label for="filter-gender-select" class="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
					Jenis Kelamin
				</label>
				<select
					id="filter-gender-select"
					bind:value={selectedGender}
					onchange={() => loadData(1)}
					class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
				>
					<option value="">Semua Gender</option>
					<option value="L">Laki-Laki (Pria)</option>
					<option value="P">Perempuan (Wanita)</option>
				</select>
			</div>

			<!-- Cari NIP / Nama -->
			<div class="md:col-span-3">
				<label for="filter-search-input" class="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
					Cari NIP atau Nama Pegawai
				</label>
				<div class="relative group">
					<div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						id="filter-search-input"
						type="text"
						placeholder="Ketik NIP atau Nama..."
						bind:value={searchQuery}
						oninput={handleSearchInput}
						class="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
					/>
				</div>
			</div>
		</div>

		<!-- Status Bar & Tombol Reset -->
		<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
			<div class="text-zinc-500 dark:text-zinc-400">
				Menampilkan <strong>{pegawaiList.length}</strong> dari <strong>{meta.total}</strong> pegawai
				{#if selectedYear}
					angkatan <strong>{selectedYear}</strong>
				{/if}
				{#if selectedUnorId}
					pada <strong>{selectedUnorLabel}</strong>
				{/if}
			</div>

			{#if selectedYear || selectedUnorId || selectedGender || searchQuery}
				<button
					type="button"
					onclick={resetFilters}
					class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
					<span>Reset Semua Filter</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Tabel Data Pegawai Berdasarkan Tahun Pengangkatan -->
	<div class="rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
		{#if loadingData}
			<div class="p-16 flex justify-center">
				<LoadingState message="Menghimpun daftar pegawai berdasarkan tahun pengangkatan..." />
			</div>
		{:else if error}
			<div class="p-8">
				<ErrorState message={error} onRetry={() => loadData(page)} />
			</div>
		{:else if pegawaiList.length === 0}
			<div class="p-16">
				<EmptyState message="Tidak ditemukan pegawai yang sesuai dengan kriteria tahun dan unit kerja yang dipilih." />
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs sm:text-sm border-collapse">
					<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
						<tr>
							<th class="py-3 px-3 w-12 text-center">No</th>
							<th class="py-3 px-4 min-w-[220px]">Nama Pegawai & NIP</th>
							<th class="py-3 px-2 text-center w-12">L/P</th>
							<th class="py-3 px-4 min-w-[150px]">TMT CPNS & SK</th>
							<th class="py-3 px-4 min-w-[130px]">Masa Kerja</th>
							<th class="py-3 px-4 min-w-[150px]">Golongan & Pangkat</th>
							<th class="py-3 px-4 min-w-[170px]">Jabatan & Eselon</th>
							<th class="py-3 px-4 min-w-[180px]">Unit Organisasi (OPD)</th>
							<th class="py-3 px-4 min-w-[150px]">Pendidikan Terakhir</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
						{#each pegawaiList as p, idx (p.id)}
							<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
								<!-- Nomor Urut -->
								<td class="py-3.5 px-3 text-center font-mono text-zinc-400 font-bold">
									{p.nomorUrut || (page - 1) * limit + idx + 1}
								</td>

								<!-- Nama & NIP -->
								<td class="py-3.5 px-4">
									<div class="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm leading-snug">
										{p.nama}
									</div>
									<div class="text-[11px] font-mono text-zinc-500 mt-0.5">
										{p.nip}
									</div>
								</td>

								<!-- Jenis Kelamin -->
								<td class="py-3.5 px-2 text-center">
									{#if p.jenis_kelamin === 'L'}
										<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
											L
										</span>
									{:else}
										<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
											P
										</span>
									{/if}
								</td>

								<!-- TMT CPNS & SK -->
								<td class="py-3.5 px-4">
									<div class="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
										{p.tmt_cpns || '-'}
									</div>
									{#if p.nomor_sk_cpns && p.nomor_sk_cpns !== '-'}
										<div class="text-[10px] text-zinc-400 truncate max-w-[140px] mt-0.5" title={p.nomor_sk_cpns}>
											SK: {p.nomor_sk_cpns}
										</div>
									{/if}
								</td>

								<!-- Masa Kerja -->
								<td class="py-3.5 px-4">
									<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
										<span>{p.masa_kerja}</span>
									</div>
								</td>

								<!-- Golongan & Pangkat -->
								<td class="py-3.5 px-4">
									<div class="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
										{p.pangkat_gol || '-'}
									</div>
								</td>

								<!-- Jabatan & Eselon -->
								<td class="py-3.5 px-4">
									<div class="text-zinc-800 dark:text-zinc-200 text-xs leading-snug">
										{p.jabatan || '-'}
									</div>
									{#if p.eselon && p.eselon !== '-'}
										<div class="mt-1">
											<span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
												Eselon {p.eselon}
											</span>
										</div>
									{/if}
								</td>

								<!-- Unit Organisasi -->
								<td class="py-3.5 px-4">
									<div class="text-zinc-600 dark:text-zinc-400 text-xs leading-snug">
										{p.unit_kerja || '-'}
									</div>
								</td>

								<!-- Pendidikan Terakhir -->
								<td class="py-3.5 px-4">
									<div class="text-zinc-700 dark:text-zinc-300 text-xs leading-snug">
										{p.pendidikan || '-'}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Paginasi Tabel -->
			<div class="p-4 sm:px-6 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
				<div class="flex items-center gap-2 text-xs text-zinc-500">
					<span>Tampilkan:</span>
					<select
						bind:value={limit}
						onchange={() => loadData(1)}
						class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
					>
						<option value={10}>10</option>
						<option value={15}>15</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
					<span>data per halaman</span>
				</div>

				<div class="flex items-center gap-3">
					<span class="text-xs text-zinc-500">
						Halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong>
					</span>

					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={() => loadData(page - 1)}
							disabled={page <= 1 || loadingData}
							class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
						>
							Sebelumnya
						</button>
						<button
							type="button"
							onclick={() => loadData(page + 1)}
							disabled={page >= meta.totalPages || loadingData}
							class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
						>
							Berikutnya
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
			margin: 0 !important;
			padding: 0 !important;
		}
		:global(nav),
		:global(aside),
		:global(header) {
			display: none !important;
		}
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
		}
	}
</style>

