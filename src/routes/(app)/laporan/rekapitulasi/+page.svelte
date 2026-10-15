<script>
	import { onMount, untrack } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	// State
	let loading = $state(false);
	let loadingOptions = $state(false);
	let savingSnapshot = $state(false);
	let error = $state(null);
	let successMessage = $state(null);

	let selectedUnorId = $state('');
	let selectedPeriod = $state('');
	let unorOptions = $state([]);
	let availablePeriods = $state([]);

	// Navigation: Grouped Tabs
	let activeGroup = $state('umum'); // 'umum' | 'struktural' | 'jabatan'
	let activeSubTab = $state('gender'); // per-group sub-tab

	// Data containers
	let rekapData = $state({
		total_pegawai: 0,
		filter: { unor_nama: 'Semua Unit Kerja', period: null },
		rekap_gender: { items: [], total: 0 },
		rekap_golongan_gender: { items: [], summary: { total_laki: 0, total_perempuan: 0, total_keseluruhan: 0 } },
		rekap_pendidikan_gender: { items: [], summary: { total_laki: 0, total_perempuan: 0, total_keseluruhan: 0 } },
		rekap_jabatan_struktural: { items: [], summary: { total_formasi: 0, total_terisi: 0, total_kosong: 0, persen_terisi: 0 } },
		rekap_struktural_gender: { items: [], summary: { total_laki: 0, total_perempuan: 0, total_keseluruhan: 0 } },
		rekap_struktural_pendidikan: { columns: [], items: [], summary: { counts: {}, total_keseluruhan: 0 } },
		rekap_jabatan_gender: { items: [], summary: { total_laki: 0, total_perempuan: 0, total_keseluruhan: 0 } },
		rekap_jabatan_fungsional: {
			ahli: [],
			terampil: [],
			summary: {
				subtotal_ahli: { formasi: 0, terisi: 0, kosong: 0 },
				subtotal_terampil: { formasi: 0, terisi: 0, kosong: 0 },
				total_keseluruhan: { formasi: 0, terisi: 0, kosong: 0 }
			}
		},
		generated_at: null
	});

	// Load Referensi Unit Organisasi
	async function loadUnorOptions() {
		loadingOptions = true;
		try {
			const res = await api('/ref-unor/induk?limit=1000&instansi_kode=7209&isAktif=1');
			const list = (res.data || []).map((item) => ({
				value: item.id,
				label: item.nmUnor
			}));
			unorOptions = [{ value: '', label: 'Semua Unit Kerja' }, ...list];
		} catch (err) {
			// Fail safe fallback
			unorOptions = [{ value: '', label: 'Semua Unit Kerja' }];
		} finally {
			loadingOptions = false;
		}
	}

	// Load Data Rekapitulasi Utama
	async function loadRekapitulasi() {
		loading = true;
		error = null;
		successMessage = null;

		try {
			const params = new URLSearchParams();
			if (selectedUnorId) params.append('unor_id', selectedUnorId);
			if (selectedPeriod) params.append('period', selectedPeriod);

			const queryString = params.toString() ? `?${params.toString()}` : '';
			const res = await api(`/rekapitulasi/all${queryString}`);
			if (res.data) {
				rekapData = res.data;
				if (Array.isArray(res.data.available_periods)) {
					availablePeriods = res.data.available_periods;
				}
			}
		} catch (err) {
			error = err.message || 'Gagal memuat data rekapitulasi';
		} finally {
			loading = false;
		}
	}

	// Simpan snapshot data saat ini
	async function handleSaveSnapshot() {
		const currentPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"
		const confirmMsg = `Simpan snapshot rekapitulasi untuk periode ${currentPeriod}?`;
		if (!confirm(confirmMsg)) return;

		savingSnapshot = true;
		try {
			await api('/rekapitulasi/snapshot', {
				method: 'POST',
				body: JSON.stringify({
					period: currentPeriod,
					unor_id: selectedUnorId || null
				})
			});
			successMessage = `Snapshot periode ${currentPeriod} berhasil disimpan!`;
			await loadRekapitulasi();
		} catch (err) {
			alert(err.message || 'Gagal menyimpan snapshot');
		} finally {
			savingSnapshot = false;
		}
	}

	// Handle Export Excel
	function handleExportExcel() {
		const params = new URLSearchParams();
		if (selectedUnorId) params.append('unor_id', selectedUnorId);
		const url = `${import.meta.env.VITE_API_URL}/rekapitulasi/export/excel?${params.toString()}`;
		window.open(url, '_blank');
	}

	// Handle Cetak Dokumen / PDF
	function handlePrint() {
		window.print();
	}

	// Ganti grup tab utama dan set sub-tab defaultnya
	function switchGroup(group) {
		activeGroup = group;
		if (group === 'umum') activeSubTab = 'gender';
		else if (group === 'struktural') activeSubTab = 'formasi_eselon';
		else if (group === 'jabatan') activeSubTab = 'jabatan_gender';
	}

	onMount(() => {
		loadUnorOptions();
		loadRekapitulasi();
	});

	// Trigger reload saat filter berubah
	$effect(() => {
		if (selectedUnorId !== undefined || selectedPeriod !== undefined) {
			untrack(() => {
				loadRekapitulasi();
			});
		}
	});

	// Derived metrics
	let totalLaki = $derived(
		rekapData.rekap_gender.items.find((i) => i.jenis_kelamin === 'Laki-Laki')?.jumlah || 0
	);
	let totalPerempuan = $derived(
		rekapData.rekap_gender.items.find((i) => i.jenis_kelamin === 'Perempuan')?.jumlah || 0
	);
	let persenLaki = $derived(
		rekapData.rekap_gender.items.find((i) => i.jenis_kelamin === 'Laki-Laki')?.persentase || 0
	);
	let persenPerempuan = $derived(
		rekapData.rekap_gender.items.find((i) => i.jenis_kelamin === 'Perempuan')?.persentase || 0
	);
