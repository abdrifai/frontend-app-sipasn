<script>
	import { onMount, onDestroy, untrack } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import Accordion from '$lib/components/ui/Accordion.svelte';
	import { toast } from '$lib/stores/toastStore.js';
	import { downloadDukPdf, generateDukPdfBlob } from '$lib/utils/dukPdfGenerator.js';
	import { fileToUint8Array, loadPdfJsDocument, renderPageThumbnail } from '$lib/utils/pdfHelper.js';

	// State Data Utama
	let data = $state([]);
	let stats = $state({ total: 0, page: 1, limit: 10, totalPages: 0, per_jabatan: {} });
	let unorOptions = $state([]);
	let selectedUnorId = $state('');
	let kategoriUnit = $state('opd'); // 'opd' | 'sekolah' | 'puskesmas'
	let page = $state(1);
	let loading = $state(false);
	let loadingOptions = $state(false);
	let error = $state(null);
	let exportingExcel = $state(false);

	// State Pratinjau & Cetak PDF
	let showPdfModal = $state(false);
	let pdfLoading = $state(false);
	let downloadingPdf = $state(false);
	let generatingPreview = $state(false);
	let previewPdfUrl = $state('');
	let allDukData = $state([]);

	// State Rendering Canvas PDF (Bebas dari Background Gelap Browser)
	let pdfJsDoc = $state(null);
	let totalPreviewPages = $state(1);
	let previewScale = $state(1.0);
	let isRenderingCanvas = $state(false);
	let canvasRefs = {};

	// Parameter Cetak / Laporan
	let reportOptions = $state({
		tanggalCetak: new Date().toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}),
		tempat: 'Ampana',
		penandatanganJabatan: 'Kepala Badan Kepegawaian dan Pengembangan SDM',
		penandatanganNama: '',
		penandatanganNip: ''
	});

	// Nama Unor Terpilih
	let selectedUnorName = $derived.by(() => {
		const found = unorOptions.find((o) => o.value === selectedUnorId || o.id === selectedUnorId);
		return found ? (found.label || found.nmUnor || '') : '';
	});

	let kategoriLabel = $derived(
		kategoriUnit === 'sekolah'
			? 'Sekolah (SD / SMP / TK)'
			: kategoriUnit === 'puskesmas'
				? 'Puskesmas / Fasilitas Kesehatan'
				: 'OPD / Dinas / Badan'
	);

	let comboboxPlaceholder = $derived(
		loadingOptions
			? 'Memuat daftar unit kerja...'
			: kategoriUnit === 'sekolah'
				? 'Cari nama sekolah (misal: SD Negeri 1 Ampana, SMP Negeri 2...)'
				: kategoriUnit === 'puskesmas'
					? 'Cari nama puskesmas (misal: UPT Puskesmas Ampana Barat...)'
					: 'Pilih atau cari nama OPD / Dinas / Badan...'
	);

	async function loadUnorOptions(kat = kategoriUnit) {
		loadingOptions = true;
		try {
			// Mengambil daftar unit DUK berdasarkan kategori: 'opd' | 'sekolah' | 'puskesmas'
			const res = await api(`/pegawai/referensi/unit-duk?kategori=${kat}`);
			unorOptions = (res.data || []).map((item) => ({
				value: item.value || item.id,
				label: item.label || item.nmUnor
			}));
		} catch (err) {
			toast.error(err.message || 'Gagal memuat daftar unit kerja');
		} finally {
			loadingOptions = false;
		}
	}

	function handleSwitchKategori(newKat) {
		if (kategoriUnit === newKat) return;
		kategoriUnit = newKat;
		selectedUnorId = '';
		data = [];
		stats = { total: 0, page: 1, limit: 10, totalPages: 0, per_jabatan: {} };
		loadUnorOptions(newKat);
	}

	async function loadDUK(newPage = 1) {
		if (!selectedUnorId) return;

		const targetPage = typeof newPage === 'number' ? newPage : 1;
		page = targetPage;

		loading = true;
		error = null;
		try {
			const res = await api(`/pegawai/duk?unorInduk_id=${selectedUnorId}&page=${targetPage}&limit=10`);
			data = res.data.data;
			stats = res.data.stats;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function handlePageChange(p) {
		if (loading || p < 1 || p > stats.totalPages) return;
		loadDUK(p);
	}

	async function handleExportExcel() {
		if (!selectedUnorId) {
			toast.error('Pilih unit kerja terlebih dahulu');
			return;
		}
		exportingExcel = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/pegawai/duk/export?unorInduk_id=${selectedUnorId}`, {
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Gagal mengunduh file Excel');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const cleanName = (selectedUnorName || 'DUK').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
			a.download = `DUK_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			toast.success('File Excel DUK berhasil diunduh');
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat mengunduh Excel');
		} finally {
			exportingExcel = false;
		}
	}

	function canvasPageAction(node, pageNum) {
		canvasRefs[pageNum] = node;
		if (pdfJsDoc) {
			const targetWidth = Math.round(1050 * previewScale);
			renderPageThumbnail(pdfJsDoc, pageNum, node, targetWidth, 0);
		}
		return {
			update(newNum) {
				canvasRefs[newNum] = node;
				if (pdfJsDoc) {
					const targetWidth = Math.round(1050 * previewScale);
					renderPageThumbnail(pdfJsDoc, newNum, node, targetWidth, 0);
				}
			},
			destroy() {
				delete canvasRefs[pageNum];
			}
		};
	}

	async function renderAllPages() {
		if (!pdfJsDoc) return;
		isRenderingCanvas = true;
		try {
			const targetWidth = Math.round(1050 * previewScale);
			for (let pageNum = 1; pageNum <= totalPreviewPages; pageNum++) {
				const canvas = canvasRefs[pageNum];
				if (canvas) {
					await renderPageThumbnail(pdfJsDoc, pageNum, canvas, targetWidth, 0);
				}
			}
		} catch {
			// abaikan pembatalan render
		} finally {
			isRenderingCanvas = false;
		}
	}

	async function refreshPdfPreview() {
		if (allDukData.length === 0) return;
		generatingPreview = true;
		try {
			const { blob } = await generateDukPdfBlob(selectedUnorName, allDukData, reportOptions);
			if (previewPdfUrl) {
				window.URL.revokeObjectURL(previewPdfUrl);
			}
			previewPdfUrl = window.URL.createObjectURL(blob);

			// Siapkan dokumen PDF.js untuk rendering seluruh lembar bersambung
			const bytes = await fileToUint8Array(blob);
			const doc = await loadPdfJsDocument(bytes);
			pdfJsDoc = doc;
			totalPreviewPages = doc.numPages || 1;
			setTimeout(() => {
				renderAllPages();
			}, 50);
		} catch (err) {
			toast.error(err.message || 'Gagal menyusun pratinjau dokumen PDF');
		} finally {
			generatingPreview = false;
		}
	}

	function handleZoomIn() {
		previewScale = Math.min(2.0, +(previewScale + 0.15).toFixed(2));
		renderAllPages();
	}

	function handleZoomOut() {
		previewScale = Math.max(0.65, +(previewScale - 0.15).toFixed(2));
		renderAllPages();
	}

	function handleZoomReset() {
		previewScale = 1.0;
		renderAllPages();
	}

	async function openPdfModal() {
		if (!selectedUnorId) {
			toast.error('Silakan pilih unit kerja terlebih dahulu');
			return;
		}

		pdfLoading = true;
		try {
			// Ambil seluruh data DUK unit tanpa batasan pagination (hingga 10.000 pegawai)
			const res = await api(`/pegawai/duk?unorInduk_id=${selectedUnorId}&page=1&limit=10000`);
			allDukData = res.data.data || [];
			if (allDukData.length === 0) {
				toast.error('Tidak ada data pegawai pada unit kerja yang dipilih');
				return;
			}
			showPdfModal = true;
			await refreshPdfPreview();
		} catch (err) {
			toast.error(err.message || 'Gagal memuat seluruh data pegawai untuk laporan PDF');
		} finally {
			pdfLoading = false;
		}
	}

	function closePdfModal() {
		showPdfModal = false;
		if (previewPdfUrl) {
			window.URL.revokeObjectURL(previewPdfUrl);
			previewPdfUrl = '';
		}
		pdfJsDoc = null;
		canvasRefs = {};
	}

	async function handleDownloadPdfDirect() {
		if (allDukData.length === 0) return;
		downloadingPdf = true;
		try {
			await downloadDukPdf(selectedUnorName, allDukData, reportOptions);
			toast.success('Berkas Laporan PDF DUK berhasil diunduh');
		} catch (err) {
			toast.error(err.message || 'Gagal menyusun berkas PDF');
		} finally {
			downloadingPdf = false;
		}
	}

	function handlePrintWindow() {
		if (previewPdfUrl) {
			// Gunakan iframe tersembunyi khusus untuk memicu dialog print PDF langsung
			let printIframe = document.getElementById('duk-hidden-print-iframe');
			if (!printIframe) {
				printIframe = document.createElement('iframe');
				printIframe.id = 'duk-hidden-print-iframe';
				printIframe.style.position = 'fixed';
				printIframe.style.right = '0';
				printIframe.style.bottom = '0';
				printIframe.style.width = '0';
				printIframe.style.height = '0';
				printIframe.style.border = '0';
				document.body.appendChild(printIframe);
			}
			printIframe.src = previewPdfUrl;
			printIframe.onload = () => {
				try {
					printIframe.contentWindow.focus();
					printIframe.contentWindow.print();
				} catch {
					window.open(previewPdfUrl, '_blank');
				}
			};
			return;
		}
		window.print();
	}

	function handleKeyDown(e) {
		if (!showPdfModal) return;
		if (e.key === 'Escape') closePdfModal();
		if (e.key === 'ArrowLeft') handlePagePrev();
		if (e.key === 'ArrowRight') handlePageNext();
	}

	onMount(() => {
		loadUnorOptions();
	});

	onDestroy(() => {
		if (previewPdfUrl) {
			window.URL.revokeObjectURL(previewPdfUrl);
		}
	});

	// Auto-load on selection
	$effect(() => {
		if (selectedUnorId) {
			untrack(() => loadDUK(1));
		}
	});

	// Top 8 Jabatan untuk ringkasan komposisi
	let topJabatan = $derived(
		Object.entries(stats.per_jabatan || {})
			.sort(([, a], [, b]) => b - a)
			.slice(0, 8)
	);
</script>

<svelte:head>
	<title>Daftar Urut Kepangkatan (DUK) — SIPASN</title>
</svelte:head>

<!-- ========================================================================= -->
<!-- LEMBAR CETAK RESMI (HANYA MUNCUL SAAT PRINT / CETAK KE PDF DI BROWSER)   -->
<!-- ========================================================================= -->
<div class="hidden print:block print:w-full print:m-0 print:p-0 font-serif text-black">
	<!-- Kop Surat Resmi Pemerintah Kabupaten Tojo Una-Una -->
	<div class="text-center mb-4 pb-2 border-b-2 border-black">
		<h1 class="text-base font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN TOJO UNA-UNA</h1>
		<h2 class="text-sm font-bold uppercase">BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA</h2>
		<h3 class="text-xs font-bold uppercase mt-1">DAFTAR URUT KEPANGKATAN (DUK) PEGAWAI NEGERI SIPIL</h3>
		<p class="text-xs uppercase font-semibold text-zinc-800 mt-0.5">
			UNIT ORGANISASI: {selectedUnorName || 'SEMUA UNIT ORGANISASI'}
		</p>
		<div class="mt-2 text-[10px] flex justify-between border-t border-black/40 pt-1 font-sans">
			<span>Keadaan: {reportOptions.tanggalCetak}</span>
			<span>Jumlah Pegawai: {allDukData.length || stats.total} Orang</span>
		</div>
	</div>

	<!-- Tabel Cetak DUK Lengkap -->
	<table class="w-full table-fixed text-left text-[9pt] border-collapse border border-black mb-6 bg-white">
		<thead>
			<tr class="bg-zinc-100 text-black uppercase font-bold text-[8pt] text-center border-b border-black">
				<th class="border border-black py-1.5 px-2 w-[5%]">NO</th>
				<th class="border border-black py-1.5 px-3 text-left w-[27%]">NAMA / NIP</th>
				<th class="border border-black py-1.5 px-2 text-left w-[18%]">GOL / PANGKAT</th>
				<th class="border border-black py-1.5 px-3 text-left w-[27%]">JABATAN</th>
				<th class="border border-black py-1.5 px-3 text-left w-[23%]">UNIT KERJA</th>
			</tr>
		</thead>
		<tbody>
			{#each (allDukData.length > 0 ? allDukData : data) as p, i}
				<tr class="border-b border-black/60 {i % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}">
					<td class="border border-black/80 py-1.5 px-2 text-center text-[8pt] font-mono">{i + 1}</td>
					<td class="border border-black/80 py-1.5 px-3 break-words">
						<div class="font-bold text-[9pt] leading-tight">{p.nama}</div>
						<div class="text-[7.5pt] font-mono text-zinc-600 mt-0.5">{p.nip}</div>
					</td>
					<td class="border border-black/80 py-1.5 px-2 text-[8pt] break-words">
						{p.pangkat_gol}
					</td>
					<td class="border border-black/80 py-1.5 px-3 text-[8pt] leading-tight break-words">
						{p.jabatan}
					</td>
					<td class="border border-black/80 py-1.5 px-3 text-[8pt] text-zinc-700 leading-tight break-words">
						{p.unit_kerja}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Blok Tanda Tangan Mengetahui Pejabat -->
	<div class="flex justify-end mt-4 break-inside-avoid">
		<div class="text-center w-72 text-[9pt]">
			<p>{reportOptions.tempat}, {reportOptions.tanggalCetak}</p>
			<p class="text-zinc-700 mt-0.5">Mengetahui / Disahkan oleh:</p>
			<p class="font-bold mt-1 leading-tight">{reportOptions.penandatanganJabatan}</p>
			<div class="h-20"></div>
			<p class="font-bold underline uppercase tracking-tight">
				{reportOptions.penandatanganNama || '( .............................................................. )'}
			</p>
			<p class="text-[8pt] font-mono text-zinc-800">
				{reportOptions.penandatanganNip ? `NIP. ${reportOptions.penandatanganNip}` : 'NIP. .......................................................'}
			</p>
		</div>
	</div>
</div>

<!-- ========================================================================= -->
<!-- TAMPILAN INTERAKTIF UTAMA (DISEMBUNYIKAN SAAT PRINT)                      -->
<!-- ========================================================================= -->
<div class="space-y-6 print:hidden">
	<!-- Header Halaman -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Daftar Urut Kepangkatan (DUK)</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Laporan kepegawaian resmi berdasarkan urutan kepangkatan, eselon, dan jabatan per unit kerja
			</p>
		</div>
	</div>

	<!-- Filter / Search Section -->
	<Card>
		<!-- Pemilih Kategori Unit: OPD, Sekolah, Puskesmas -->
		<div class="mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
			<label class="block text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
				Tingkat / Kategori Unit Kerja
			</label>
			<div class="inline-flex flex-wrap p-1 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 gap-1">
				<button
					type="button"
					onclick={() => handleSwitchKategori('opd')}
					class="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 {kategoriUnit === 'opd' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					<span>🏢</span> OPD / Dinas / Badan
				</button>
				<button
					type="button"
					onclick={() => handleSwitchKategori('sekolah')}
					class="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 {kategoriUnit === 'sekolah' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					<span>🏫</span> Sekolah (SD / SMP / TK)
				</button>
				<button
					type="button"
					onclick={() => handleSwitchKategori('puskesmas')}
					class="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 {kategoriUnit === 'puskesmas' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					<span>🏥</span> Puskesmas / Faskes
				</button>
			</div>
		</div>

		<div class="flex flex-col md:flex-row items-end gap-4">
			<div class="flex-1 w-full">
				<Combobox 
					label={`Pilih ${kategoriLabel}`}
					placeholder={comboboxPlaceholder}
					options={unorOptions}
					bind:value={selectedUnorId}
					disabled={loadingOptions}
					class="w-full"
				/>
			</div>
			<div class="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
				<!-- Tombol Tampilkan -->
				<Button variant="primary" onclick={() => loadDUK(1)} loading={loading} disabled={!selectedUnorId} class="flex-1 md:flex-initial">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					Tampilkan
				</Button>

				<!-- Tombol Export Excel -->
				<Button variant="secondary" onclick={handleExportExcel} loading={exportingExcel} disabled={!selectedUnorId || loading} class="flex-1 md:flex-initial">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
					Export Excel
				</Button>

				<!-- Tombol Laporan PDF / Cetak -->
				<Button variant="secondary" onclick={openPdfModal} loading={pdfLoading} disabled={!selectedUnorId || loading} class="flex-1 md:flex-initial bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border-indigo-200 dark:border-indigo-800">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
					Cetak / PDF
				</Button>
			</div>
		</div>
	</Card>

	<!-- Table Section -->
	{#if loading && data.length === 0}
		<LoadingState message="Menyusun data DUK unit organisasi..." />
	{:else if error}
		<ErrorState message={error} onRetry={() => loadDUK(page)} />
	{:else if data.length > 0 || loading}
		<!-- Stats Summary Accordion -->
		<Accordion open={false}>
			{#snippet title()}
				<div class="flex items-center gap-6">
					<div class="flex flex-col">
						<span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Total Pegawai Unit</span>
						<div class="flex items-baseline gap-2">
							<span class="text-3xl font-black text-zinc-900 dark:text-white leading-none">{stats.total}</span>
							<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">PNS Aktif</span>
						</div>
					</div>
					<div class="hidden md:block h-10 w-px bg-zinc-200 dark:bg-zinc-800"></div>
					<div class="hidden md:flex flex-col">
						<span class="text-xs font-bold text-zinc-400">Ringkasan Komposisi</span>
						<span class="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">{Object.keys(stats.per_jabatan || {}).length} Ragam Jabatan</span>
					</div>
				</div>
			{/snippet}

			<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
				{#each topJabatan as [name, count]}
					<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors overflow-hidden">
						<div class="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase line-clamp-2 leading-tight mb-2 h-6" title={name}>{name}</div>
						<div class="flex items-center justify-between">
							<div class="text-xl font-black text-zinc-900 dark:text-zinc-50 leading-none">{count}</div>
							<div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
						</div>
					</div>
				{/each}
				
				{#if Object.keys(stats.per_jabatan || {}).length > 8}
					<div class="col-span-full pt-2">
						<p class="text-[10px] text-zinc-400 text-center font-medium italic">Menampilkan 8 jabatan teratas dari total {Object.keys(stats.per_jabatan).length} jabatan pada unit kerja ini.</p>
					</div>
				{/if}
			</div>
		</Accordion>

		<!-- Data Table Container -->
		<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
			{#if loading}
				<div class="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all">
					<div class="flex flex-col items-center gap-2">
						<span class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full shadow-sm"></span>
						<span class="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest animate-pulse">Memperbarui Urutan DUK...</span>
					</div>
				</div>
			{/if}
			<table class="w-full text-left text-xs sm:text-sm">
				<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
					<tr>
						<th class="px-5 py-4 w-12 text-center">No</th>
						<th class="px-5 py-4">Pegawai</th>
						<th class="px-4 py-4">Pangkat / Golongan</th>
						<th class="px-4 py-4">Jabatan</th>
						<th class="px-5 py-4">Unit Kerja</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
					{#each data as p, i}
						<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
							<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
								{(stats.page - 1) * stats.limit + i + 1}
							</td>
							<td class="px-5 py-3.5">
								<a href="/pegawai/{p.id}" class="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug">
									{p.nama}
								</a>
								<div class="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{p.nip}</div>
							</td>
							<td class="px-4 py-3.5 whitespace-nowrap">
								<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{p.pangkat_gol}</span>
							</td>
							<td class="px-4 py-3.5">
								<div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{p.jabatan}</div>
							</td>
							<td class="px-5 py-3.5">
								<div class="text-xs text-zinc-600 dark:text-zinc-400 font-medium max-w-[220px] truncate" title={p.unit_kerja}>{p.unit_kerja}</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<!-- Pagination Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/60 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="text-xs font-semibold text-zinc-500">
					Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-100">{(stats.page - 1) * stats.limit + 1}</span> - 
					<span class="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(stats.page * stats.limit, stats.total)}</span> dari 
					<span class="font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</span> pegawai
				</div>
				<div class="flex items-center gap-2">
					<Button 
						variant="secondary" 
						size="sm" 
						disabled={page <= 1} 
						onclick={() => handlePageChange(page - 1)}
					>
						Sebelumnya
					</Button>
					
					<div class="flex items-center gap-1">
						{#each Array.from({ length: Math.min(5, stats.totalPages || 0) }, (_, i) => {
							const totalPages = stats.totalPages || 0;
							const start = Math.max(1, Math.min(page - 2, totalPages - 4));
							return start + i;
						}) as p}
							<button 
								class="w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer {p === page ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
								onclick={() => handlePageChange(p)}
							>
								{p}
							</button>
						{/each}
					</div>

					<Button 
						variant="secondary" 
						size="sm" 
						disabled={page >= stats.totalPages} 
						onclick={() => handlePageChange(page + 1)}
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		</div>
	{:else if !selectedUnorId}
		<div class="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8">
			<div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
			</div>
			<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Siap untuk Menampilkan DUK</h3>
			<p class="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">Silakan pilih OPD / Unit Organisasi Induk di atas untuk menyusun Daftar Urut Kepangkatan.</p>
		</div>
	{:else}
		<EmptyState message="Tidak ada data pegawai untuk unit kerja ini." />
	{/if}
</div>

<!-- ========================================================================= -->
<!-- MODAL PRATINJAU DUK RESMI & AKSI CETAK / UNDUH PDF                        -->
<!-- ========================================================================= -->
<svelte:window onkeydown={handleKeyDown} />

{#if showPdfModal}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
			<!-- Header Modal -->
			<div class="p-4 sm:px-7 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
				<div>
					<div class="flex items-center gap-2">
						<span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
						</span>
						<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">Pratinjau Laporan DUK Resmi (PDF)</h2>
						<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
							{allDukData.length} Pegawai
						</span>
					</div>
					<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate max-w-xl">
						Unit: <strong class="text-zinc-800 dark:text-zinc-200">{selectedUnorName}</strong>
					</p>
				</div>

				<div class="flex items-center gap-2 sm:gap-3">
					<button 
						type="button"
						onclick={closePdfModal}
						class="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
						title="Tutup Pratinjau (Esc)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>

			<!-- Pengaturan Penandatanganan Dokumen (Dapat disesuaikan) -->
			<div class="p-3.5 px-6 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 shrink-0 text-xs">
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
					<div>
						<label for="pdf-tgl" class="block font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Tanggal Cetak</label>
						<input 
							id="pdf-tgl"
							type="text" 
							bind:value={reportOptions.tanggalCetak}
							onchange={refreshPdfPreview}
							placeholder="Contoh: 2 November 2026"
							class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label for="pdf-tempat" class="block font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Tempat</label>
						<input 
							id="pdf-tempat"
							type="text" 
							bind:value={reportOptions.tempat}
							onchange={refreshPdfPreview}
							placeholder="Ampana"
							class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label for="pdf-jabatan" class="block font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Jabatan Penandatangan</label>
						<input 
							id="pdf-jabatan"
							type="text" 
							bind:value={reportOptions.penandatanganJabatan}
							onchange={refreshPdfPreview}
							placeholder="Jabatan Pejabat"
							class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label for="pdf-nama" class="block font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Nama & NIP Pejabat</label>
						<div class="flex gap-2">
							<input 
								id="pdf-nama"
								type="text" 
								bind:value={reportOptions.penandatanganNama}
								onchange={refreshPdfPreview}
								placeholder="Nama Pejabat..."
								class="w-1/2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
							/>
							<input 
								type="text" 
								bind:value={reportOptions.penandatanganNip}
								onchange={refreshPdfPreview}
								placeholder="NIP..."
								class="w-1/2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
							/>
						</div>
					</div>
					<div class="flex items-center">
						<button
							type="button"
							onclick={refreshPdfPreview}
							disabled={generatingPreview}
							class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50"
							title="Perbarui dokumen PDF dengan opsi di atas"
						>
							{#if generatingPreview}
								<span class="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full"></span>
								<span>Menyusun...</span>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
								<span>Perbarui PDF</span>
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Lembar Kerja Dokumen PDF Resmi (Persis Hasil Download PDF Tanpa Background Gelap) -->
			<div class="flex-1 p-3 sm:p-5 bg-zinc-100/80 dark:bg-zinc-900/40 flex flex-col min-h-0 overflow-hidden">
				{#if generatingPreview}
					<div class="flex-1 min-h-[480px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
						<span class="animate-spin h-9 w-9 border-4 border-indigo-600 border-t-transparent rounded-full mb-3"></span>
						<span class="text-sm font-bold text-zinc-800 dark:text-zinc-200">Menyusun dokumen PDF resmi DUK...</span>
						<span class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mengalkulasi tata letak A4 Landscape & urutan nomor halaman</span>
					</div>
				{:else}
					<!-- Sub-Toolbar: Keterangan Dokumen & Kontrol Zoom Lembar Kertas -->
					<div class="flex flex-wrap items-center justify-between pb-3 px-1 text-xs shrink-0 gap-2">
						<div class="flex items-center gap-2">
							<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
								{totalPreviewPages} Lembar Dokumen (A4 Landscape)
							</span>
							<span class="text-zinc-500 dark:text-zinc-400 hidden sm:inline text-[11px]">
								Seluruh lembar tersaji bersambung (cukup gulir ke bawah)
							</span>
						</div>

						<!-- Kontrol Zoom -->
						<div class="flex items-center gap-1.5">
							<span class="text-[11px] text-zinc-400 mr-1 hidden sm:inline">Perbesaran:</span>
							<button
								type="button"
								onclick={handleZoomOut}
								title="Perkecil (-15%)"
								class="w-7 h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
							>
								-
							</button>
							<button
								type="button"
								onclick={handleZoomReset}
								title="Reset Zoom (100%)"
								class="px-2.5 h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-mono font-semibold flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
							>
								{Math.round(previewScale * 100)}%
							</button>
							<button
								type="button"
								onclick={handleZoomIn}
								title="Perbesar (+15%)"
								class="w-7 h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
							>
								+
							</button>
						</div>
					</div>

					<!-- Viewport Lembar Canvas Bersih (1 Halaman Scroll Bersambung, Bebas Berpindah Halaman) -->
					<div class="flex-1 overflow-auto rounded-2xl bg-zinc-200/50 dark:bg-zinc-950/80 p-4 sm:p-6 shadow-inner relative border border-zinc-200 dark:border-zinc-800 min-h-[460px]">
						{#if isRenderingCanvas}
							<div class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-10">
								<div class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
									<span class="animate-spin h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
									<span>Merender seluruh lembar dokumen...</span>
								</div>
							</div>
						{/if}

						<!-- Seluruh Lembar PDF Tersaji Berurutan ke Bawah dalam 1 Halaman Scroll -->
						<div class="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
							{#each Array.from({ length: totalPreviewPages }, (_, i) => i + 1) as pageNum (pageNum)}
								<div class="flex flex-col items-center w-full">
									{#if totalPreviewPages > 1}
										<div class="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 self-start px-1 flex items-center gap-1.5">
											<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
											<span>Lembar {pageNum} dari {totalPreviewPages}</span>
										</div>
									{/if}

									<!-- Lembar Kertas Putih Bersih Otentik -->
									<div class="bg-white shadow-2xl rounded-xl border border-zinc-300 overflow-hidden shrink-0 transition-all duration-150">
										<canvas
											use:canvasPageAction={pageNum}
											class="block max-w-full h-auto mx-auto"
										></canvas>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Modal & Tombol Aksi -->
			<div class="p-4 sm:px-7 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
				<div class="text-xs text-zinc-500 dark:text-zinc-400">
					Menyajikan seluruh <strong>{allDukData.length}</strong> pegawai DUK dalam urutan kepangkatan resmi.
				</div>

				<div class="flex items-center gap-3 w-full sm:w-auto justify-end">
					<Button variant="secondary" onclick={closePdfModal}>
						Tutup
					</Button>

					<!-- Tombol Cetak / Simpan PDF (window.print) -->
					<Button variant="secondary" onclick={handlePrintWindow} class="gap-1.5">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
						Cetak / Simpan PDF
					</Button>

					<!-- Tombol Unduh Berkas PDF Langsung (.pdf) -->
					<Button variant="primary" onclick={handleDownloadPdfDirect} loading={downloadingPdf} class="gap-1.5 shadow-sm">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
						Unduh File PDF (.pdf)
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
			font-size: 9pt;
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
			margin: 1.2cm 1.5cm;
		}
		thead {
			display: table-header-group;
		}
		tr {
			page-break-inside: avoid;
		}
	}
</style>
