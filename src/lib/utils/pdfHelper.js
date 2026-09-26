/**
 * Helper Utilitas Dokumen PDF (Client-side)
 * Menggunakan pdf-lib untuk manipulasi file dan pdfjs-dist untuk render canvas di browser.
 * Seluruh pemrosesan dilakukan 100% di browser tanpa mengirim data ke server.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Setup worker PDF.js lokal via standard URL resolution
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
	try {
		pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
			'pdfjs-dist/build/pdf.worker.min.mjs',
			import.meta.url
		).href;
	} catch {
		pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
	}
}

/**
 * Membaca File atau Blob menjadi Uint8Array
 * @param {File|Blob} file
 * @returns {Promise<Uint8Array>}
 */
export async function fileToUint8Array(file) {
	const arrayBuffer = await file.arrayBuffer();
	return new Uint8Array(arrayBuffer);
}

/**
 * Memuat dokumen PDF untuk rendering dengan PDF.js
 * @param {Uint8Array} bytes
 * @returns {Promise<any>}
 */
export async function loadPdfJsDocument(bytes) {
	// Kloning Uint8Array agar buffer asli tidak ter-detach/dikosongkan oleh Web Worker PDF.js
	const dataCopy = bytes instanceof Uint8Array ? bytes.slice(0) : new Uint8Array(bytes).slice(0);
	const loadingTask = pdfjsLib.getDocument({
		data: dataCopy,
		cMapUrl: 'https://unpkg.com/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
		cMapPacked: true
	});
	return await loadingTask.promise;
}

/**
 * Merender satu halaman PDF ke elemen canvas HTML5
 * @param {any} pdfDoc Objek PDF dari pdfjsLib
 * @param {number} pageNumber Nomor halaman (1-based)
 * @param {HTMLCanvasElement} canvas Elemen canvas target
 * @param {number} targetWidth Lebar tampilan yang diinginkan (pixel)
 * @param {number} extraRotation Derajat rotasi tambahan (0, 90, 180, 270)
 * @returns {Promise<void>}
 */
export async function renderPageThumbnail(pdfDoc, pageNumber, canvas, targetWidth = 240, extraRotation = 0) {
	if (!canvas || !pdfDoc) return;

	// Batalkan tugas render sebelumnya pada canvas ini jika masih berjalan
	if (canvas._renderTask) {
		try {
			canvas._renderTask.cancel();
		} catch (_) {}
	}

	const page = await pdfDoc.getPage(pageNumber);

	// Hitung rotasi total (rotasi bawaan PDF + rotasi interaktif dari user)
	const totalRotation = ((page.rotate || 0) + extraRotation) % 360;
	const initialViewport = page.getViewport({ scale: 1, rotation: totalRotation });

	// Hitung skala agar pas dengan targetWidth
	const scale = targetWidth / initialViewport.width;
	const viewport = page.getViewport({ scale, rotation: totalRotation });

	// Atur resolusi canvas dengan mempertimbangkan devicePixelRatio untuk tampilan tajam
	const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
	canvas.width = Math.floor(viewport.width * pixelRatio);
	canvas.height = Math.floor(viewport.height * pixelRatio);
	canvas.style.width = `${Math.floor(viewport.width)}px`;
	canvas.style.height = `${Math.floor(viewport.height)}px`;

	const ctx = canvas.getContext('2d');
	ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

	const renderContext = {
		canvasContext: ctx,
		viewport: viewport
	};

	const renderTask = page.render(renderContext);
	canvas._renderTask = renderTask;

	try {
		await renderTask.promise;
	} catch (err) {
		if (err?.name === 'RenderingCancelledException') {
			return; // Pembatalan normal saat re-render cepat
		}
		throw err;
	} finally {
		if (canvas._renderTask === renderTask) {
			canvas._renderTask = null;
		}
	}
}

/**
 * Menerapkan rotasi dan menghapus halaman yang tidak diinginkan dari PDF
 * @param {Uint8Array} originalBytes File PDF asli
 * @param {number[]} pageIndicesToRemove Array indeks halaman yang dihapus (0-based)
 * @param {Record<number, number>} pageRotationsMap Peta rotasi tambahan per halaman { [pageIndex]: derajat }
 * @returns {Promise<Uint8Array>}
 */
