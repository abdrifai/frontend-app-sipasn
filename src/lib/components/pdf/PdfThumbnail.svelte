<script>
	import { onMount } from 'svelte';
	import { renderPageThumbnail } from '$lib/utils/pdfHelper.js';

	let {
		pdfDoc = null,
		pdfJsDoc = null,
		pageNumber = 1, // 1-based original page index
		displayIndex = 1, // 1-based current sequence position
		rotation = 0,
		isSelected = false,
		isDeleted = false,
		isFirst = false,
		isLast = false,
		onToggleSelect = () => {},
		onRotate = (delta) => {},
		onToggleDelete = () => {},
		onPreview = () => {},
		onMove = (direction) => {}
	} = $props();

	let activeDoc = $derived(pdfDoc || pdfJsDoc);
	let canvasEl = $state(null);
	let isRendering = $state(true);
	let renderError = $state(null);

	$effect(() => {
		const doc = activeDoc;
		const el = canvasEl;
		const num = pageNumber;
		const rot = rotation;

		if (doc && el && num) {
			render(doc, num, el, rot);
		}
	});

	async function render(d, n, canvas, rot) {
		isRendering = true;
		renderError = null;
		try {
			await renderPageThumbnail(d, n, canvas, 220, rot);
		} catch (err) {
			renderError = err?.message || 'Gagal memuat';
		} finally {
			isRendering = false;
		}
	}
</script>

<div
	class="group relative flex flex-col bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md
		{isDeleted
			? 'border-red-300 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20 opacity-60'
			: isSelected
				? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10'
				: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}"
>
	<!-- Top Bar Card: Checkbox, Badge Halaman, & Status -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/80">
		<label class="flex items-center gap-2 cursor-pointer select-none">
			<input
				type="checkbox"
				checked={isSelected}
				disabled={isDeleted}
				onchange={onToggleSelect}
				class="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
			/>
			<span class="text-xs font-bold text-slate-700 dark:text-slate-200">
				Hal {pageNumber}
			</span>
		</label>

		<div class="flex items-center gap-1">
			{#if rotation !== 0}
				<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
					{rotation}°
				</span>
			{/if}

			{#if isDeleted}
				<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
					Dihapus
				</span>
			{/if}
		</div>
	</div>

	<!-- Area Visual Canvas Thumbnail -->
	<div class="relative flex-1 flex items-center justify-center p-3 min-h-[220px] bg-slate-50/30 dark:bg-slate-900/40 overflow-hidden">
		{#if isRendering}
			<div class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-800/70 z-10">
				<span class="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
			</div>
		{:else if renderError}
			<div class="absolute inset-0 flex flex-col items-center justify-center p-3 bg-red-50/90 dark:bg-red-950/90 z-10 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 mb-1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				<span class="text-xs text-red-600 font-semibold">Gagal memuat pratinjau</span>
				<span class="text-[10px] text-red-400 max-w-[150px] truncate">{renderError}</span>
				<button
					type="button"
					onclick={() => render(activeDoc, pageNumber, canvasEl, rotation)}
					class="mt-2 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 underline"
				>
					Coba Lagi
				</button>
			</div>
		{/if}

		<div class="shadow-sm border border-slate-200/80 dark:border-slate-700/60 bg-white rounded overflow-hidden">
			<canvas bind:this={canvasEl} class="block mx-auto max-w-full h-auto object-contain"></canvas>
		</div>

		{#if isDeleted}
			<div class="absolute inset-0 bg-red-900/10 backdrop-blur-[1px] flex items-center justify-center z-5">
				<div class="bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					Akan Dihapus
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom Action Toolbar -->
	<div class="flex items-center justify-between p-1.5 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
		<!-- Move Order Buttons -->
		<div class="flex items-center">
			<button
				type="button"
				disabled={isFirst || isDeleted}
				onclick={() => onMove(-1)}
				title="Geser Halaman ke Kiri"
				class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
			</button>
			<button
				type="button"
				disabled={isLast || isDeleted}
				onclick={() => onMove(1)}
				title="Geser Halaman ke Kiri"
				class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
			</button>
		</div>

		<!-- Tools: Rotate, Zoom, Delete/Restore -->
		<div class="flex items-center gap-0.5">
			<!-- Putar Kiri -->
			<button
				type="button"
				onclick={() => onRotate(-90)}
				title="Putar 90° Berlawanan Arah Jarum Jam"
				class="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
			</button>

			<!-- Putar Kanan -->
			<button
				type="button"
				onclick={() => onRotate(90)}
				title="Putar 90° Searah Jarum Jam"
				class="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
			</button>

			<!-- Zoom Preview -->
			<button
				type="button"
				onclick={onPreview}
				title="Perbesar Pratinjau Halaman"
				class="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>

			<!-- Hapus / Urungkan -->
			{#if isDeleted}
				<button
					type="button"
					onclick={onToggleDelete}
					title="Batalkan Hapus Halaman Ini"
					class="p-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
				</button>
			{:else}
				<button
					type="button"
					onclick={onToggleDelete}
					title="Hapus Halaman Ini"
					class="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
				</button>
			{/if}
		</div>
	</div>
</div>
