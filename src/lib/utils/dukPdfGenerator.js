import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Sanitasi string agar kompatibel dengan standard WinAnsi font di pdf-lib
 * Mengganti dash, quote, ellipsis, dan karakter non-ASCII
 */
function sanitizeText(str) {
	if (!str) return '';
	return String(str)
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/[^\x20-\x7E]/g, ' ')
		.trim();
}

/**
 * Potong teks jika melebihi lebar maksimal dalam poin
 */
function truncateText(text, font, size, maxWidth) {
	const sanitized = sanitizeText(text);
	if (!sanitized) return '';
	const currentWidth = font.widthOfTextAtSize(sanitized, size);
	if (currentWidth <= maxWidth) return sanitized;

	let low = 0;
	let high = sanitized.length;
	let best = '';

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const candidate = sanitized.slice(0, mid) + '...';
		if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
			best = candidate;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return best;
}

/**
 * Pecah teks menjadi 1 atau 2 baris agar muat di kolom
 */
function wrapTextTwoLines(text, font, size, maxWidth) {
	const sanitized = sanitizeText(text);
	if (!sanitized) return [''];
	if (font.widthOfTextAtSize(sanitized, size) <= maxWidth) return [sanitized];

	const words = sanitized.split(' ');
	let line1 = '';
	let line2 = '';
	let line1Full = false;

	for (const word of words) {
		if (!line1Full) {
			const test = line1 ? `${line1} ${word}` : word;
			if (font.widthOfTextAtSize(test, size) <= maxWidth) {
				line1 = test;
			} else {
				line1Full = true;
				line2 = word;
			}
		} else {
			const test = line2 ? `${line2} ${word}` : word;
			if (font.widthOfTextAtSize(test, size) <= maxWidth) {
				line2 = test;
			} else {
				line2 = truncateText(test, font, size, maxWidth);
				break;
			}
		}
	}

	return line2 ? [line1, line2] : [line1];
}