export async function processPdfPages(originalBytes, pageIndicesToRemove = [], pageRotationsMap = {}) {
	const srcDoc = await PDFDocument.load(originalBytes);
	const totalPages = srcDoc.getPageCount();

	// Tentukan indeks halaman yang tetap dipertahankan
	const removeSet = new Set(pageIndicesToRemove);
	const keepIndices = [];
	for (let i = 0; i < totalPages; i++) {
		if (!removeSet.has(i)) {
			keepIndices.push(i);
		}
	}

	if (keepIndices.length === 0) {
		throw new Error('Semua halaman telah dihapus. Minimal satu halaman harus tersisa.');
	}

	// Buat dokumen baru dan salin halaman yang dipertahankan
	const newDoc = await PDFDocument.create();
	const copiedPages = await newDoc.copyPages(srcDoc, keepIndices);

	for (let i = 0; i < keepIndices.length; i++) {
		const originalIndex = keepIndices[i];
		const page = copiedPages[i];
		const addedRotation = pageRotationsMap[originalIndex] || 0;

		if (addedRotation !== 0) {
			const currentAngle = page.getRotation().angle || 0;
			const newAngle = (currentAngle + addedRotation + 360) % 360;
			page.setRotation(degrees(newAngle));
		}

		newDoc.addPage(page);
	}

	return await newDoc.save();
}

/**
 * Mengekstrak kumpulan halaman tertentu menjadi dokumen PDF baru
 * @param {Uint8Array} originalBytes
 * @param {number[]} pageIndicesToExtract Array indeks halaman yang ingin diekstrak (0-based)
 * @param {Record<number, number>} pageRotationsMap Peta rotasi per halaman
 * @returns {Promise<Uint8Array>}
 */
export async function extractPdfPages(originalBytes, pageIndicesToExtract, pageRotationsMap = {}) {
	if (!pageIndicesToExtract || pageIndicesToExtract.length === 0) {
		throw new Error('Pilih minimal satu halaman untuk diekstrak.');
	}

	const srcDoc = await PDFDocument.load(originalBytes);
	const newDoc = await PDFDocument.create();
	const copiedPages = await newDoc.copyPages(srcDoc, pageIndicesToExtract);

	for (let i = 0; i < pageIndicesToExtract.length; i++) {
		const originalIndex = pageIndicesToExtract[i];
		const page = copiedPages[i];
		const addedRotation = pageRotationsMap[originalIndex] || 0;

		if (addedRotation !== 0) {
			const currentAngle = page.getRotation().angle || 0;
			const newAngle = (currentAngle + addedRotation + 360) % 360;
			page.setRotation(degrees(newAngle));
		}

		newDoc.addPage(page);
	}

	return await newDoc.save();
}

/**
 * Menggabungkan beberapa dokumen PDF menjadi satu dokumen utuh
 * @param {Array<{ bytes: Uint8Array, name: string }>} filesList
 * @returns {Promise<Uint8Array>}
 */
export async function mergePdfFiles(filesList) {
	if (!filesList || filesList.length < 2) {
		throw new Error('Pilih minimal 2 file PDF untuk digabungkan.');
	}

	const mergedDoc = await PDFDocument.create();

	for (const file of filesList) {
		const srcDoc = await PDFDocument.load(file.bytes);
		const pageCount = srcDoc.getPageCount();
		const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
		const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);

		for (const page of copiedPages) {
			mergedDoc.addPage(page);
		}
	}

	return await mergedDoc.save();
}

/**
 * Memecah dokumen PDF berdasarkan pola rentang halaman string (contoh: "1-3, 4, 5-7")
 * @param {Uint8Array} originalBytes
 * @param {string} rangesString Pola rentang
 * @param {string} baseName Nama dasar file
 * @returns {Promise<Array<{ name: string, bytes: Uint8Array, pageCount: number, rangeLabel: string }>>}
 */
export async function splitPdfByRanges(originalBytes, rangesString, baseName = 'dokumen') {
	const srcDoc = await PDFDocument.load(originalBytes);
	const totalPages = srcDoc.getPageCount();

	// Parse string seperti "1-3, 5, 8-10"
	const rawParts = rangesString.split(',').map((p) => p.trim()).filter(Boolean);
	if (rawParts.length === 0) {
		throw new Error('Format rentang halaman tidak valid.');
	}

	const results = [];
	const cleanBaseName = baseName.replace(/\.pdf$/i, '');

	for (let partIndex = 0; partIndex < rawParts.length; partIndex++) {
		const part = rawParts[partIndex];
		const indicesToInclude = [];

		if (part.includes('-')) {
			const [startStr, endStr] = part.split('-');
			const start = parseInt(startStr, 10);
			const end = parseInt(endStr, 10);

			if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
				throw new Error(`Rentang "${part}" tidak valid. Dokumen memiliki ${totalPages} halaman.`);
			}

			for (let p = start; p <= end; p++) {
				indicesToInclude.push(p - 1);
			}
		} else {
			const pageNum = parseInt(part, 10);
			if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
				throw new Error(`Halaman "${part}" tidak valid. Dokumen memiliki ${totalPages} halaman.`);
			}
			indicesToInclude.push(pageNum - 1);
		}

		if (indicesToInclude.length > 0) {
			const partDoc = await PDFDocument.create();
			const copiedPages = await partDoc.copyPages(srcDoc, indicesToInclude);
			copiedPages.forEach((pg) => partDoc.addPage(pg));
			const partBytes = await partDoc.save();

			results.push({
				name: `${cleanBaseName}_bagian_${partIndex + 1}_(hal_${part.replace(/\s+/g, '')}).pdf`,
				bytes: partBytes,
				pageCount: indicesToInclude.length,
				rangeLabel: `Halaman ${part}`
			});
		}
	}

	return results;
}

