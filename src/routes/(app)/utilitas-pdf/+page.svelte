<script>
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import PdfThumbnail from '$lib/components/pdf/PdfThumbnail.svelte';
	import PdfPreviewModal from '$lib/components/pdf/PdfPreviewModal.svelte';
	import {
		fileToUint8Array,
		loadPdfJsDocument,
		processPdfPages,
		extractPdfPages,
		mergePdfFiles,
		splitPdfByRanges,
		rotatePdfDocument,
		compressPdfDocument,
		downloadPdf,
		formatBytes
	} from '$lib/utils/pdfHelper.js';

	// Tab Aktif:
	// 'pages' (Kelola & Hapus Halaman)
	// 'rotate' (Putar Dokumen)
	// 'compress' (Kompres Dokumen)
	// 'split' (Pisah PDF)
	// 'merge' (Gabung PDF)
	let activeTab = $state('pages');

	// State File Utama (untuk Tab Kelola, Rotate, Compress, dan Split)
	let currentFile = $state(null);
	let currentBytes = $state(null);
	let pdfJsDoc = $state(null);
	let totalOriginalPages = $state(0);
	let isLoadingPdf = $state(false);

	// Struktur Halaman: [{ originalPageNumber: 1, rotation: 0, isSelected: false, isDeleted: false }]
	let pagesList = $state([]);

	// State Modal Preview
	let isPreviewOpen = $state(false);
	let previewPageNumber = $state(1);
	let previewRotation = $state(0);

	// State Export / Download di Tab Kelola
	let exportFilename = $state('');
	let isProcessingExport = $state(false);

	// State Tab Rotasi Khusus
	let isProcessingRotate = $state(false);

	// State Tab Kompresi Khusus
	let compressLevel = $state('medium'); // 'low', 'medium', 'high'
	let isCompressing = $state(false);
	let compressProgress = $state({ current: 0, total: 0, percent: 0 });
	let compressedResultBytes = $state(null);
	let compressedOutputName = $state('');

	// State Tab Split
	let splitMode = $state('visual'); // 'visual', 'range', 'single'
	let splitRangeInput = $state('1-2, 3-4');
	let splitResults = $state([]);
	let isProcessingSplit = $state(false);

	// State Tab Merge
	let mergeFiles = $state([]); // [{ id, name, size, bytes, pageCount }]
	let mergeOutputName = $state('dokumen_gabungan.pdf');
	let isProcessingMerge = $state(false);

	// Derived metrics untuk Tab Kelola
	let activePagesCount = $derived(pagesList.filter((p) => !p.isDeleted).length);
	let deletedPagesCount = $derived(pagesList.filter((p) => p.isDeleted).length);
	let selectedPagesCount = $derived(pagesList.filter((p) => p.isSelected && !p.isDeleted).length);
	let isAllSelected = $derived(
		pagesList.length > 0 && pagesList.filter((p) => !p.isDeleted).every((p) => p.isSelected)
	);

	// ----------------------------------------------------
	// Fungsi Unggah & Muat File Tunggal (Tab Kelola, Rotate, Compress, Split)
	// ----------------------------------------------------
	async function handleSingleFileSelected(file) {
		if (!file) return;
		if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			toast.error('File harus berformat PDF (.pdf)');
			return;
		}

		isLoadingPdf = true;
		try {
			const bytes = await fileToUint8Array(file);
			const doc = await loadPdfJsDocument(bytes);

			currentFile = file;
			currentBytes = bytes;
			pdfJsDoc = doc;
			totalOriginalPages = doc.numPages;

			// Inisialisasi daftar halaman
			pagesList = Array.from({ length: doc.numPages }, (_, i) => ({
				originalPageNumber: i + 1,
				rotation: 0,
				isSelected: false,
				isDeleted: false
			}));

			exportFilename = file.name.replace(/\.pdf$/i, '') + '_diedit.pdf';
			compressedOutputName = file.name.replace(/\.pdf$/i, '') + '_terkompresi.pdf';
			compressedResultBytes = null;
			splitResults = [];

			toast.success(`Berhasil memuat "${file.name}" (${doc.numPages} halaman)`);
		} catch (err) {
			toast.error('Gagal membaca dokumen PDF: ' + (err.message || 'Format tidak didukung'));
		} finally {
			isLoadingPdf = false;
		}
	}

	function handleDropSingle(e) {
		e.preventDefault();
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleSingleFileSelected(files[0]);
		}
	}

	function resetSingleFile() {
		currentFile = null;
		currentBytes = null;
		pdfJsDoc = null;
		totalOriginalPages = 0;
		pagesList = [];
		splitResults = [];
		compressedResultBytes = null;
	}

	// ----------------------------------------------------
	// Manipulasi Halaman: Rotasi, Hapus, Seleksi, Urutan
	// ----------------------------------------------------
	function toggleSelectPage(index) {
		pagesList[index].isSelected = !pagesList[index].isSelected;
	}

	function toggleSelectAll() {
		const targetState = !isAllSelected;
		pagesList.forEach((p) => {
			if (!p.isDeleted) p.isSelected = targetState;
		});
	}

	function rotateSinglePage(index, delta) {
		const current = pagesList[index].rotation || 0;
		pagesList[index].rotation = (current + delta + 360) % 360;
		toast.info(`Halaman ${pagesList[index].originalPageNumber} diputar ke ${pagesList[index].rotation}°`);
	}

	function rotateAllPages(delta) {
		pagesList.forEach((p) => {
			const current = p.rotation || 0;
			p.rotation = (current + delta + 360) % 360;
		});
		toast.success(`Semua halaman diputar ${delta > 0 ? '+90°' : '-90°'}`);
	}

	function rotateFilteredPages(filterType, delta) {
		let count = 0;
		pagesList.forEach((p, idx) => {
			const pageNum = p.originalPageNumber;
			const match =
				filterType === 'all' ||
				(filterType === 'odd' && pageNum % 2 !== 0) ||
				(filterType === 'even' && pageNum % 2 === 0);

			if (match) {
				const current = p.rotation || 0;
				p.rotation = (current + delta + 360) % 360;
				count++;
			}
		});
		toast.success(`${count} halaman diputar ${delta > 0 ? '+90°' : '-90°'}`);
	}

	function resetAllRotations() {
		pagesList.forEach((p) => {
			p.rotation = 0;
		});
		toast.info('Semua rotasi halaman dikembalikan ke orientasi normal (0°)');
	}

	function toggleDeletePage(index) {
		pagesList[index].isDeleted = !pagesList[index].isDeleted;
		if (pagesList[index].isDeleted) {
			pagesList[index].isSelected = false;
			toast.info(`Halaman ${pagesList[index].originalPageNumber} ditandai untuk dihapus`);
		} else {
			toast.info(`Halaman ${pagesList[index].originalPageNumber} dikembalikan`);
		}
	}

	function deleteSelectedPages() {
		let count = 0;
		pagesList.forEach((p) => {
			if (p.isSelected && !p.isDeleted) {
				p.isDeleted = true;
				p.isSelected = false;
				count++;
			}
		});
		if (count > 0) {
			toast.success(`${count} halaman ditandai untuk dihapus`);
		} else {
			toast.info('Pilih halaman terlebih dahulu dengan mencentang kotak');
		}
	}

	function restoreAllDeletedPages() {
		let count = 0;
		pagesList.forEach((p) => {
			if (p.isDeleted) {
				p.isDeleted = false;
				count++;
			}
		});
		toast.success(`${count} halaman berhasil dikembalikan`);
	}

	function movePage(index, direction) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= pagesList.length) return;
		const temp = pagesList[index];
		pagesList[index] = pagesList[targetIndex];
		pagesList[targetIndex] = temp;
	}

	// ----------------------------------------------------
	// Modal Preview Halaman
	// ----------------------------------------------------
	function openPreviewModal(index) {
		const page = pagesList[index];
		previewPageNumber = page.originalPageNumber;
		previewRotation = page.rotation;
		isPreviewOpen = true;
	}

	function handlePreviewRotate(delta) {
		const targetPage = pagesList.find((p) => p.originalPageNumber === previewPageNumber);
		if (targetPage) {
			targetPage.rotation = ((targetPage.rotation || 0) + delta + 360) % 360;
			previewRotation = targetPage.rotation;
		}
	}

	function handlePreviewPageChange(newPageNumber) {
		previewPageNumber = newPageNumber;
		const targetPage = pagesList.find((p) => p.originalPageNumber === newPageNumber);
		if (targetPage) {
			previewRotation = targetPage.rotation;
		}
	}

	/**
	 * Memastikan ketersediaan buffer biner PDF yang valid dan tidak kosong
	 * @returns {Promise<Uint8Array>}
	 */
	async function getValidCurrentBytes() {
		if (currentBytes && currentBytes.byteLength > 0) {
			return currentBytes;
		}
		if (currentFile) {
			currentBytes = await fileToUint8Array(currentFile);
			return currentBytes;
		}
		throw new Error('Dokumen PDF belum dimuat.');
	}

	// ----------------------------------------------------
	// Eksekusi Simpan & Unduh (Tab Kelola)
	// ----------------------------------------------------
	async function handleExportProcessedPdf() {
		if (activePagesCount === 0) {
			toast.error('Tidak ada halaman yang tersisa. Batalkan penghapusan minimal satu halaman.');
			return;
		}

		isProcessingExport = true;
		try {
			const bytes = await getValidCurrentBytes();
			const pageIndicesToRemove = [];
			const rotationsMap = {};

			pagesList.forEach((p) => {
				const zeroIndex = p.originalPageNumber - 1;
				if (p.isDeleted) {
					pageIndicesToRemove.push(zeroIndex);
				} else if (p.rotation !== 0) {
					rotationsMap[zeroIndex] = p.rotation;
				}
			});

			const newBytes = await processPdfPages(bytes, pageIndicesToRemove, rotationsMap);
			const fileName = exportFilename.trim() || 'dokumen_hasil.pdf';
			downloadPdf(newBytes, fileName);

			toast.success(`File "${fileName}" berhasil diunduh! (${formatBytes(newBytes.length)})`);
		} catch (err) {
			toast.error('Gagal mengekspor PDF: ' + err.message);
		} finally {
			isProcessingExport = false;
		}
	}

	// ----------------------------------------------------
	// Eksekusi Simpan & Unduh Tab Rotasi
	// ----------------------------------------------------
	async function handleExportRotatedPdf() {
		isProcessingRotate = true;
		try {
			const bytes = await getValidCurrentBytes();
			const rotationsMap = {};
			pagesList.forEach((p) => {
				if (p.rotation !== 0) {
					rotationsMap[p.originalPageNumber - 1] = p.rotation;
				}
			});

			// Simpan semua halaman dengan rotasi masing-masing
			const allIndices = Array.from({ length: totalOriginalPages }, (_, i) => i);
			const newBytes = await extractPdfPages(bytes, allIndices, rotationsMap);
			const fileName = currentFile.name.replace(/\.pdf$/i, '') + '_terotasi.pdf';
			downloadPdf(newBytes, fileName);

			toast.success(`File hasil rotasi "${fileName}" berhasil diunduh!`);
		} catch (err) {
			toast.error('Gagal menyimpan hasil rotasi: ' + err.message);
		} finally {
			isProcessingRotate = false;
		}
	}

	// ----------------------------------------------------
	// Eksekusi Tab Kompresi (Compress PDF)
	// ----------------------------------------------------
	async function handleExecuteCompress() {
		if (!pdfJsDoc) {
			toast.error('Pilih file PDF terlebih dahulu.');
			return;
		}

		isCompressing = true;
		compressProgress = { current: 0, total: totalOriginalPages, percent: 0 };

		try {
			const compressedBytes = await compressPdfDocument(
				pdfJsDoc,
				{ level: compressLevel },
				(current, total) => {
					compressProgress = {
						current,
						total,
						percent: Math.round((current / total) * 100)
					};
				}
			);

			compressedResultBytes = compressedBytes;
			const originalSize = currentFile.size;
			const newSize = compressedBytes.length;
			const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

			toast.success(
				`Kompresi selesai! Ukuran berhasil dihemat ${savedPercent}% (${formatBytes(originalSize)} ➔ ${formatBytes(newSize)})`
			);
		} catch (err) {
			toast.error('Gagal mengompresi PDF: ' + err.message);
		} finally {
			isCompressing = false;
		}
	}

	function handleDownloadCompressed() {
		if (!compressedResultBytes) return;
		const filename = compressedOutputName.trim() || 'dokumen_terkompresi.pdf';
		downloadPdf(compressedResultBytes, filename);
		toast.success(`File "${filename}" berhasil diunduh.`);
	}

	// ----------------------------------------------------
	// Tab Split: Ekstrak Halaman Pilihan / Split Rentang
	// ----------------------------------------------------
	async function handleExtractSelectedPages() {
		const selectedPages = pagesList.filter((p) => p.isSelected && !p.isDeleted);
		if (selectedPages.length === 0) {
			toast.error('Centang minimal satu halaman yang ingin diekstrak.');
			return;
		}

		isProcessingSplit = true;
		try {
			const bytes = await getValidCurrentBytes();
			const indicesToKeep = selectedPages.map((p) => p.originalPageNumber - 1);
			const rotationsMap = {};
			selectedPages.forEach((p) => {
				if (p.rotation !== 0) {
					rotationsMap[p.originalPageNumber - 1] = p.rotation;
				}
			});

			const newBytes = await extractPdfPages(bytes, indicesToKeep, rotationsMap);
			const baseName = currentFile.name.replace(/\.pdf$/i, '');
			const filename = `${baseName}_ekstrak_${selectedPages.length}_halaman.pdf`;

			downloadPdf(newBytes, filename);
			toast.success(`Ekstrak ${selectedPages.length} halaman berhasil diunduh!`);
		} catch (err) {
			toast.error('Gagal mengekstrak halaman: ' + err.message);
		} finally {
			isProcessingSplit = false;
		}
	}

	async function handleSplitByRanges() {
		if (!splitRangeInput.trim()) {
			toast.error('Masukkan pola rentang halaman.');
			return;
		}

		isProcessingSplit = true;
		try {
			const bytes = await getValidCurrentBytes();
			const results = await splitPdfByRanges(bytes, splitRangeInput, currentFile.name);
			splitResults = results;
			toast.success(`Berhasil membagi dokumen menjadi ${results.length} bagian.`);
		} catch (err) {
			toast.error('Gagal membagi dokumen: ' + err.message);
		} finally {
			isProcessingSplit = false;
		}
	}

	async function handleSplitEverySinglePage() {
		isProcessingSplit = true;
		try {
			const bytes = await getValidCurrentBytes();
			const allPagesPattern = Array.from({ length: totalOriginalPages }, (_, i) => i + 1).join(', ');
			const results = await splitPdfByRanges(bytes, allPagesPattern, currentFile.name);
			splitResults = results;
			toast.success(`Berhasil memisahkan ${results.length} halaman menjadi file tunggal.`);
		} catch (err) {
			toast.error('Gagal memisahkan halaman: ' + err.message);
		} finally {
			isProcessingSplit = false;
		}
	}

	// ----------------------------------------------------
	// Tab Merge: Multi-file Upload, Reorder & Gabung
	// ----------------------------------------------------
	async function handleAddMergeFiles(fileList) {
		if (!fileList || fileList.length === 0) return;

		for (const file of Array.from(fileList)) {
			if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
				continue;
			}
			try {
				const bytes = await fileToUint8Array(file);
				const doc = await loadPdfJsDocument(bytes);
				const id = Math.random().toString(36).substring(2, 9);

				mergeFiles = [
					...mergeFiles,
					{
						id,
						name: file.name,
						size: file.size,
						bytes,
						pageCount: doc.numPages
					}
				];
			} catch (err) {
				toast.error(`Gagal memuat "${file.name}": ${err.message}`);
			}
		}
		toast.success(`Daftar dokumen diperbarui (${mergeFiles.length} file)`);
	}

	function handleDropMerge(e) {
		e.preventDefault();
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleAddMergeFiles(files);
		}
	}

	function removeMergeFile(index) {
		mergeFiles = mergeFiles.filter((_, i) => i !== index);
	}

	function moveMergeFile(index, direction) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= mergeFiles.length) return;
		const nextList = [...mergeFiles];
		const temp = nextList[index];
		nextList[index] = nextList[targetIndex];
		nextList[targetIndex] = temp;
		mergeFiles = nextList;
	}

	async function handleExecuteMerge() {
		if (mergeFiles.length < 2) {
			toast.error('Tambahkan minimal 2 file PDF untuk digabungkan.');
			return;
		}

		isProcessingMerge = true;
		try {
			const mergedBytes = await mergePdfFiles(mergeFiles);
			const fileName = mergeOutputName.trim() || 'dokumen_gabungan.pdf';
			downloadPdf(mergedBytes, fileName);

			const totalPagesMerged = mergeFiles.reduce((acc, f) => acc + f.pageCount, 0);
			toast.success(
				`Berhasil menggabungkan ${mergeFiles.length} dokumen (${totalPagesMerged} halaman)!`
			);
		} catch (err) {
			toast.error('Gagal menggabungkan PDF: ' + err.message);
		} finally {
			isProcessingMerge = false;
		}
	}
