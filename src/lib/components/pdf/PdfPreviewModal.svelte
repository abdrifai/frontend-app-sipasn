<script>
	import { onMount } from 'svelte';
	import { renderPageThumbnail } from '$lib/utils/pdfHelper.js';

	let {
		isOpen = false,
		pdfDoc = null,
		pageNumber = 1,
		totalPages = 1,
		rotation = 0,
		onClose = () => {},
		onRotate = (delta) => {},
		onPageChange = (pageNum) => {}
	} = $props();

	let canvasEl = $state(null);
	let isRendering = $state(false);
	// Tampilan: 'fit' (Muat Tinggi Layar - seluruh atas-bawah terlihat), 'zoom' (Ukuran Besar/Bebas Scroll)
	let viewMode = $state('fit');
	let zoomLevel = $state(1.0); // 1.0, 1.25, 1.5, 1.75, 2.0

	$effect(() => {
		if (isOpen && pdfDoc && canvasEl && pageNumber) {
			// Trigger render saat dokumen, halaman, rotasi, atau mode tampilan berubah
			const rot = rotation;
			const p = pageNumber;
			const vm = viewMode;
			const zl = zoomLevel;
			renderPreview(rot, vm, zl);
		}
	});

	async function renderPreview(rot, vm, zl) {
		if (!pdfDoc || !canvasEl) return;
		isRendering = true;
		try {
			// Render dengan target width 900px untuk resolusi internal yang sangat tajam
			await renderPageThumbnail(pdfDoc, pageNumber, canvasEl, 900, rot);

			// Sesuaikan CSS canvas agar tidak terpotong di atas maupun bawah pada dokumen vertikal
			if (vm === 'fit') {
				canvasEl.style.maxHeight = '68vh';
				canvasEl.style.maxWidth = '100%';
				canvasEl.style.width = 'auto';
				canvasEl.style.height = 'auto';
			} else {
				canvasEl.style.maxHeight = 'none';
				canvasEl.style.maxWidth = 'none';
				const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
				const displayWidth = Math.round((canvasEl.width / pixelRatio) * (zl || 1.0));
				canvasEl.style.width = `${displayWidth}px`;
				canvasEl.style.height = 'auto';
			}
		} catch (err) {
			// Abaikan error render task yang dibatalkan
		} finally {
			isRendering = false;
		}
	}

	function handleZoomIn() {
		viewMode = 'zoom';
		zoomLevel = Math.min(2.5, +(zoomLevel + 0.25).toFixed(2));
	}

	function handleZoomOut() {
		if (zoomLevel <= 1.0) {
			viewMode = 'fit';
			zoomLevel = 1.0;
		} else {
			zoomLevel = Math.max(0.75, +(zoomLevel - 0.25).toFixed(2));
		}
	}

	function toggleFitMode() {
		if (viewMode === 'fit') {
			viewMode = 'zoom';
			zoomLevel = 1.0;
		} else {
			viewMode = 'fit';
			zoomLevel = 1.0;
		}
	}

	function handleKeyDown(e) {
		if (!isOpen) return;
		if (e.key === 'Escape') onClose();
		if (e.key === 'ArrowLeft' && pageNumber > 1) onPageChange(pageNumber - 1);
		if (e.key === 'ArrowRight' && pageNumber < totalPages) onPageChange(pageNumber + 1);
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
		<div class="relative flex flex-col max-h-[95vh] w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
			<!-- Header Modal -->
			<div class="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 gap-3">
				<!-- Judul & Status Halaman -->
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
						{pageNumber}
					</div>
					<div>
						<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Pratinjau Halaman Dokumen</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400">
							Halaman {pageNumber} dari {totalPages} {rotation ? `• Rotasi: ${rotation}°` : ''}
						</p>
					</div>
				</div>

				<!-- Kontrol Header (Zoom, Muat Layar, Rotasi & Tutup) -->
				<div class="flex items-center gap-2">
					<!-- Zoom & Fit Controls -->
					<div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
						<button
							type="button"
							class="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1"
							title={viewMode === 'fit' ? 'Ubah ke Ukuran Penuh' : 'Pas dengan Tinggi Layar'}
							onclick={toggleFitMode}
						>
							{#if viewMode === 'fit'}
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
								<span>Muat Layar</span>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
								<span>{Math.round(zoomLevel * 100)}%</span>
							{/if}
						</button>

						<div class="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>

						<button
							type="button"
							class="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
							title="Perkecil (-)"
							onclick={handleZoomOut}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
						</button>

						<div class="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>

						<button
							type="button"
							class="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
							title="Perbesar (+)"
							onclick={handleZoomIn}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
						</button>
					</div>

					<!-- Kontrol Rotasi -->
					<div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
						<button
							type="button"
							class="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1"
							title="Putar 90° Berlawanan Jarum Jam"
							onclick={() => onRotate(-90)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
							<span class="hidden sm:inline">-90°</span>
						</button>
						<div class="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
						<button
							type="button"
							class="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1"
							title="Putar 90° Searah Jarum Jam"
							onclick={() => onRotate(90)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
							<span class="hidden sm:inline">+90°</span>
						</button>
					</div>

					<!-- Tombol Tutup -->
					<button
						type="button"
						class="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
						onclick={onClose}
						title="Tutup (Esc)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>

			<!-- Canvas Body Viewport (Bebas terpotong, scroll lancar dari atas ke bawah) -->
			<div class="relative flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 flex flex-col items-center justify-start min-h-[350px]">
				{#if isRendering}
					<div class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-10">
						<div class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
							<span class="animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
							<span>Merender pratinjau...</span>
						</div>
					</div>
				{/if}

				<!-- Container Card Canvas dengan my-auto agar center jika kecil dan scrollable dari puncak jika tinggi -->
				<div class="shadow-2xl rounded-lg border border-slate-200 dark:border-slate-800 bg-white inline-flex items-center justify-center my-auto shrink-0 transition-all duration-200">
					<canvas bind:this={canvasEl} class="block mx-auto object-contain"></canvas>
				</div>
			</div>

			<!-- Footer Navigasi Halaman -->
			<div class="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
				<button
					type="button"
					disabled={pageNumber <= 1}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
					onclick={() => onPageChange(pageNumber - 1)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
					Sebelumnya
				</button>

				<span class="text-xs text-slate-600 dark:text-slate-300 font-semibold">
					{pageNumber} dari {totalPages}
				</span>

				<button
					type="button"
					disabled={pageNumber >= totalPages}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
					onclick={() => onPageChange(pageNumber + 1)}
				>
					Berikutnya
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
				</button>
			</div>
		</div>
	</div>
{/if}