/**
 * Membantu trigger download file PDF di browser
 * @param {Uint8Array} bytes
 * @param {string} filename
 */
export function downloadPdf(bytes, filename = 'dokumen_hasil.pdf') {
	const blob = new Blob([bytes], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format ukuran file ke format terbaca (KB, MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Memutar semua halaman atau halaman dengan filter tertentu (semua, ganjil, genap)
 * @param {Uint8Array} originalBytes File PDF asli
 * @param {number} angle Derajat rotasi (90, 180, 270)
 * @param {'all'|'odd'|'even'} mode Mode pemilihan halaman
 * @returns {Promise<Uint8Array>}
 */
export async function rotatePdfDocument(originalBytes, angle, mode = 'all') {
	const doc = await PDFDocument.load(originalBytes);
	const totalPages = doc.getPageCount();

	for (let i = 0; i < totalPages; i++) {
		const isOdd = (i + 1) % 2 !== 0;
		const isEven = (i + 1) % 2 === 0;

		if (mode === 'all' || (mode === 'odd' && isOdd) || (mode === 'even' && isEven)) {
			const page = doc.getPage(i);
			const currentAngle = page.getRotation().angle || 0;
			page.setRotation(degrees((currentAngle + angle + 360) % 360));
		}
	}

	return await doc.save();
}

/**
 * Mengompresi dokumen PDF di browser dengan merender halaman ke canvas
 * pada resolusi optimal dan kompresi JPEG serta stream PDF.
 * Sangat efektif untuk dokumen hasil scan kepegawaian (SK, Ijazah, Penilaian)
 * agar muat dalam batas unggah BKN / SIASN (<1MB).
 *
 * @param {any} pdfJsDoc Objek dokumen PDF dari PDF.js
 * @param {object} options Opsi kompresi
 * @param {'low'|'medium'|'high'} [options.level='medium'] Tingkat kompresi
 * @param {(current: number, total: number) => void} [onProgress] Callback progres per halaman
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdfDocument(pdfJsDoc, options = {}, onProgress = null) {
	const { level = 'medium' } = options;

	// Konfigurasi DPI dan kualitas JPEG agar teks dokumen tetap tajam dan tidak blur
	// Standar PDF: 1 inci = 72 point.
	// 72 DPI (scale 1.0) menghasilkan 595x842 px (buram/pecah).
	// 150-180 DPI menghasilkan 1240x1750 px (teks tajam, stempel terbaca jelas, ukuran hemat).
	let targetDpi = 150; // default medium: 150 DPI
	let quality = 0.76;

	if (level === 'low') {
		targetDpi = 180; // Kualitas tinggi: 180 DPI (~1488x2105 px untuk A4)
		quality = 0.84;
	} else if (level === 'high') {
		targetDpi = 130; // Kompresi maksimal: 130 DPI (~1080x1520 px untuk A4)
		quality = 0.62;
	}

	const renderScale = targetDpi / 72; // Rasio skala dari 72 DPI bawaan PDF
	const totalPages = pdfJsDoc.numPages;
	const newDoc = await PDFDocument.create();

	for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
		if (onProgress) {
			onProgress(pageNum, totalPages);
		}

		const page = await pdfJsDoc.getPage(pageNum);
		const rotation = page.rotate || 0;
		const baseViewport = page.getViewport({ scale: 1, rotation });

		// Render viewport dengan skala DPI tinggi agar teks tidak kabur
		const viewport = page.getViewport({ scale: renderScale, rotation });

		// Render ke offscreen canvas resolusi tinggi
		const canvas = document.createElement('canvas');
		canvas.width = Math.floor(viewport.width);
		canvas.height = Math.floor(viewport.height);

		const ctx = canvas.getContext('2d', { alpha: false });
		if (ctx) {
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';
		}

		await page.render({ canvasContext: ctx, viewport }).promise;

		// Konversi canvas ke JPEG blob terkompresi dengan kualitas terjaga
		const jpegBlob = await new Promise((resolve) => {
			canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
		});

		const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
		const embeddedImage = await newDoc.embedJpg(jpegBytes);

		// Masukkan ke PDF baru dengan ukuran fisik halaman asli (poin PDF)
		const newPage = newDoc.addPage([baseViewport.width, baseViewport.height]);
		newPage.drawImage(embeddedImage, {
			x: 0,
			y: 0,
			width: baseViewport.width,
			height: baseViewport.height
		});
	}

	return await newDoc.save({ useObjectStreams: true });
}

