<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	let {
		onPreviewPdf = (item) => {},
		onEditPeraturan = (item) => {}
	} = $props();

	let loading = $state(true);
	let error = $state(null);
	let hierarchyData = $state({ levels: [], dependencyRoots: [], links: [], totalPeraturan: 0 });

	// Controls
	let viewMode = $state('level'); // 'level' (Tata Urutan Hukum) atau 'dependency' (Silsilah Relasi)
	let selectedKategori = $state('');
	let searchKeyword = $state('');
	let zoomScale = $state(1);
	let expandedLevels = $state({
		UU: true,
		PP: true,
		PERPRES: true,
		PERMENPAN: true,
		PERDA: true,
		PERBUP: true,
		SK_SE: true
	});

	const KATEGORI_OPTIONS = [
		{ value: '', label: 'Semua Kategori' },
		{ value: 'SOTK', label: 'SOTK' },
		{ value: 'JABATAN', label: 'Jabatan' },
		{ value: 'KEPEGAWAIAN', label: 'Kepegawaian' },
		{ value: 'DISIPLIN_ETIKA', label: 'Disiplin & Etika' },
		{ value: 'PENGGAJIAN_KESEJAHTERAAN', label: 'Penggajian & KGB' },
		{ value: 'MUTASI_PROMOSI', label: 'Mutasi' },
		{ value: 'DIKLAT_PENGEMBANGAN', label: 'Diklat' },
		{ value: 'LAINNYA', label: 'Lainnya' }
	];

	async function loadHierarchyData() {
		loading = true;
		error = null;
		try {
			const res = await api(`/ref-peraturan/hierarchy-tree${selectedKategori ? `?kategori=${encodeURIComponent(selectedKategori)}` : ''}`);
			hierarchyData = res.data;
		} catch (err) {
			error = err.message || 'Gagal memuat data hierarki peraturan';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadHierarchyData();
	});

	function toggleLevel(key) {
		expandedLevels[key] = !expandedLevels[key];
	}

	function expandAll() {
		Object.keys(expandedLevels).forEach((k) => (expandedLevels[k] = true));
	}

	function collapseAll() {
		Object.keys(expandedLevels).forEach((k) => (expandedLevels[k] = false));
	}

	function zoomIn() {
		zoomScale = Math.min(1.4, Math.round((zoomScale + 0.1) * 10) / 10);
	}

	function zoomOut() {
		zoomScale = Math.max(0.7, Math.round((zoomScale - 0.1) * 10) / 10);
	}

	function resetZoom() {
		zoomScale = 1;
	}

	function isItemMatch(item) {
		if (!searchKeyword.trim()) return true;
		const q = searchKeyword.toLowerCase();
		return (
			(item.nomor_peraturan && item.nomor_peraturan.toLowerCase().includes(q)) ||
			(item.judul && item.judul.toLowerCase().includes(q)) ||
			(item.tentang && item.tentang.toLowerCase().includes(q)) ||
			(item.peraturan_terkait && item.peraturan_terkait.toLowerCase().includes(q))
		);
	}

	function formatTipeRelasiBadge(tipe, nomor) {
		if (!tipe && !nomor) return null;
		switch (tipe) {
			case 'MENCABUT':
				return { label: `Mencabut: ${nomor}`, color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200' };
			case 'MENGUBAH':
				return { label: `Mengubah: ${nomor}`, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200' };
			case 'DICABUT_OLEH':
				return { label: `Dicabut oleh: ${nomor}`, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200' };
			case 'DIUBAH_OLEH':
				return { label: `Diubah oleh: ${nomor}`, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200' };
			case 'DASAR_HUKUM':
				return { label: `Turunan dari: ${nomor}`, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200' };
			default:
				return { label: `Terkait: ${nomor}`, color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200' };
		}
	}
</script>

<div class="space-y-4">
	<!-- Toolbar Kontrol Mindmap -->
	<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
		<!-- Pilihan Mode Tampilan -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mode:</span>
			<div class="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-medium">
				<button
					type="button"
					onclick={() => viewMode = 'level'}
					class="px-3 py-1.5 rounded-md transition {viewMode === 'level' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}"
				>
					🌳 Tata Urutan Perundang-undangan
				</button>
				<button
					type="button"
					onclick={() => viewMode = 'dependency'}
					class="px-3 py-1.5 rounded-md transition {viewMode === 'dependency' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}"
				>
					🔗 Silsilah Keterkaitan Regulasi
				</button>
			</div>
		</div>

		<!-- Filter & Zoom Controls -->
		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Filter Kategori -->
			<select
				bind:value={selectedKategori}
				onchange={loadHierarchyData}
				class="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
			>
				{#each KATEGORI_OPTIONS as kat}
					<option value={kat.value}>{kat.label}</option>
				{/each}
			</select>

			<!-- Quick Search inside Mindmap -->
			<div class="relative">
				<input
					type="text"
					bind:value={searchKeyword}
					placeholder="Sorot kata kunci..."
					class="text-xs pl-7 pr-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none w-36 sm:w-44 focus:ring-2 focus:ring-emerald-500"
				/>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-zinc-400 absolute left-2 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>

			<!-- Expand / Collapse All -->
			<div class="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs">
				<button
					type="button"
					onclick={expandAll}
					title="Buka Seluruh Cabang"
					class="px-2.5 py-1.5 border-r border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
				>
					Buka Semua
				</button>
				<button
					type="button"
					onclick={collapseAll}
					title="Tutup Seluruh Cabang"
					class="px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
				>
					Tutup Semua
				</button>
			</div>

			<!-- Zoom Controls -->
			<div class="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs">
				<button
					type="button"
					onclick={zoomOut}
					title="Perkecil Tampilan"
					class="px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
				>
					-
				</button>
				<span class="px-2 font-mono text-[11px] text-zinc-500">
					{Math.round(zoomScale * 100)}%
				</span>
				<button
					type="button"
					onclick={zoomIn}
					title="Perbesar Tampilan"
					class="px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
				>
					+
				</button>
				<button
					type="button"
					onclick={resetZoom}
					title="Reset Zoom ke 100%"
					class="px-2 py-1.5 border-l border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 transition"
				>
					1:1
				</button>
			</div>
		</div>
	</div>

	<!-- Canvas Mindmap -->
	<div class="relative bg-zinc-50/70 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 min-h-[600px] overflow-auto shadow-inner transition-transform duration-200">
		{#if loading}
			<LoadingState message="Membuat graf pohon hierarki regulasi..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadHierarchyData} />
		{:else if hierarchyData.totalPeraturan === 0}
			<EmptyState
				message="Belum ada data arsip peraturan untuk membentuk pohon hierarki."
				icon="🌳"
			/>
		{:else}
			<div
				style="transform: scale({zoomScale}); transform-origin: top center; transition: transform 0.15s ease-out;"
				class="w-full flex flex-col items-center space-y-8 py-4"
			>
				<!-- ROOT NODE: Sistem Regulasi Kepegawaian -->
				<div class="relative flex flex-col items-center">
					<div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-xl shadow-emerald-500/10 border-2 border-white/20 text-center max-w-md w-full">
						<div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold tracking-wide uppercase mb-1.5">
							⚖️ Tata Urutan Perundang-Undangan
						</div>
						<h2 class="text-base sm:text-lg font-black tracking-tight leading-snug">
							Repositori Regulasi & Peraturan ASN
						</h2>
						<p class="text-xs text-white/80 mt-1">
							{hierarchyData.totalPeraturan} Dokumen Regulasi Terkatalogisasi
						</p>
					</div>

					<!-- Root Trunk Stem Line -->
					<div class="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-700"></div>
				</div>

				<!-- ================= MODE 1: TATA URUTAN TINGKAT HUKUM ================= -->
				{#if viewMode === 'level'}
					<div class="w-full max-w-5xl space-y-6">
						{#each hierarchyData.levels as level, lIdx}
							<div class="relative bg-white dark:bg-zinc-900 border {level.theme.border} rounded-2xl p-4 shadow-sm transition hover:shadow-md">
								<!-- Level Header Bar -->
								<div class="flex items-center justify-between gap-3">
									<div class="flex items-center gap-3">
										<!-- Rank Pill -->
										<span class="inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs {level.theme.badge} shadow-sm">
											{level.rank}
										</span>
										<div>
											<div class="flex items-center gap-2">
												<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
													{level.name}
												</h3>
												<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold {level.theme.bg} {level.theme.text}">
													{level.totalCount} Peraturan
												</span>
											</div>
											<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
												{level.desc}
											</p>
										</div>
									</div>

									<button
										type="button"
										onclick={() => toggleLevel(level.key)}
										class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
										title={expandedLevels[level.key] ? 'Tutup Daftar' : 'Buka Daftar'}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform transition-transform {expandedLevels[level.key] ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
								</div>

								<!-- Level Children / Regulations Grid -->
								{#if expandedLevels[level.key]}
									<div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
										{#if level.items.length === 0}
											<div class="py-4 text-center text-xs text-zinc-400 italic">
												Belum ada dokumen peraturan yang diunggah untuk tingkatan ini.
											</div>
										{:else}
											<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
												{#each level.items as item}
													{@const isMatched = isItemMatch(item)}
													{@const relBadge = formatTipeRelasiBadge(item.tipe_relasi, item.peraturan_terkait || item.peraturan_terkait_ref?.nomor_peraturan)}
													<div
														class="rounded-xl border p-3 flex flex-col justify-between gap-2 transition {isMatched ? 'bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80' : 'opacity-40 bg-zinc-100/50 dark:bg-zinc-900 border-dashed border-zinc-200'}"
													>
														<div>
															<!-- Badges Row -->
															<div class="flex items-center justify-between gap-1.5 flex-wrap mb-1.5">
																<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
																	{item.nomor_peraturan}
																</span>
																<div class="flex items-center gap-1">
																	<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
																		Tahun {item.tahun}
																	</span>
																	{#if item.status_berlaku === 'BERLAKU'}
																		<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
																			Berlaku
																		</span>
																	{:else if item.status_berlaku === 'DICABUT'}
																		<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
																			Dicabut
																		</span>
																	{:else}
																		<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
																			Mengubah
																		</span>
																	{/if}
																</div>
															</div>

															<!-- Title Snippet -->
															<p class="text-xs text-zinc-700 dark:text-zinc-300 font-medium line-clamp-2 leading-relaxed">
																{item.judul}
															</p>

															<!-- Relation Status Badge -->
															{#if relBadge}
																<div class="mt-2">
																	<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border {relBadge.color}">
																		{relBadge.label}
																	</span>
																</div>
															{/if}
														</div>

														<!-- Card Footer Buttons -->
														<div class="pt-2 mt-1 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
															<span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
																{item.kategori}
															</span>
															<div class="flex items-center gap-1.5">
																{#if item.file_path}
																	<button
																		type="button"
																		onclick={() => onPreviewPdf(item)}
																		class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-medium transition"
																	>
																		<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
																		</svg>
																		PDF
																	</button>
																{/if}
																<button
																	type="button"
																	onclick={() => onEditPeraturan(item)}
																	class="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
																	title="Edit Regulasi"
																>
																	<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
																	</svg>
																</button>
															</div>
														</div>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- ================= MODE 2: SILSILAH KETERKAITAN REGULASI (DEPENDENCY GRAPH) ================= -->
					<div class="w-full max-w-4xl space-y-4">
						<div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>
								Menampilkan relasi silsilah peraturan (Peraturan Induk / Dasar Hukum ke Peraturan Pelaksana, serta regulasi yang Mengubah / Mencabut).
							</span>
						</div>

						<div class="space-y-4">
							{#each hierarchyData.dependencyRoots as rootItem}
								<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
									<!-- Parent Root Card -->
									<div class="flex items-start justify-between gap-3">
										<div>
											<div class="flex items-center gap-2">
												<span class="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
													{rootItem.jenis_peraturan}
												</span>
												<h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
													{rootItem.nomor_peraturan}
												</h4>
											</div>
											<p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
												{rootItem.judul}
											</p>
										</div>
										<div class="flex items-center gap-1.5 shrink-0">
											{#if rootItem.file_path}
												<button
													type="button"
													onclick={() => onPreviewPdf(rootItem)}
													class="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium"
												>
													PDF
												</button>
											{/if}
										</div>
									</div>

									<!-- Child Branches -->
									{#if rootItem.children && rootItem.children.length > 0}
										<div class="mt-3 pl-4 sm:pl-6 border-l-2 border-emerald-400 dark:border-emerald-600 space-y-2.5">
											{#each rootItem.children as child}
												{@const childRel = formatTipeRelasiBadge(child.tipe_relasi, rootItem.nomor_peraturan)}
												<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-2">
													<div class="min-w-0">
														<div class="flex items-center gap-1.5 flex-wrap">
															<span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
																{child.nomor_peraturan}
															</span>
															{#if childRel}
																<span class="px-1.5 py-0.5 rounded text-[10px] font-medium border {childRel.color}">
																	{childRel.label}
																</span>
															{/if}
														</div>
														<p class="text-[11px] text-zinc-500 truncate mt-0.5">
															{child.judul}
														</p>
													</div>
													{#if child.file_path}
														<button
															type="button"
															onclick={() => onPreviewPdf(child)}
															class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
														>
															Lihat PDF
														</button>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