</script>

<svelte:head>
	<title>Rekapitulasi Kepegawaian — SIPASN</title>
</svelte:head>

<!-- Printable Letterhead (Kop Surat Resmi) - Hanya Tampil Saat Print -->
<div class="hidden print:block mb-6 text-center border-b-2 border-black pb-3">
	<h1 class="text-xl font-bold uppercase tracking-wider">Pemerintah Kabupaten Tojo Una-Una</h1>
	<h2 class="text-base font-semibold uppercase">Badan Kepegawaian dan Pengembangan Sumber Daya Manusia</h2>
	<p class="text-xs text-zinc-600 mt-1">Laporan Rekapitulasi Data Kepegawaian ASN Aktif</p>
	<div class="mt-2 text-xs flex justify-between border-t border-zinc-400 pt-1 font-medium">
		<span>Unit Kerja: {rekapData.filter.unor_nama}</span>
		<span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
	</div>
</div>

<div class="space-y-6 print:space-y-4">
	<!-- HEADER & TOOLBAR FILTER (Hidden on print) -->
	<div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 print:hidden">
		<div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
				<span>📊</span> Rekapitulasi Kepegawaian
			</h1>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
				Matriks dan agregasi menyeluruh statistik ASN aktif Kabupaten Tojo Una-Una
			</p>
		</div>

		<!-- Action Buttons & Filters -->
		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Dropdown Filter Unit Kerja -->
			<div class="w-64 sm:w-72">
				<Combobox
					options={unorOptions}
					bind:value={selectedUnorId}
					placeholder="Semua Unit Kerja..."
					searchPlaceholder="Cari nama unit kerja..."
					disabled={loadingOptions}
				/>
			</div>

			<!-- Dropdown Filter Periode Snapshot -->
			<select
				bind:value={selectedPeriod}
				class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			>
				<option value="">Saat Ini (Real-time)</option>
				{#each availablePeriods as p}
					<option value={p}>Snapshot: {p}</option>
				{/each}
			</select>

			<!-- Tombol Refresh -->
			<button
				type="button"
				onclick={loadRekapitulasi}
				disabled={loading}
				title="Segarkan Data"
				class="inline-flex items-center justify-center p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50"
			>
				<svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>

			<!-- Tombol Simpan Snapshot -->
			<Button
				variant="secondary"
				loading={savingSnapshot}
				onclick={handleSaveSnapshot}
				title="Simpan data saat ini sebagai arsip snapshot bulanan"
			>
				<svg class="w-4 h-4 mr-1 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Snapshot
			</Button>

			<!-- Tombol Export Excel -->
			<Button variant="primary" onclick={handleExportExcel}>
				<svg class="w-4 h-4 mr-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Export Excel
			</Button>

			<!-- Tombol Cetak / PDF -->
			<Button variant="secondary" onclick={handlePrint}>
				<svg class="w-4 h-4 mr-1 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Cetak / PDF
			</Button>
		</div>
	</div>

	<!-- NOTIFIKASI SUKSES / SNAPSHOT -->
	{#if successMessage}
		<div class="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
			<span class="flex items-center gap-2">
				<span>✅</span> {successMessage}
			</span>
			<button onclick={() => (successMessage = null)} class="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
		</div>
	{/if}

	<!-- KPI SUMMARY CARDS (Hidden on print) -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden">
		<!-- Total Pegawai -->
		<div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between">
			<span class="text-xs font-medium uppercase tracking-wider text-blue-100">Total ASN Aktif</span>
			<div class="mt-2 flex items-baseline justify-between">
				<span class="text-2xl sm:text-3xl font-extrabold">{rekapData.total_pegawai.toLocaleString('id-ID')}</span>
				<span class="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">100%</span>
			</div>
			<span class="text-[11px] text-blue-100/90 mt-1 truncate">{rekapData.filter.unor_nama}</span>
		</div>

		<!-- Laki-Laki -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Laki-Laki</span>
				<span class="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">♂</span>
			</div>
			<div class="mt-2 flex items-baseline justify-between">
				<span class="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalLaki.toLocaleString('id-ID')}</span>
				<span class="text-xs font-semibold text-blue-600 dark:text-blue-400">{persenLaki}%</span>
			</div>
			<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
				<div class="bg-blue-500 h-full rounded-full" style="width: {persenLaki}%"></div>
			</div>
		</div>

		<!-- Perempuan -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Perempuan</span>
				<span class="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold">♀</span>
			</div>
			<div class="mt-2 flex items-baseline justify-between">
				<span class="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalPerempuan.toLocaleString('id-ID')}</span>
				<span class="text-xs font-semibold text-rose-600 dark:text-rose-400">{persenPerempuan}%</span>
			</div>
			<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
				<div class="bg-rose-500 h-full rounded-full" style="width: {persenPerempuan}%"></div>
			</div>
		</div>

		<!-- Jabatan Struktural -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pejabat Struktural</span>
				<span class="p-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold">🏛️</span>
			</div>
			<div class="mt-2 flex items-baseline justify-between">
				<span class="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
					{rekapData.rekap_jabatan_struktural.summary.total_terisi}
				</span>
				<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
					/ {rekapData.rekap_jabatan_struktural.summary.total_formasi} Formasi
				</span>
			</div>
			<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
				<div class="bg-amber-500 h-full rounded-full" style="width: {rekapData.rekap_jabatan_struktural.summary.persen_terisi}%"></div>
			</div>
		</div>
	</div>

	<!-- GROUPED TABS NAVIGATION (Level 1 & Level 2) - Hidden on print -->
	<div class="space-y-3 print:hidden">
		<!-- Level 1: Grup Tabs Utama -->
		<div class="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 sm:gap-4 overflow-x-auto pb-px">
			<button
				type="button"
				onclick={() => switchGroup('umum')}
				class="inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-px whitespace-nowrap {activeGroup === 'umum' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				<span>📊</span>
				<span>1. Rekap Umum</span>
				<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">3 Tabel</span>
			</button>

			<button
				type="button"
				onclick={() => switchGroup('struktural')}
				class="inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-px whitespace-nowrap {activeGroup === 'struktural' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				<span>🏛️</span>
				<span>2. Jabatan Struktural (Eselon)</span>
				<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">3 Tabel</span>
			</button>

			<button
				type="button"
				onclick={() => switchGroup('jabatan')}
				class="inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-px whitespace-nowrap {activeGroup === 'jabatan' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				<span>💼</span>
				<span>3. Jabatan & Fungsional</span>
				<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">2 Tabel</span>
			</button>
		</div>

		<!-- Level 2: Sub-Tabs Pilihan -->
		<div class="flex flex-wrap gap-2 pt-1">
			{#if activeGroup === 'umum'}
				<button
					type="button"
					onclick={() => (activeSubTab = 'gender')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'gender' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Per Jenis Kelamin (#1)
				</button>
				<button
					type="button"
					onclick={() => (activeSubTab = 'golongan')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'golongan' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Golongan Ruang & Jenis Kelamin (#2)
				</button>
				<button
					type="button"
					onclick={() => (activeSubTab = 'pendidikan')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'pendidikan' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Pendidikan & Jenis Kelamin (#3)
				</button>
			{:else if activeGroup === 'struktural'}
				<button
					type="button"
					onclick={() => (activeSubTab = 'formasi_eselon')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'formasi_eselon' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Formasi Jabatan Struktural (#4)
				</button>
				<button
					type="button"
					onclick={() => (activeSubTab = 'pejabat_gender')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'pejabat_gender' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Pejabat Struktural & Jenis Kelamin (#5)
				</button>
				<button
					type="button"
					onclick={() => (activeSubTab = 'pejabat_pendidikan')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'pejabat_pendidikan' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Pendidikan Pejabat Struktural (#6)
				</button>
			{:else if activeGroup === 'jabatan'}
				<button
					type="button"
					onclick={() => (activeSubTab = 'jabatan_gender')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'jabatan_gender' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Per Jenis Jabatan & Jenis Kelamin (#7)
				</button>
				<button
					type="button"
					onclick={() => (activeSubTab = 'fungsional')}
					class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition {activeSubTab === 'fungsional' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'}"
				>
					Jabatan Fungsional (Ahli & Terampil) (#8)
				</button>
			{/if}
		</div>
	</div>

	<!-- KONTEN TABEL UTAMA -->
	{#if loading}
		<div class="py-12">
			<LoadingState message="Memuat dan menghitung data rekapitulasi kepegawaian..." />
		</div>
	{:else if error}
		<ErrorState message={error} onRetry={loadRekapitulasi} />
	{:else}
		<!-- TAB 1: Per Jenis Kelamin -->
		{#if activeGroup === 'umum' && activeSubTab === 'gender'}
			<Card title="Rekapitulasi Pegawai Per Jenis Kelamin" subtitle="Distribusi seluruh ASN aktif menurut jenis kelamin">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-16 text-center">No</th>
								<th class="py-3 px-4">Jenis Kelamin</th>
								<th class="py-3 px-4 text-right">Jumlah Pegawai</th>
								<th class="py-3 px-4 text-right w-36">Persentase</th>
								<th class="py-3 px-4 w-48 hidden sm:table-cell">Visualisasi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_gender.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-3 px-4 text-center text-zinc-400">{item.no}</td>
									<td class="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
										{#if item.jenis_kelamin === 'Laki-Laki'}
											<span class="text-blue-500 font-bold">♂</span>
										{:else}
											<span class="text-rose-500 font-bold">♀</span>
										{/if}
										{item.jenis_kelamin}
									</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
										{item.jumlah.toLocaleString('id-ID')}
									</td>
									<td class="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400">
										{item.persentase}%
									</td>
									<td class="py-3 px-4 hidden sm:table-cell">
										<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
											<div
												class="h-full rounded-full {item.jenis_kelamin === 'Laki-Laki' ? 'bg-blue-500' : 'bg-rose-500'}"
												style="width: {item.persentase}%"
											></div>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="2">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_gender.total.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right">100.00%</td>
								<td class="py-3.5 px-4 hidden sm:table-cell"></td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 2: Golongan & Jenis Kelamin -->
		{:else if activeGroup === 'umum' && activeSubTab === 'golongan'}
			<Card title="Rekapitulasi Pegawai Per Golongan Ruang dan Jenis Kelamin" subtitle="Matriks sebaran pangkat dan golongan ruang (I/a s.d. IV/e) menurut jenis kelamin">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-12 text-center">No</th>
								<th class="py-3 px-4 w-24">Gol/Ruang</th>
								<th class="py-3 px-4">Nama Pangkat</th>
								<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
								<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
								<th class="py-3 px-4 text-right font-bold">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_golongan_gender.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-2.5 px-4 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
										<span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono">{item.golongan}</span>
									</td>
									<td class="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">{item.pangkat}</td>
									<td class="py-2.5 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.laki_laki.toLocaleString('id-ID')}</td>
									<td class="py-2.5 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.perempuan.toLocaleString('id-ID')}</td>
									<td class="py-2.5 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.total.toLocaleString('id-ID')}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="3">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
									{rekapData.rekap_golongan_gender.summary.total_laki.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
									{rekapData.rekap_golongan_gender.summary.total_perempuan.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_golongan_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 3: Pendidikan & Jenis Kelamin -->
		{:else if activeGroup === 'umum' && activeSubTab === 'pendidikan'}
			<Card title="Rekapitulasi Pegawai Per Pendidikan dan Jenis Kelamin" subtitle="Matriks kualifikasi pendidikan formal terakhir (SD s.d. S-3) menurut jenis kelamin">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-14 text-center">No</th>
								<th class="py-3 px-4">Tingkat Pendidikan</th>
								<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
								<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
								<th class="py-3 px-4 text-right font-bold">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_pendidikan_gender.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-3 px-4 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{item.tingkat_pendidikan}</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.laki_laki.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.perempuan.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.total.toLocaleString('id-ID')}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="2">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
									{rekapData.rekap_pendidikan_gender.summary.total_laki.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
									{rekapData.rekap_pendidikan_gender.summary.total_perempuan.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_pendidikan_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 4: Formasi Jabatan Struktural (Eselon) -->
		{:else if activeGroup === 'struktural' && activeSubTab === 'formasi_eselon'}
			<Card title="Rekapitulasi Jabatan Struktural (Eselon)" subtitle="Perbandingan jumlah formasi, pejabat terisi, dan formasi kosong per jenjang eselon">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-14 text-center">No</th>
								<th class="py-3 px-4">Eselon</th>
								<th class="py-3 px-4 text-right">Jumlah Formasi</th>
								<th class="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">Terisi</th>
								<th class="py-3 px-4 text-right text-amber-600 dark:text-amber-400">Kosong</th>
								<th class="py-3 px-4 text-right font-bold">% Terisi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_jabatan_struktural.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-3 px-4 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
										<Badge variant="indigo">{item.eselon}</Badge>
									</td>
									<td class="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">{item.formasi.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{item.terisi.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">{item.kosong.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.persen_terisi}%</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="2">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-base">{rekapData.rekap_jabatan_struktural.summary.total_formasi.toLocaleString('id-ID')}</td>
								<td class="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 text-base">{rekapData.rekap_jabatan_struktural.summary.total_terisi.toLocaleString('id-ID')}</td>
								<td class="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400 text-base">{rekapData.rekap_jabatan_struktural.summary.total_kosong.toLocaleString('id-ID')}</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">{rekapData.rekap_jabatan_struktural.summary.persen_terisi}%</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 5: Pejabat Struktural & Jenis Kelamin -->
		{:else if activeGroup === 'struktural' && activeSubTab === 'pejabat_gender'}
			<Card title="Rekapitulasi Pejabat Struktural Per Jenis Kelamin" subtitle="Distribusi pejabat struktural aktif per eselon menurut jenis kelamin">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-14 text-center">No</th>
								<th class="py-3 px-4">Eselon</th>
								<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
								<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
								<th class="py-3 px-4 text-right font-bold">Total Pejabat</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_struktural_gender.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-3 px-4 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
										<Badge variant="indigo">{item.eselon}</Badge>
									</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.laki_laki.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.perempuan.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.total.toLocaleString('id-ID')}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="2">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
									{rekapData.rekap_struktural_gender.summary.total_laki.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
									{rekapData.rekap_struktural_gender.summary.total_perempuan.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_struktural_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 6: Pendidikan Pejabat Struktural -->
		{:else if activeGroup === 'struktural' && activeSubTab === 'pejabat_pendidikan'}
			<Card title="Rekapitulasi Pendidikan Pejabat Struktural (Eselon)" subtitle="Kualifikasi tingkat pendidikan pejabat struktural aktif per jenjang eselon">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-3 w-12 text-center">No</th>
								<th class="py-3 px-3 w-28">Eselon</th>
								{#each rekapData.rekap_struktural_pendidikan.columns as col}
									<th class="py-3 px-2 text-center">{col.label}</th>
								{/each}
								<th class="py-3 px-3 text-right font-bold w-20">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_struktural_pendidikan.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-2.5 px-3 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
										<Badge variant="indigo">{item.eselon}</Badge>
									</td>
									{#each rekapData.rekap_struktural_pendidikan.columns as col}
										<td class="py-2.5 px-2 text-center text-zinc-700 dark:text-zinc-300 font-medium">
											{item.counts[col.id] || '-'}
										</td>
									{/each}
									<td class="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.total}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-3 text-center" colspan="2">TOTAL</td>
								{#each rekapData.rekap_struktural_pendidikan.columns as col}
									<td class="py-3.5 px-2 text-center text-zinc-900 dark:text-zinc-100">
										{rekapData.rekap_struktural_pendidikan.summary.counts[col.id] || 0}
									</td>
								{/each}
								<td class="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_struktural_pendidikan.summary.total_keseluruhan.toLocaleString('id-ID')}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 7: Jenis Jabatan & Gender -->
		{:else if activeGroup === 'jabatan' && activeSubTab === 'jabatan_gender'}
			<Card title="Rekapitulasi Pegawai Per Jenis Jabatan dan Jenis Kelamin" subtitle="Distribusi seluruh ASN aktif menurut kelompok jenis jabatan">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-14 text-center">No</th>
								<th class="py-3 px-4">Kelompok Jenis Jabatan</th>
								<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
								<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
								<th class="py-3 px-4 text-right font-bold">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapData.rekap_jabatan_gender.items as item}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
									<td class="py-3 px-4 text-center text-zinc-400 text-xs">{item.no}</td>
									<td class="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{item.jenis_jabatan}</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.laki_laki.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-medium text-zinc-800 dark:text-zinc-200">{item.perempuan.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{item.total.toLocaleString('id-ID')}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 font-bold text-zinc-900 dark:text-zinc-100">
								<td class="py-3.5 px-4 text-center" colspan="2">TOTAL</td>
								<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
									{rekapData.rekap_jabatan_gender.summary.total_laki.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
									{rekapData.rekap_jabatan_gender.summary.total_perempuan.toLocaleString('id-ID')}
								</td>
								<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-base">
									{rekapData.rekap_jabatan_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>

		<!-- TAB 8: Rekap Jabatan Fungsional -->
		{:else if activeGroup === 'jabatan' && activeSubTab === 'fungsional'}
			<Card title="Rekapitulasi Jabatan Fungsional" subtitle="Distribusi pegawai fungsional per kelompok jabatan dan jenjang (Keahlian & Keterampilan) berdasarkan jenis kelamin">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th rowspan="2" class="py-3 px-4 w-12 text-center align-middle border-r border-zinc-200 dark:border-zinc-800">No</th>
								<th rowspan="2" class="py-3 px-4 align-middle border-r border-zinc-200 dark:border-zinc-800 min-w-48">Kelompok Jabatan</th>
								<th colspan="3" class="py-2.5 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">Jenjang Ahli (Keahlian)</th>
								<th colspan="3" class="py-2.5 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">Jenjang Terampil (Keterampilan)</th>
								<th colspan="3" class="py-2.5 px-3 text-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200">Total Pegawai</th>
							</tr>
							<tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">L</th>
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">P</th>
								<th class="py-2 px-3 text-right w-20 border-r border-zinc-200 dark:border-zinc-800 font-bold text-indigo-700 dark:text-indigo-400">Jml</th>
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">L</th>
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">P</th>
								<th class="py-2 px-3 text-right w-20 border-r border-zinc-200 dark:border-zinc-800 font-bold text-amber-700 dark:text-amber-400">Jml</th>
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">L</th>
								<th class="py-2 px-3 text-right w-16 border-r border-zinc-200 dark:border-zinc-800">P</th>
								<th class="py-2 px-3 text-right w-24 font-bold text-blue-700 dark:text-blue-400">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#if rekapData.rekap_jabatan_fungsional.items.length === 0}
								<tr>
									<td colspan="11" class="py-8 text-center text-zinc-400">Tidak ada data jabatan fungsional</td>
								</tr>
							{:else}
								{#each rekapData.rekap_jabatan_fungsional.items as item}
									<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
										<td class="py-2.5 px-4 text-center text-zinc-400 text-xs border-r border-zinc-100 dark:border-zinc-800/40">{item.no}</td>
										<td class="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800/40">{item.kelompok_jabatan}</td>
										
										<!-- Jenjang Ahli -->
										<td class="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-300">{item.ahli.laki.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-300">{item.ahli.perempuan.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10 border-r border-zinc-100 dark:border-zinc-800/40">{item.ahli.total.toLocaleString('id-ID')}</td>

										<!-- Jenjang Terampil -->
										<td class="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-300">{item.terampil.laki.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-300">{item.terampil.perempuan.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10 border-r border-zinc-100 dark:border-zinc-800/40">{item.terampil.total.toLocaleString('id-ID')}</td>

										<!-- Total -->
										<td class="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-200 font-medium">{item.total.laki.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-200 font-medium">{item.total.perempuan.toLocaleString('id-ID')}</td>
										<td class="py-2.5 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">{item.total.semua.toLocaleString('id-ID')}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white font-extrabold text-xs sm:text-sm">
								<td class="py-4 px-4 text-center" colspan="2">TOTAL KESELURUHAN</td>
								<!-- Ahli -->
								<td class="py-4 px-3 text-right text-indigo-200">{rekapData.rekap_jabatan_fungsional.summary.ahli_l.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-indigo-200">{rekapData.rekap_jabatan_fungsional.summary.ahli_p.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-indigo-300 font-black">{rekapData.rekap_jabatan_fungsional.summary.ahli_total.toLocaleString('id-ID')}</td>
								
								<!-- Terampil -->
								<td class="py-4 px-3 text-right text-amber-200">{rekapData.rekap_jabatan_fungsional.summary.terampil_l.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-amber-200">{rekapData.rekap_jabatan_fungsional.summary.terampil_p.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-amber-300 font-black">{rekapData.rekap_jabatan_fungsional.summary.terampil_total.toLocaleString('id-ID')}</td>

								<!-- Total Semua -->
								<td class="py-4 px-3 text-right text-blue-200">{rekapData.rekap_jabatan_fungsional.summary.total_l.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-blue-200">{rekapData.rekap_jabatan_fungsional.summary.total_p.toLocaleString('id-ID')}</td>
								<td class="py-4 px-3 text-right text-blue-300 font-black">{rekapData.rekap_jabatan_fungsional.summary.total_semua.toLocaleString('id-ID')}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</Card>
		{/if}
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
			font-size: 10pt;
		}
		:global(nav),
		:global(aside),
		:global(header) {
			display: none !important;
		}
		@page {
			size: A4 landscape;
			margin: 1.5cm;
		}
	}
</style>