/**
 * Membuat dokumen PDF Daftar Urut Kepangkatan (DUK)
 * @param {string} unorName Nama Unit Kerja / Organisasi
 * @param {Array} pegawaiList Daftar seluruh pegawai DUK
 * @param {Object} options Opsi penandatanganan dan tanggal cetak
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateDukPdfBlob(unorName = '', pegawaiList = [], options = {}) {
	const pdfDoc = await PDFDocument.create();

	// Dimensi A4 Landscape
	const pageWidth = 841.89;
	const pageHeight = 595.28;
	const marginLeft = 36;
	const marginRight = 36;
	const marginTop = 36;
	const marginBottom = 36;
	const contentWidth = pageWidth - marginLeft - marginRight; // 769.89 pt

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Cek apakah data memiliki informasi diklat
	const hasDiklat = options.includeDiklat || pegawaiList.some((p) => Boolean(p.diklat));

	// Definisi lebar kolom tabel (total = 769.89 pt)
	const colDefs = hasDiklat
		? [
				{ key: 'no', label: 'NO', width: 25, align: 'center' },
				{ key: 'nama_nip', label: 'NAMA / NIP', width: 145, align: 'left' },
				{ key: 'pangkat_gol', label: 'GOL / PANGKAT', width: 95, align: 'left' },
				{ key: 'jabatan', label: 'JABATAN', width: 135, align: 'left' },
				{ key: 'pendidikan', label: 'PENDIDIKAN', width: 120, align: 'left' },
				{ key: 'diklat', label: 'DIKLAT', width: 110, align: 'left' },
				{ key: 'unit_kerja', label: 'UNIT KERJA', width: 139.89, align: 'left' }
		  ]
		: [
				{ key: 'no', label: 'NO', width: 30, align: 'center' },
				{ key: 'nama_nip', label: 'NAMA / NIP', width: 165, align: 'left' },
				{ key: 'pangkat_gol', label: 'GOL / PANGKAT', width: 115, align: 'left' },
				{ key: 'jabatan', label: 'JABATAN', width: 165, align: 'left' },
				{ key: 'pendidikan', label: 'PENDIDIKAN', width: 135, align: 'left' },
				{ key: 'unit_kerja', label: 'UNIT KERJA', width: 159.89, align: 'left' }
		  ];

	const primaryColor = rgb(0.12, 0.16, 0.22); // dark slate
	const secondaryColor = rgb(0.4, 0.45, 0.5); // gray
	const borderColor = rgb(0.78, 0.82, 0.86); // table border
	const headerBgColor = rgb(0.93, 0.95, 0.98); // soft indigo-slate
	const altRowBgColor = rgb(0.985, 0.99, 1.0); // soft white-blue zebra

	const tanggalStr = options.tanggalCetak || new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	const tempatStr = options.tempat || 'Ampana';
	const jabatanTtd = options.penandatanganJabatan || 'Kepala Badan Kepegawaian dan Pengembangan SDM';
	const namaTtd = options.penandatanganNama || '';
	const nipTtd = options.penandatanganNip || '';

	let currentPage = null;
	let currentY = 0;
	let pageNumber = 0;
	const pages = [];

	// Helper membuat halaman baru
	function addNewPage(isFirstPage = false) {
		currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
		pages.push(currentPage);
		pageNumber++;
		currentY = pageHeight - marginTop;

		if (isFirstPage) {
			drawFirstPageHeader();
		} else {
			drawSubsequentPageHeader();
		}

		drawTableHeader();
	}

	// Header Kop Surat Lengkap di Halaman 1
	function drawFirstPageHeader() {
		const t1 = 'PEMERINTAH KABUPATEN TOJO UNA-UNA';
		const t2 = 'BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA';
		const t3 = 'DAFTAR URUT KEPANGKATAN (DUK) PEGAWAI NEGERI SIPIL';
		const t4 = `UNIT ORGANISASI: ${sanitizeText(unorName).toUpperCase() || 'SEMUA UNIT'}`;

		// Judul 1
		let w = helveticaBold.widthOfTextAtSize(t1, 11);
		currentPage.drawText(t1, {
			x: marginLeft + (contentWidth - w) / 2,
			y: currentY - 12,
			size: 11,
			font: helveticaBold,
			color: primaryColor
		});

		// Judul 2
		w = helveticaBold.widthOfTextAtSize(t2, 10);
		currentPage.drawText(t2, {
			x: marginLeft + (contentWidth - w) / 2,
			y: currentY - 26,
			size: 10,
			font: helveticaBold,
			color: primaryColor
		});

		// Judul 3
		w = helveticaBold.widthOfTextAtSize(t3, 10);
		currentPage.drawText(t3, {
			x: marginLeft + (contentWidth - w) / 2,
			y: currentY - 40,
			size: 10,
			font: helveticaBold,
			color: rgb(0.2, 0.3, 0.5)
		});

		// Judul 4 (Unit)
		w = helveticaBold.widthOfTextAtSize(t4, 9);
		currentPage.drawText(t4, {
			x: marginLeft + (contentWidth - w) / 2,
			y: currentY - 54,
			size: 9,
			font: helveticaBold,
			color: rgb(0.25, 0.25, 0.25)
		});

		// Garis Ganda Pembatas Kop Surat
		currentPage.drawLine({
			start: { x: marginLeft, y: currentY - 62 },
			end: { x: pageWidth - marginRight, y: currentY - 62 },
			thickness: 1.5,
			color: primaryColor
		});
		currentPage.drawLine({
			start: { x: marginLeft, y: currentY - 64.5 },
			end: { x: pageWidth - marginRight, y: currentY - 64.5 },
			thickness: 0.5,
			color: primaryColor
		});

		// Sub-informasi Tanggal & Total
		const infoLeft = `Keadaan: ${tanggalStr}`;
		const infoRight = `Total: ${pegawaiList.length} Pegawai`;

		currentPage.drawText(infoLeft, {
			x: marginLeft,
			y: currentY - 76,
			size: 8,
			font: helvetica,
			color: secondaryColor
		});

		const wRight = helveticaBold.widthOfTextAtSize(infoRight, 8);
		currentPage.drawText(infoRight, {
			x: pageWidth - marginRight - wRight,
			y: currentY - 76,
			size: 8,
			font: helveticaBold,
			color: primaryColor
		});

		currentY -= 84;
	}

	// Header Ringkas di Halaman Berikutnya
	function drawSubsequentPageHeader() {
		const headerText = `DAFTAR URUT KEPANGKATAN (DUK) PEGAWAI — ${truncateText(unorName, helveticaBold, 8, contentWidth - 120)}`;
		currentPage.drawText(headerText, {
			x: marginLeft,
			y: currentY - 10,
			size: 8,
			font: helveticaBold,
			color: secondaryColor
		});

		currentPage.drawLine({
			start: { x: marginLeft, y: currentY - 16 },
			end: { x: pageWidth - marginRight, y: currentY - 16 },
			thickness: 0.5,
			color: borderColor
		});

		currentY -= 22;
	}

	// Gambar Header Tabel
	function drawTableHeader() {
		const headerHeight = 22;

		// Background header
		currentPage.drawRectangle({
			x: marginLeft,
			y: currentY - headerHeight,
			width: contentWidth,
			height: headerHeight,
			color: headerBgColor,
			borderColor: borderColor,
			borderWidth: 1
		});

		let curX = marginLeft;
		for (const col of colDefs) {
			const label = col.label;
			const textWidth = helveticaBold.widthOfTextAtSize(label, 7.5);
			let tx = curX + 6;
			if (col.align === 'center') {
				tx = curX + (col.width - textWidth) / 2;
			}

			currentPage.drawText(label, {
				x: tx,
				y: currentY - 14,
				size: 7.5,
				font: helveticaBold,
				color: primaryColor
			});

			curX += col.width;
			// Vertical divider line
			if (curX < pageWidth - marginRight) {
				currentPage.drawLine({
					start: { x: curX, y: currentY },
					end: { x: curX, y: currentY - headerHeight },
					thickness: 0.5,
					color: borderColor
				});
			}
		}

		currentY -= headerHeight;
	}

	// Mulai Halaman Pertama
	addNewPage(true);

	const rowHeight = 25; // Tinggi baris data
	const minBottomMargin = marginBottom + 28;

	// Iterasi data pegawai
	for (let i = 0; i < pegawaiList.length; i++) {
		const p = pegawaiList[i];

		// Cek apakah muat di halaman ini, jika tidak buat halaman baru
		if (currentY - rowHeight < minBottomMargin) {
			addNewPage(false);
		}

		const isAlt = i % 2 === 1;
		if (isAlt) {
			currentPage.drawRectangle({
				x: marginLeft,
				y: currentY - rowHeight,
				width: contentWidth,
				height: rowHeight,
				color: altRowBgColor
			});
		}

		// Border luar baris
		currentPage.drawRectangle({
			x: marginLeft,
			y: currentY - rowHeight,
			width: contentWidth,
			height: rowHeight,
			borderColor: borderColor,
			borderWidth: 0.5
		});

		let curX = marginLeft;

		// 1. Kolom NO
		const noText = String(i + 1);
		const noWidth = helvetica.widthOfTextAtSize(noText, 7.5);
		currentPage.drawText(noText, {
			x: curX + (colDefs[0].width - noWidth) / 2,
			y: currentY - 15,
			size: 7.5,
			font: helvetica,
			color: secondaryColor
		});
		curX += colDefs[0].width;

		// Divider vertikal
		currentPage.drawLine({
			start: { x: curX, y: currentY },
			end: { x: curX, y: currentY - rowHeight },
			thickness: 0.5,
			color: borderColor
		});

		// 2. Kolom NAMA & NIP
		const namaText = truncateText(p.nama || '-', helveticaBold, 7.5, colDefs[1].width - 12);
		const nipText = sanitizeText(p.nip || '-');
		currentPage.drawText(namaText, {
			x: curX + 6,
			y: currentY - 11,
			size: 7.5,
			font: helveticaBold,
			color: primaryColor
		});
		currentPage.drawText(nipText, {
			x: curX + 6,
			y: currentY - 20,
			size: 6.5,
			font: helvetica,
			color: secondaryColor
		});
		curX += colDefs[1].width;

		// Divider vertikal
		currentPage.drawLine({
			start: { x: curX, y: currentY },
			end: { x: curX, y: currentY - rowHeight },
			thickness: 0.5,
			color: borderColor
		});

		// 3. Kolom PANGKAT / GOLONGAN & TMT
		const pangkatVal = p.pangkat_gol || p.golongan || '-';
		const tmtVal = p.tmt_gol || p.tmtGolongan || '-';
		const pangkatText = truncateText(pangkatVal, helveticaBold, 7, colDefs[2].width - 12);
		const tmtText = `TMT: ${sanitizeText(tmtVal)}`;
		currentPage.drawText(pangkatText, {
			x: curX + 6,
			y: currentY - 11,
			size: 7,
			font: helveticaBold,
			color: primaryColor
		});
		currentPage.drawText(tmtText, {
			x: curX + 6,
			y: currentY - 20,
			size: 6.5,
			font: helvetica,
			color: secondaryColor
		});
		curX += colDefs[2].width;

		// Divider vertikal
		currentPage.drawLine({
			start: { x: curX, y: currentY },
			end: { x: curX, y: currentY - rowHeight },
			thickness: 0.5,
			color: borderColor
		});

		// 4. Kolom JABATAN
		const jabatanLines = wrapTextTwoLines(p.jabatan || '-', helvetica, 7, colDefs[3].width - 12);
		if (jabatanLines.length === 1) {
			currentPage.drawText(jabatanLines[0], {
				x: curX + 6,
				y: currentY - 15,
				size: 7,
				font: helvetica,
				color: primaryColor
			});
		} else {
			currentPage.drawText(jabatanLines[0], {
				x: curX + 6,
				y: currentY - 11,
				size: 7,
				font: helvetica,
				color: primaryColor
			});
			currentPage.drawText(jabatanLines[1], {
				x: curX + 6,
				y: currentY - 20,
				size: 6.5,
				font: helvetica,
				color: primaryColor
			});
		}
		curX += colDefs[3].width;

		// Divider vertikal
		currentPage.drawLine({
			start: { x: curX, y: currentY },
			end: { x: curX, y: currentY - rowHeight },
			thickness: 0.5,
			color: borderColor
		});

		// 5. Kolom PENDIDIKAN
		const pendLines = wrapTextTwoLines(p.pendidikan || '-', helvetica, 7, colDefs[4].width - 12);
		if (pendLines.length === 1) {
			currentPage.drawText(pendLines[0], {
				x: curX + 6,
				y: currentY - 15,
				size: 7,
				font: helvetica,
				color: primaryColor
			});
		} else {
			currentPage.drawText(pendLines[0], {
				x: curX + 6,
				y: currentY - 11,
				size: 7,
				font: helvetica,
				color: primaryColor
			});
			currentPage.drawText(pendLines[1], {
				x: curX + 6,
				y: currentY - 20,
				size: 6.5,
				font: helvetica,
				color: secondaryColor
			});
		}
		curX += colDefs[4].width;

		// Divider vertikal
		currentPage.drawLine({
			start: { x: curX, y: currentY },
			end: { x: curX, y: currentY - rowHeight },
			thickness: 0.5,
			color: borderColor
		});

		// 6. Kolom DIKLAT (jika aktif)
		if (hasDiklat) {
			const diklatLines = wrapTextTwoLines(p.diklat || '-', helvetica, 7, colDefs[5].width - 12);
			if (diklatLines.length === 1) {
				currentPage.drawText(diklatLines[0], {
					x: curX + 6,
					y: currentY - 15,
					size: 7,
					font: helvetica,
					color: primaryColor
				});
			} else {
				currentPage.drawText(diklatLines[0], {
					x: curX + 6,
					y: currentY - 11,
					size: 7,
					font: helvetica,
					color: primaryColor
				});
				currentPage.drawText(diklatLines[1], {
					x: curX + 6,
					y: currentY - 20,
					size: 6.5,
					font: helvetica,
					color: secondaryColor
				});
			}
			curX += colDefs[5].width;

			// Divider vertikal
			currentPage.drawLine({
				start: { x: curX, y: currentY },
				end: { x: curX, y: currentY - rowHeight },
				thickness: 0.5,
				color: borderColor
			});
		}

		// 7. Kolom UNIT KERJA
		const unitKerjaColIndex = hasDiklat ? 6 : 5;
		const unitKerjaVal = p.unit_kerja || p.unitKerja || '-';
		const unitLines = wrapTextTwoLines(unitKerjaVal, helvetica, 7, colDefs[unitKerjaColIndex].width - 12);
		if (unitLines.length === 1) {
			currentPage.drawText(unitLines[0], {
				x: curX + 6,
				y: currentY - 15,
				size: 7,
				font: helvetica,
				color: secondaryColor
			});
		} else {
			currentPage.drawText(unitLines[0], {
				x: curX + 6,
				y: currentY - 11,
				size: 7,
				font: helvetica,
				color: secondaryColor
			});
			currentPage.drawText(unitLines[1], {
				x: curX + 6,
				y: currentY - 20,
				size: 6.5,
				font: helvetica,
				color: secondaryColor
			});
		}

		currentY -= rowHeight;
	}

	// Gambar Blok Tanda Tangan
	const signatureBlockHeight = 110;
	if (currentY - signatureBlockHeight < marginBottom + 20) {
		addNewPage(false);
	}

	currentY -= 20;
	const signWidth = 230;
	const signX = pageWidth - marginRight - signWidth;

	currentPage.drawText(`${tempatStr}, ${tanggalStr}`, {
		x: signX,
		y: currentY,
		size: 8,
		font: helvetica,
		color: primaryColor
	});

	currentPage.drawText('Mengetahui / Disahkan oleh:', {
		x: signX,
		y: currentY - 12,
		size: 8,
		font: helvetica,
		color: secondaryColor
	});

	const ttdJabatanLines = wrapTextTwoLines(jabatanTtd, helveticaBold, 8, signWidth);
	if (ttdJabatanLines.length === 1) {
		currentPage.drawText(ttdJabatanLines[0], {
			x: signX,
			y: currentY - 24,
			size: 8,
			font: helveticaBold,
			color: primaryColor
		});
	} else {
		currentPage.drawText(ttdJabatanLines[0], {
			x: signX,
			y: currentY - 24,
			size: 8,
			font: helveticaBold,
			color: primaryColor
		});
		currentPage.drawText(ttdJabatanLines[1], {
			x: signX,
			y: currentY - 35,
			size: 8,
			font: helveticaBold,
			color: primaryColor
		});
	}

	// Titik Tanda Tangan & Nama Pejabat
	const nameY = currentY - 78;
	const pejabNama = namaTtd ? namaTtd.toUpperCase() : '( .............................................................. )';
	currentPage.drawText(pejabNama, {
		x: signX,
		y: nameY,
		size: 8,
		font: helveticaBold,
		color: primaryColor
	});

	const pejabNip = nipTtd ? `NIP. ${nipTtd}` : 'NIP. .......................................................';
	currentPage.drawText(pejabNip, {
		x: signX,
		y: nameY - 12,
		size: 8,
		font: helvetica,
		color: secondaryColor
	});

	// Gambar Footer Nomor Halaman di Seluruh Halaman
	const totalPages = pages.length;
	for (let idx = 0; idx < totalPages; idx++) {
		const pg = pages[idx];
		const footerY = marginBottom - 12;

		pg.drawLine({
			start: { x: marginLeft, y: footerY + 8 },
			end: { x: pageWidth - marginRight, y: footerY + 8 },
			thickness: 0.5,
			color: borderColor
		});

		const footerLeft = 'SIPASN — Sistem Informasi Kepegawaian ASN Kab. Tojo Una-Una';
		pg.drawText(footerLeft, {
			x: marginLeft,
			y: footerY,
			size: 6.5,
			font: helvetica,
			color: secondaryColor
		});

		const footerRight = `Halaman ${idx + 1} dari ${totalPages}`;
		const wRight = helvetica.widthOfTextAtSize(footerRight, 6.5);
		pg.drawText(footerRight, {
			x: pageWidth - marginRight - wRight,
			y: footerY,
			size: 6.5,
			font: helvetica,
			color: secondaryColor
		});
	}

	const pdfBytes = await pdfDoc.save();
	const blob = new Blob([pdfBytes], { type: 'application/pdf' });
	const cleanName = sanitizeText(unorName).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) || 'DUK';
	const filename = `DUK_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;

	return { blob, filename };
}

/**
 * Memicu pengunduhan file PDF langsung di browser
 */
export async function downloadDukPdf(unorName = '', pegawaiList = [], options = {}) {
	const { blob, filename } = await generateDukPdfBlob(unorName, pegawaiList, options);
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
}