</script>

<svelte:head>
	<title>Utilitas & Manajemen Dokumen PDF | SIPASN</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto pb-12">
	<!-- Header Halaman -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
				</span>
				<h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Utilitas Dokumen PDF</h1>
			</div>
			<p class="text-sm text-slate-500 dark:text-slate-400">
				Kelola dokumen kepegawaian ASN: hapus halaman, putar (rotasi), kompresi ukuran, pisah (split), dan gabung (merge) PDF secara instan di browser.
			</p>
		</div>

		<!-- Badge Privasi & Keamanan Klien -->
		<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400 self-start sm:self-auto">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			<span>100% Pemrosesan Lokal Aman (Tanpa Kirim Server)</span>
		</div>
	</div>

	<!-- 5 Tab Navigasi Utama -->
	<div class="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-2 pt-2 shadow-xs scrollbar-none">
		<!-- Tab 1: Kelola & Hapus -->
		<button
			type="button"
			onclick={() => (activeTab = 'pages')}
			class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-[1px]
				{activeTab === 'pages'
					? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
			<span>Kelola & Hapus Halaman</span>
		</button>

		<!-- Tab 2: Rotasi PDF -->
		<button
			type="button"
			onclick={() => (activeTab = 'rotate')}
			class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-[1px]
				{activeTab === 'rotate'
					? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
			<span>Putar Dokumen (Rotate)</span>
		</button>

		<!-- Tab 3: Kompresi PDF -->
		<button
			type="button"
			onclick={() => (activeTab = 'compress')}
			class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-[1px]
				{activeTab === 'compress'
					? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 19 4-4 4 4"/><path d="M12 15v8"/></svg>
			<span>Kompres Dokumen (Compress)</span>
		</button>

		<!-- Tab 4: Pisah PDF -->
		<button
			type="button"
			onclick={() => (activeTab = 'split')}
			class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-[1px]
				{activeTab === 'split'
					? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
			<span>Pisah Dokumen (Split)</span>
		</button>

		<!-- Tab 5: Gabung PDF -->
		<button
			type="button"
			onclick={() => (activeTab = 'merge')}
			class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-[1px]
				{activeTab === 'merge'
					? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/></svg>
			<span>Gabung Dokumen (Merge)</span>
			{#if mergeFiles.length > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
					{mergeFiles.length}
				</span>
			{/if}
		</button>
	</div>

	<!-- ======================================================== -->
	<!-- KONTEN TAB 1, 2, 3, 4 (MODUL DOKUMEN TUNGGAL) -->
	<!-- ======================================================== -->
	{#if activeTab !== 'merge'}
		{#if !currentFile}
			<!-- Dropzone File Tunggal jika belum ada file aktif -->
			<div
				ondrop={handleDropSingle}
				ondragover={(e) => e.preventDefault()}
				class="relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800 rounded-2xl transition group text-center cursor-pointer"
			>
				<input
					type="file"
					accept="application/pdf"
					onchange={(e) => handleSingleFileSelected(e.target.files?.[0])}
					class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				/>

				<div class="w-16 h-16 mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
				</div>

				<h3 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
					Pilih atau Tarik Dokumen PDF ke Sini
				</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
					Buka file PDF SK Kepegawaian, Ijazah, Penilaian Kinerja, atau dokumen lainnya untuk diproses.
				</p>

				<button
					type="button"
					class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition pointer-events-none"
				>
					Pilih File PDF
				</button>
			</div>
		{:else}
			<!-- Banner Info File Aktif -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
				<div class="flex items-center gap-3">
					<div class="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h4"/></svg>
					</div>
					<div>
						<h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-md">
							{currentFile.name}
						</h2>
						<div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							<span>{formatBytes(currentFile.size)}</span>
							<span>•</span>
							<span>Total {totalOriginalPages} Halaman</span>
							<span>•</span>
							<span class="text-emerald-600 dark:text-emerald-400 font-medium">{activePagesCount} Aktif</span>
							{#if deletedPagesCount > 0}
								<span>•</span>
								<span class="text-red-600 dark:text-red-400 font-medium">{deletedPagesCount} Dihapus</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={resetSingleFile}
						class="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:white bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
					>
						Ganti File PDF
					</button>
				</div>
			</div>

			<!-- ======================================== -->
			<!-- TAB 1: KELOLA & HAPUS HALAMAN -->
			<!-- ======================================== -->
			{#if activeTab === 'pages'}
				<!-- Toolbar Aksi Cepat Halaman -->
				<div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
					<!-- Seleksi & Aksi Hapus -->
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onclick={toggleSelectAll}
							class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
						>
							<input
								type="checkbox"
								checked={isAllSelected}
								class="w-3.5 h-3.5 rounded text-blue-600 pointer-events-none"
							/>
							<span>{isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
						</button>

						<!-- Hapus Terpilih -->
						{#if selectedPagesCount > 0}
							<button
								type="button"
								onclick={deleteSelectedPages}
								class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition flex items-center gap-1"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
								<span>Hapus {selectedPagesCount} Halaman Terpilih</span>
							</button>
						{/if}

						<!-- Kembalikan Semua Terhapus -->
						{#if deletedPagesCount > 0}
							<button
								type="button"
								onclick={restoreAllDeletedPages}
								class="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
								<span>Pulihkan {deletedPagesCount} Halaman</span>
							</button>
						{/if}
					</div>

					<!-- Form Unduh Hasil -->
					<div class="flex items-center gap-2 w-full sm:w-auto">
						<input
							type="text"
							bind:value={exportFilename}
							placeholder="nama_file_hasil.pdf"
							class="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
						/>
						<Button
							variant="primary"
							loading={isProcessingExport}
							onclick={handleExportProcessedPdf}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
							<span>Terapkan & Unduh</span>
						</Button>
					</div>
				</div>

				<!-- Grid Thumbnail Halaman -->
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each pagesList as page, index (page.originalPageNumber)}
						<PdfThumbnail
							pdfDoc={pdfJsDoc}
							{pdfJsDoc}
							pageNumber={page.originalPageNumber}
							displayIndex={index + 1}
							rotation={page.rotation}
							isSelected={page.isSelected}
							isDeleted={page.isDeleted}
							isFirst={index === 0}
							isLast={index === pagesList.length - 1}
							onToggleSelect={() => toggleSelectPage(index)}
							onRotate={(delta) => rotateSinglePage(index, delta)}
							onToggleDelete={() => toggleDeletePage(index)}
							onPreview={() => openPreviewModal(index)}
							onMove={(dir) => movePage(index, dir)}
						/>
					{/each}
				</div>
			{/if}

			<!-- ======================================== -->
			<!-- TAB 2: ROTASI DOKUMEN (ROTATE PDF) -->
			<!-- ======================================== -->
			{#if activeTab === 'rotate'}
				<div class="space-y-6">
					<!-- Panel Kontrol Aksi Rotasi Cepat -->
					<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
						<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div>
								<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
									<span>Kontrol Rotasi Dokumen</span>
								</h3>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Putar orientasi seluruh dokumen, per lembar ganjil/genap, atau klik tombol putar pada masing-masing kartu halaman.
								</p>
							</div>

							<!-- Tombol Unduh Hasil Rotasi Langsung -->
							<Button
								variant="primary"
								loading={isProcessingRotate}
								onclick={handleExportRotatedPdf}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								<span>Simpan & Unduh PDF Hasil Rotasi</span>
							</Button>
						</div>

						<!-- Tombol Rotasi Cepat Massal -->
						<div class="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
							<button
								type="button"
								onclick={() => rotateAllPages(90)}
								class="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1.5"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
								<span>Putar Semua +90° (Searah Jarum Jam)</span>
							</button>

							<button
								type="button"
								onclick={() => rotateAllPages(-90)}
								class="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1.5"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
								<span>Putar Semua -90° (Berlawanan)</span>
							</button>

							<button
								type="button"
								onclick={() => rotateAllPages(180)}
								class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1.5"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
								<span>Balik Semua 180°</span>
							</button>

							<div class="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

							<button
								type="button"
								onclick={() => rotateFilteredPages('odd', 90)}
								class="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
							>
								Putar Lembar Ganjil Saja +90°
							</button>

							<button
								type="button"
								onclick={() => rotateFilteredPages('even', 90)}
								class="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
							>
								Putar Lembar Genap Saja +90°
							</button>

							<button
								type="button"
								onclick={resetAllRotations}
								class="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition ml-auto"
							>
								Reset Orientasi (0°)
							</button>
						</div>
					</div>

					<!-- Visual Grid Thumbnail dengan Penunjuk Sudut Rotasi -->
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
						{#each pagesList as page, index (page.originalPageNumber)}
							<PdfThumbnail
								pdfDoc={pdfJsDoc}
								{pdfJsDoc}
								pageNumber={page.originalPageNumber}
								displayIndex={index + 1}
								rotation={page.rotation}
								isSelected={false}
								isDeleted={false}
								isFirst={index === 0}
								isLast={index === pagesList.length - 1}
								onToggleSelect={() => {}}
								onRotate={(delta) => rotateSinglePage(index, delta)}
								onToggleDelete={() => {}}
								onPreview={() => openPreviewModal(index)}
								onMove={(dir) => movePage(index, dir)}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- ======================================== -->
			<!-- TAB 3: KOMPRES DOKUMEN (COMPRESS PDF) -->
			<!-- ======================================== -->
			{#if activeTab === 'compress'}
				<div class="space-y-6">
					<!-- Pilihan Level Kompresi -->
					<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
						<div>
							<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 19 4-4 4 4"/><path d="M12 15v8"/></svg>
								<span>Pilih Tingkat Kompresi Dokumen</span>
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
								Kompresi diproses 100% di browser dengan optimasi canvas dan stream PDF tanpa mengurangi keterbacaan teks dan stempel SK.
							</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<!-- Level 1: Optimal SIASN / BKN -->
							<div
								onclick={() => (compressLevel = 'medium')}
								class="p-5 rounded-2xl border cursor-pointer transition relative
									{compressLevel === 'medium'
										? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
										: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
							>
								<div class="absolute top-3.5 right-3.5">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
										Rekomendasi
									</span>
								</div>
								<div class="flex items-center gap-2 mb-2">
									<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">A</span>
									<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Optimal SIASN / BKN</h4>
								</div>
								<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
									Keseimbangan sempurna antara kejernihan cap/tanda tangan dan ukuran file di bawah 1MB untuk upload SIASN.
								</p>
								<span class="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Hemat ~60% - 75% ukuran</span>
							</div>

							<!-- Level 2: Kompresi Maksimal -->
							<div
								onclick={() => (compressLevel = 'high')}
								class="p-5 rounded-2xl border cursor-pointer transition
									{compressLevel === 'high'
										? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
										: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
							>
								<div class="flex items-center gap-2 mb-2">
									<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">B</span>
									<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Kompresi Maksimal</h4>
								</div>
								<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
									Ukuran file sekecil mungkin. Sangat cocok jika dokumen memiliki kuota upload yang sangat ketat (&lt;500 KB).
								</p>
								<span class="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Hemat ~75% - 88% ukuran</span>
							</div>

							<!-- Level 3: Kompresi Ringan -->
							<div
								onclick={() => (compressLevel = 'low')}
								class="p-5 rounded-2xl border cursor-pointer transition
									{compressLevel === 'low'
										? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
										: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
							>
								<div class="flex items-center gap-2 mb-2">
									<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">C</span>
									<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Kompresi Ringan</h4>
								</div>
								<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
									Kualitas dokumen tetap dipertahankan sangat tajam dengan resolusi tinggi, hanya memangkas data yang tidak perlu.
								</p>
								<span class="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Hemat ~30% - 45% ukuran</span>
							</div>
						</div>

						<!-- Progres Kompresi jika sedang berlangsung -->
						{#if isCompressing}
							<div class="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-3 animate-in fade-in">
								<div class="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
									<span class="flex items-center gap-2">
										<span class="animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
										<span>Mengompresi dokumen: Halaman {compressProgress.current} dari {compressProgress.total}...</span>
									</span>
									<span class="text-blue-600 dark:text-blue-400">{compressProgress.percent}%</span>
								</div>

								<div class="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
									<div
										class="h-full bg-blue-600 rounded-full transition-all duration-300"
										style="width: {compressProgress.percent}%"
									></div>
								</div>
							</div>
						{/if}

						<!-- Hasil Kompresi (Card Perbandingan Ukuran) -->
						{#if compressedResultBytes && !isCompressing}
							{@const originalSize = currentFile.size}
							{@const newSize = compressedResultBytes.length}
							{@const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))}

							<div class="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-in fade-in">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
										<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
										<span>Dokumen Berhasil Dikompresi!</span>
									</h4>

									<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
										Hemat {savedPercent}%
									</span>
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
									<div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
										<p class="text-[11px] text-slate-400">Ukuran Dokumen Asli</p>
										<p class="text-base font-bold text-slate-800 dark:text-slate-100">{formatBytes(originalSize)}</p>
									</div>

									<div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
										<p class="text-[11px] text-slate-400">Ukuran Setelah Kompresi</p>
										<p class="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatBytes(newSize)}</p>
									</div>

									<div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
										<p class="text-[11px] text-slate-400">Total Halaman</p>
										<p class="text-base font-bold text-slate-800 dark:text-slate-100">{totalOriginalPages} Halaman</p>
									</div>
								</div>

								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
									<input
										type="text"
										bind:value={compressedOutputName}
										placeholder="dokumen_terkompresi.pdf"
										class="text-xs px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 w-full sm:w-72"
									/>

									<Button
										variant="primary"
										onclick={handleDownloadCompressed}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
										<span>Unduh PDF Terkompresi ({formatBytes(newSize)})</span>
									</Button>
								</div>
							</div>
						{/if}

						<!-- Tombol Mulai Kompresi -->
						{#if !compressedResultBytes}
							<div class="flex justify-end pt-2">
								<Button
									variant="primary"
									loading={isCompressing}
									onclick={handleExecuteCompress}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 19 4-4 4 4"/><path d="M12 15v8"/></svg>
									<span>Mulai Kompresi Dokumen</span>
								</Button>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- ======================================== -->
			<!-- TAB 4: PISAH DOKUMEN (SPLIT) -->
			<!-- ======================================== -->
			{#if activeTab === 'split'}
				<div class="space-y-6">
					<!-- Pilihan Sub-Mode Split -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- Mode A: Ekstrak Visual -->
						<div
							onclick={() => (splitMode = 'visual')}
							class="p-5 rounded-2xl border cursor-pointer transition
								{splitMode === 'visual'
									? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
									: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-2 mb-2">
								<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">1</span>
								<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Ekstrak Pilihan Visual</h3>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400">
								Centang halaman yang diinginkan pada pratinjau kartu di bawah, lalu unduh halaman tersebut ke dokumen baru.
							</p>
						</div>

						<!-- Mode B: Pisah per Rentang -->
						<div
							onclick={() => (splitMode = 'range')}
							class="p-5 rounded-2xl border cursor-pointer transition
								{splitMode === 'range'
									? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
									: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-2 mb-2">
								<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">2</span>
								<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Pola Rentang Halaman</h3>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400">
								Masukkan format rentang (contoh: <code>1-2, 3-4, 5</code>) untuk memotong dokumen menjadi beberapa bagian file sekaligus.
							</p>
						</div>

						<!-- Mode C: Pisah Tiap Halaman Tunggal -->
						<div
							onclick={() => (splitMode = 'single')}
							class="p-5 rounded-2xl border cursor-pointer transition
								{splitMode === 'single'
									? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
									: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-2 mb-2">
								<span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">3</span>
								<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Pisah Setiap Lembar</h3>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400">
								Pecah seluruh {totalOriginalPages} halaman menjadi {totalOriginalPages} file PDF terpisah masing-masing 1 lembar.
							</p>
						</div>
					</div>

					<!-- Kontrol Khusus Berdasarkan Mode Split -->
					{#if splitMode === 'visual'}
						<div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
							<div class="flex items-center gap-3">
								<span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
									{selectedPagesCount} dari {totalOriginalPages} halaman dipilih
								</span>
								<button
									type="button"
									onclick={toggleSelectAll}
									class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
								>
									{isAllSelected ? 'Batal Pilih' : 'Pilih Semua'}
								</button>
							</div>

							<Button
								variant="primary"
								disabled={selectedPagesCount === 0}
								loading={isProcessingSplit}
								onclick={handleExtractSelectedPages}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								<span>Ekstrak ({selectedPagesCount}) Halaman ke PDF Baru</span>
							</Button>
						</div>

						<!-- Grid Thumbnail untuk Pemilihan Visual -->
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{#each pagesList as page, index (page.originalPageNumber)}
								<PdfThumbnail
									pdfDoc={pdfJsDoc}
									{pdfJsDoc}
									pageNumber={page.originalPageNumber}
									displayIndex={index + 1}
									rotation={page.rotation}
									isSelected={page.isSelected}
									isDeleted={false}
									isFirst={index === 0}
									isLast={index === pagesList.length - 1}
									onToggleSelect={() => toggleSelectPage(index)}
									onRotate={(delta) => rotateSinglePage(index, delta)}
									onToggleDelete={() => {}}
									onPreview={() => openPreviewModal(index)}
									onMove={(dir) => movePage(index, dir)}
								/>
							{/each}
						</div>
					{:else if splitMode === 'range'}
						<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
							<div>
								<label for="splitRangeInput" class="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
									Format Rentang Halaman
								</label>
								<div class="flex flex-col sm:flex-row gap-3">
									<input
										id="splitRangeInput"
										type="text"
										bind:value={splitRangeInput}
										placeholder="contoh: 1-2, 3-5, 6"
										class="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
									/>
									<Button
										variant="primary"
										loading={isProcessingSplit}
										onclick={handleSplitByRanges}
									>
										<span>Proses & Buat Bagian PDF</span>
									</Button>
								</div>
								<p class="text-[11px] text-slate-400 mt-1.5">
									Pisahkan tiap bagian dengan tanda koma. Gunakan strip untuk rentang (misal: <code>1-3, 4, 5-7</code>). Dokumen memiliki {totalOriginalPages} halaman.
								</p>
							</div>

							<!-- Contoh Cepat -->
							<div class="flex items-center gap-2 text-xs text-slate-500">
								<span>Pola Cepat:</span>
								<button
									type="button"
									onclick={() => (splitRangeInput = '1, 2-' + totalOriginalPages)}
									class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition"
								>
									Hal 1 & Sisa
								</button>
								<button
									type="button"
									onclick={() => (splitRangeInput = '1-2, 3-' + totalOriginalPages)}
									class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition"
								>
									Hal 1-2 & Sisa
								</button>
							</div>
						</div>
					{:else if splitMode === 'single'}
						<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-center space-y-4">
							<p class="text-sm text-slate-600 dark:text-slate-300">
								Fitur ini akan memecah file dokumen menjadi <strong>{totalOriginalPages} file PDF</strong> terpisah (1 lembar per file).
							</p>
							<Button
								variant="primary"
								loading={isProcessingSplit}
								onclick={handleSplitEverySinglePage}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
								<span>Mulai Pisahkan Semua ({totalOriginalPages}) Halaman</span>
							</Button>
						</div>
					{/if}

					<!-- Hasil Pemisahan Dokumen (Daftar File Siap Diunduh) -->
					{#if splitResults.length > 0}
						<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
							<div class="flex items-center justify-between">
								<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
									<span>Daftar File Hasil Pemisahan ({splitResults.length} Dokumen)</span>
								</h3>

								<button
									type="button"
									onclick={() => {
										splitResults.forEach((res) => downloadPdf(res.bytes, res.name));
										toast.success(`Mengunduh ${splitResults.length} file...`);
									}}
									class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
									<span>Unduh Semua File Sekaligus</span>
								</button>
							</div>

							<div class="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
								{#each splitResults as result, idx}
									<div class="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
										<div class="flex items-center gap-3">
											<div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
												{idx + 1}
											</div>
											<div>
												<p class="text-xs font-semibold text-slate-800 dark:text-slate-200">
													{result.name}
												</p>
												<p class="text-[11px] text-slate-400">
													{result.rangeLabel} • {result.pageCount} Halaman • {formatBytes(result.bytes.length)}
												</p>
											</div>
										</div>

										<button
											type="button"
											onclick={() => downloadPdf(result.bytes, result.name)}
											class="px-3 py-1.5 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition flex items-center gap-1"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
											<span>Unduh File</span>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}

	<!-- ======================================================== -->
	<!-- TAB 5: GABUNG DOKUMEN PDF (MERGE) -->
	<!-- ======================================================== -->
	{#if activeTab === 'merge'}
		<div class="space-y-6">
			<!-- Dropzone Multi-File -->
			<div
				ondrop={handleDropMerge}
				ondragover={(e) => e.preventDefault()}
				class="relative flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800 rounded-2xl transition group text-center cursor-pointer"
			>
				<input
					type="file"
					multiple
					accept="application/pdf"
					onchange={(e) => handleAddMergeFiles(e.target.files)}
					class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				/>

				<div class="w-14 h-14 mb-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/></svg>
				</div>

				<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
					Tarik & Lepas Beberapa File PDF ke Sini
				</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">
					Pilih 2 atau lebih file PDF sekaligus untuk digabungkan menjadi satu dokumen berurutan.
				</p>

				<button
					type="button"
					class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition pointer-events-none"
				>
					+ Tambah File PDF
				</button>
			</div>

			<!-- Daftar File yang Akan Digabung -->
			{#if mergeFiles.length > 0}
				<div class="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">
								Urutan Dokumen yang Akan Digabung ({mergeFiles.length} File)
							</h3>
							<p class="text-xs text-slate-400 mt-0.5">
								Gunakan tombol panah naik/turun untuk mengatur urutan susunan file pada hasil gabungan.
							</p>
						</div>

						<button
							type="button"
							onclick={() => (mergeFiles = [])}
							class="text-xs text-red-600 hover:underline self-start sm:self-auto"
						>
							Kosongkan Daftar
						</button>
					</div>

					<!-- List Reorderable -->
					<div class="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
						{#each mergeFiles as file, idx (file.id)}
							<div class="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition">
								<div class="flex items-center gap-3">
									<div class="flex flex-col items-center gap-1">
										<button
											type="button"
											disabled={idx === 0}
											onclick={() => moveMergeFile(idx, -1)}
											title="Pindah ke Atas"
											class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
										</button>
										<span class="text-[10px] font-bold text-slate-500 w-4 text-center">{idx + 1}</span>
										<button
											type="button"
											disabled={idx === mergeFiles.length - 1}
											onclick={() => moveMergeFile(idx, 1)}
											title="Pindah ke Bawah"
											class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
										</button>
									</div>

									<div>
										<p class="text-xs font-bold text-slate-800 dark:text-slate-200">
											{file.name}
										</p>
										<p class="text-[11px] text-slate-400">
											{file.pageCount} Halaman • {formatBytes(file.size)}
										</p>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => removeMergeFile(idx)}
										title="Hapus dari daftar"
										class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
									</button>
								</div>
							</div>
						{/each}
					</div>

					<!-- Form Output & Tombol Gabungkan -->
					<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
						<div class="flex items-center gap-2 w-full sm:w-auto">
							<label for="mergeOutputName" class="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
								Nama File Hasil:
							</label>
							<input
								id="mergeOutputName"
								type="text"
								bind:value={mergeOutputName}
								placeholder="dokumen_gabungan.pdf"
								class="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
							/>
						</div>

						<Button
							variant="primary"
							disabled={mergeFiles.length < 2}
							loading={isProcessingMerge}
							onclick={handleExecuteMerge}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/></svg>
							<span>Gabungkan ({mergeFiles.length}) File Menjadi 1 PDF</span>
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Fullscreen Pratinjau Halaman Resolusi Tinggi -->
<PdfPreviewModal
	isOpen={isPreviewOpen}
	pdfDoc={pdfJsDoc}
	pageNumber={previewPageNumber}
	totalPages={totalOriginalPages}
	rotation={previewRotation}
	onClose={() => (isPreviewOpen = false)}
	onRotate={handlePreviewRotate}
	onPageChange={handlePreviewPageChange}
/>
