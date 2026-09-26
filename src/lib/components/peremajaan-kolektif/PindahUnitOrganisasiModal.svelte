<script>
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import UnorTreeSelect from '$lib/components/ui/UnorTreeSelect.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	let {
		isOpen = false,
		refUnorTree = [],
		refUnorFlat = [],
		refJabatan = [],
		onclose = () => {},
		onsuccess = () => {}
	} = $props();

	// State form
	let sourceUnorId = $state('');
	let includeSub = $state(true);
	let targetUnorId = $state('');
	let keterangan = $state('');

	// Penyesuaian Unit & Jabatan dari Tree Unor untuk pegawai Struktural
	let customUnorPerPegawai = $state(new Map()); // pegawai_id -> { id, nmUnor, nm_jab, jab_id }
	let editingStructuralPegawai = $state(null);
	let tempSelectedUnorId = $state('');

	// State data pegawai
	let loadingPegawai = $state(false);
	let errorPegawai = $state('');
	let rawPegawaiList = $state([]);
	let searchFilter = $state('');
	let selectedPegawaiIds = $state(new Set());

	// State submit
	let submitting = $state(false);
	let submitError = $state('');

	// Reset state saat modal dibuka
	$effect(() => {
		if (isOpen) {
			sourceUnorId = '';
			targetUnorId = '';
			rawPegawaiList = [];
			selectedPegawaiIds = new Set();
			searchFilter = '';
			keterangan = '';
			customUnorPerPegawai = new Map();
			editingStructuralPegawai = null;
			tempSelectedUnorId = '';
			submitError = '';
			errorPegawai = '';
		}
	});

	// Lookup map dari flatOptions dan rekursif tree unor
	let unorMap = $derived.by(() => {
		const map = new Map();
		for (const u of refUnorFlat) {
			const uId = u.id || u.value;
			if (uId) {
				map.set(uId, {
					...u,
					id: uId,
					nmUnor: (u.nmUnor || u.label || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
					label: (u.label || u.nmUnor || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
				});
			}
		}

		function addNodes(nodes) {
			for (const n of nodes) {
				const existing = map.get(n.id);
				map.set(n.id, {
					...existing,
					...n,
					id: n.id,
					nmUnor: (n.label || n.nmUnor || existing?.nmUnor || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
					label: (n.label || existing?.label || '').replace(/\s*\(Non-Aktif\)$/i, '').trim(),
					nm_jab: n.nm_jab || existing?.nm_jab || null,
					jab_id: n.jab_id || existing?.jab_id || null,
					eselon_id: n.eselon_id || existing?.eselon_id || null,
				});
				if (n.children && n.children.length > 0) {
					addNodes(n.children);
				}
			}
		}
		addNodes(refUnorTree);
		return map;
	});

	let jabatanMap = $derived.by(() => {
		const map = new Map();
		for (const j of refJabatan) {
			map.set(j.id, j);
		}
		return map;
	});

	let sourceUnorDetail = $derived(unorMap.get(sourceUnorId));
	let targetUnorDetail = $derived(unorMap.get(targetUnorId));

	// Jabatan struktural dari unit tujuan utama (berdasarkan Tree Unor Induk)
	let targetStructuralJabatan = $derived.by(() => {
		if (!targetUnorDetail) return null;
		const jabId = targetUnorDetail.jab_id;
		const fromJabMap = jabId ? jabatanMap.get(jabId) : null;
		return {
			jab_id: jabId || null,
			nm_jab: targetUnorDetail.nm_jab || fromJabMap?.nama || fromJabMap?.nama_jabatan || targetUnorDetail.nmUnor,
			eselon_id: targetUnorDetail.eselon_id || fromJabMap?.eselon_id || null,
		};
	});

	// Filter daftar pegawai dengan pencarian teks
	let filteredPegawai = $derived.by(() => {
		if (!searchFilter.trim()) return rawPegawaiList;
		const q = searchFilter.toLowerCase().trim();
		return rawPegawaiList.filter((p) =>
			(p.nama || '').toLowerCase().includes(q) ||
			(p.nip || '').includes(q) ||
			(p.jabatan || '').toLowerCase().includes(q) ||
			(p.unit_kerja || '').toLowerCase().includes(q)
		);
	});

	let isAllSelected = $derived(
		filteredPegawai.length > 0 &&
		filteredPegawai.every((p) => selectedPegawaiIds.has(p.id))
	);

	let selectedPegawaiList = $derived(
		rawPegawaiList.filter((p) => selectedPegawaiIds.has(p.id))
	);

	let selectedStructuralCount = $derived(
		selectedPegawaiList.filter((p) => p.kategori_jabatan === 'STRUKTURAL' || p.kategori_jabatan === 'Struktural').length
	);

	let selectedNonStructuralCount = $derived(
		selectedPegawaiList.filter((p) => p.kategori_jabatan !== 'STRUKTURAL' && p.kategori_jabatan !== 'Struktural').length
	);

	// Periksa penempatan pegawai struktural: apakah custom dari tree atau default unit tujuan
	function getStructuralPlacement(p) {
		const custom = customUnorPerPegawai.get(p.id);
		if (custom) {
			return {
				isCustom: true,
				unorId: custom.id,
				unitName: custom.nmUnor,
				nm_jab: custom.nm_jab || targetStructuralJabatan?.nm_jab || 'Jabatan Struktural Unit',
				jab_id: custom.jab_id || targetStructuralJabatan?.jab_id || null,
			};
		}

		return {
			isCustom: false,
			unorId: targetUnorId,
			unitName: targetUnorDetail?.nmUnor || '-',
			nm_jab: targetStructuralJabatan?.nm_jab || '-',
			jab_id: targetStructuralJabatan?.jab_id || null,
		};
	}

	// Load data pegawai aktif di unit organisasi asal
	async function loadPegawaiByUnor(unorId, withSub) {
		if (!unorId) {
			rawPegawaiList = [];
			selectedPegawaiIds = new Set();
			customUnorPerPegawai = new Map();
			return;
		}

		loadingPegawai = true;
		errorPegawai = '';
		try {
			const query = new URLSearchParams({
				unor_id: unorId,
				include_sub: withSub ? 'true' : 'false'
			});
			const res = await api(`/peremajaan-kolektif/pegawai-by-unor?${query.toString()}`);
			rawPegawaiList = res.data || [];
			selectedPegawaiIds = new Set();
			customUnorPerPegawai = new Map();
		} catch (err) {
			errorPegawai = err.message || 'Gagal memuat daftar pegawai di unit organisasi asal';
			rawPegawaiList = [];
		} finally {
			loadingPegawai = false;
		}
	}

	function handleSourceUnorChange(newUnorId) {
		sourceUnorId = newUnorId;
		loadPegawaiByUnor(newUnorId, includeSub);
	}

	function handleToggleIncludeSub() {
		includeSub = !includeSub;
		if (sourceUnorId) {
			loadPegawaiByUnor(sourceUnorId, includeSub);
		}
	}

	function handleTargetUnorChange(newUnorId) {
		targetUnorId = newUnorId;
	}

	function toggleSelectAll() {
		const newSet = new Set(selectedPegawaiIds);
		if (isAllSelected) {
			for (const p of filteredPegawai) {
				newSet.delete(p.id);
			}
		} else {
			for (const p of filteredPegawai) {
				newSet.add(p.id);
			}
		}
		selectedPegawaiIds = newSet;
	}

	function togglePegawai(id) {
		const newSet = new Set(selectedPegawaiIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedPegawaiIds = newSet;
	}

	function clearSelection() {
		selectedPegawaiIds = new Set();
		customUnorPerPegawai = new Map();
	}

	// Buka dialog pemilihan Unit Kerja & Jabatan dari Tree Unor untuk Pejabat Struktural
	function openTreeSelectForStructural(pegawai) {
		editingStructuralPegawai = pegawai;
		const current = customUnorPerPegawai.get(pegawai.id);
		tempSelectedUnorId = current?.id || targetUnorId || '';
	}

	function applyTreeSelectForStructural() {
		if (!editingStructuralPegawai || !tempSelectedUnorId) return;
		const node = unorMap.get(tempSelectedUnorId);
		if (!node) return;

		const jabId = node.jab_id || null;
		const fromJabMap = jabId ? jabatanMap.get(jabId) : null;
		const resolvedJabName = node.nm_jab || fromJabMap?.nama || fromJabMap?.nama_jabatan || node.nmUnor;

		const newMap = new Map(customUnorPerPegawai);
		newMap.set(editingStructuralPegawai.id, {
			id: node.id,
			nmUnor: node.nmUnor || node.label,
			nm_jab: resolvedJabName,
			jab_id: jabId,
		});
		customUnorPerPegawai = newMap;
		editingStructuralPegawai = null;
		tempSelectedUnorId = '';
	}

	function resetTreeSelectForStructural() {
		if (!editingStructuralPegawai) return;
		const newMap = new Map(customUnorPerPegawai);
		newMap.delete(editingStructuralPegawai.id);
		customUnorPerPegawai = newMap;
		editingStructuralPegawai = null;
		tempSelectedUnorId = '';
	}

	async function handleSubmit() {
		submitError = '';

		if (!sourceUnorId) {
			submitError = 'Pilih Unit Organisasi asal terlebih dahulu.';
			return;
		}
		if (selectedPegawaiIds.size === 0) {
			submitError = 'Centang minimal satu pegawai yang akan dipindahkan.';
			return;
		}
		if (!targetUnorId) {
			submitError = 'Pilih Unit Organisasi tujuan dari Tree Unor Induk terlebih dahulu.';
			return;
		}
		if (sourceUnorId === targetUnorId) {
			submitError = 'Unit Organisasi tujuan tidak boleh sama dengan Unit Organisasi asal.';
			return;
		}

		// Bangun payload:
		// - Fungsional & Pelaksana: jabatan tetap jabatan asal (nm_jab_id tidak diubah)
		// - Struktural: unit kerja dan jabatan disesuaikan dari Tree Unor Induk
		const selectedList = rawPegawaiList.filter((p) => selectedPegawaiIds.has(p.id));
		const pegawaiListPayload = selectedList.map((p) => {
			const isStruktural = p.kategori_jabatan === 'STRUKTURAL' || p.kategori_jabatan === 'Struktural';
			if (isStruktural) {
				const placement = getStructuralPlacement(p);
				return {
					pegawai_id: p.id,
					tujuan_unor_id: placement.unorId || targetUnorId,
					nm_jab_id: placement.jab_id || targetStructuralJabatan?.jab_id || p.nm_jab_id || null,
				};
			} else {
				// Fungsional / Pelaksana: TIDAK PERLU PENYESUAIAN JABATAN
				return {
					pegawai_id: p.id,
					tujuan_unor_id: targetUnorId,
					nm_jab_id: p.nm_jab_id || null, // Tetap mempertahankan jabatan asal
				};
			}
		});

		submitting = true;
		try {
			const res = await api('/peremajaan-kolektif/mutasi-unor', {
				method: 'POST',
				body: JSON.stringify({
					asal_unor_id: sourceUnorId,
					tujuan_unor_id: targetUnorId,
					target_nm_jab_id: targetStructuralJabatan?.jab_id || null,
					keterangan: keterangan || null,
					pegawai_ids: Array.from(selectedPegawaiIds),
					pegawai_list: pegawaiListPayload,
				}),
			});

			const strukturalInfo = selectedStructuralCount > 0 ? ` (${selectedStructuralCount} pejabat struktural disesuaikan)` : '';
			toast.success(res.message || `${selectedPegawaiIds.size} pegawai berhasil dipindahkan${strukturalInfo}`);
			onsuccess(res.data);
			onclose();
		} catch (err) {
			submitError = err.message || 'Gagal memproses pemindahan unit kerja dan jabatan';
		} finally {
			submitting = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-100">
			
			<!-- Modal Header -->
			<div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
					</div>
					<div>
						<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
							Mutasi Masal Unit Kerja & Penyesuaian Jabatan Struktural
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Pemindahan pegawai antar unit kerja (tanpa SK). Jabatan struktural otomatis disesuaikan dari Tree Unor Induk, sedangkan jabatan Fungsional & Pelaksana tetap.
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onclose}
					class="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
				
				<!-- Bar Info Banner Ketentuan -->
				<div class="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
					<svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					<div class="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
						<p class="font-bold">Ketentuan Mutasi Unit & Penyesuaian Jabatan</p>
						<p class="text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed text-[11px]">
							• <strong>Jabatan Struktural:</strong> Unit kerja dan jabatan disesuaikan berdasarkan unit yang dipilih dari <strong>Tree Unor Induk</strong>.<br />
							• <strong>Jabatan Fungsional & Pelaksana:</strong> Hanya dipindahkan penempatan unit kerjanya; <strong>jabatan tidak mengalami penyesuaian</strong> (tetap).
						</p>
					</div>
				</div>

				<!-- Step 1 & 3: Asal vs Tujuan Grid -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
					
					<!-- Kiri: Unit Organisasi Asal (Sumber) -->
					<div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">1</span>
								<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
									Unit Organisasi Asal (Sumber)
								</h3>
							</div>
							<span class="text-2xs text-zinc-400">Pilih unit kerja asal pegawai</span>
						</div>

						<UnorTreeSelect
							label=""
							placeholder="Cari atau pilih OPD / Unit Kerja Asal..."
							tree={refUnorTree}
							flatOptions={refUnorFlat}
							value={sourceUnorId}
							onchange={handleSourceUnorChange}
						/>

						<div class="flex items-center justify-between pt-1">
							<label class="inline-flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none">
								<input
									type="checkbox"
									checked={includeSub}
									onchange={handleToggleIncludeSub}
									class="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-600 cursor-pointer"
								/>
								<span>Sertakan pegawai di seluruh sub-unit / seksi bawahan</span>
							</label>

							{#if sourceUnorId && rawPegawaiList.length > 0}
								<span class="text-2xs font-bold text-indigo-600 dark:text-indigo-400">
									{rawPegawaiList.length} Pegawai
								</span>
							{/if}
						</div>
					</div>

					<!-- Kanan: Unit Organisasi Tujuan (Penempatan Baru dari Tree Unor Induk) -->
					<div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">3</span>
								<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
									Pilih dari Tree Unor Induk Tujuan
								</h3>
							</div>
							<span class="text-2xs text-zinc-400">Hierarki OPD / Unit Kerja</span>
						</div>

						<UnorTreeSelect
							label=""
							placeholder="Pilih Unit Organisasi dari Tree Unor..."
							tree={refUnorTree}
							flatOptions={refUnorFlat}
							value={targetUnorId}
							onchange={handleTargetUnorChange}
						/>

						{#if targetUnorDetail}
							<div class="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-2xs">
								<div class="flex items-center justify-between">
									<span class="text-emerald-800 dark:text-emerald-300 font-semibold truncate">
										Unit Tujuan: <strong class="text-emerald-900 dark:text-emerald-100">{targetUnorDetail.nmUnor}</strong>
									</span>
									<span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
										Level {targetUnorDetail.level || '-'}
									</span>
								</div>
								
								<!-- Jabatan Struktural Unit Tujuan yang Ditetapkan dari Tree -->
								<div class="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-2">
									<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold text-[9px] shrink-0 mt-0.5">
										Jabatan Struktural Unit
									</span>
									<div class="text-emerald-950 dark:text-emerald-200 font-bold leading-tight">
										{targetStructuralJabatan?.nm_jab || targetUnorDetail.nmUnor}
										<p class="text-zinc-500 dark:text-zinc-400 font-normal text-[10px] mt-0.5">
											(Otomatis disematkan untuk pegawai berjabatan Struktural)
										</p>
									</div>
								</div>
							</div>
						{:else}
							<div class="p-2.5 text-2xs text-zinc-400 italic">
								Pilih unit kerja tujuan dari tree unor induk di atas.
							</div>
						{/if}
					</div>
				</div>

				<!-- Step 2: Daftar Pegawai & Tabel Tinjauan -->
				<div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs space-y-0">
					<!-- Top Action bar in table -->
					<div class="p-3.5 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">2</span>
							<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
								Pilih Pegawai
							</h3>
							{#if selectedPegawaiIds.size > 0}
								<span class="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-2xs">
									{selectedPegawaiIds.size} Dipilih
								</span>
								{#if selectedStructuralCount > 0}
									<span class="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-2xs">
										{selectedStructuralCount} Jabatan Struktural (Disesuaikan dari Tree)
									</span>
								{/if}
								{#if selectedNonStructuralCount > 0}
									<span class="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-2xs">
										{selectedNonStructuralCount} Fungsional / Pelaksana (Jabatan Tetap)
									</span>
								{/if}
							{/if}
						</div>

						<div class="flex items-center gap-2">
							{#if rawPegawaiList.length > 0}
								<div class="relative w-full sm:w-56">
									<input
										type="text"
										placeholder="Cari NIP, Nama, Jabatan..."
										bind:value={searchFilter}
										class="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
									/>
									<svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
								</div>
								{#if selectedPegawaiIds.size > 0}
									<button
										type="button"
										onclick={clearSelection}
										class="text-2xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
									>
										Reset
									</button>
								{/if}
							{/if}
						</div>
					</div>

					<!-- Table content area -->
					<div class="max-h-80 overflow-y-auto divide-y divide-zinc-200/80 dark:divide-zinc-800">
						{#if !sourceUnorId}
							<div class="py-12 text-center text-zinc-400 space-y-1">
								<svg class="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
								<p class="font-semibold text-xs">Pilih Unit Organisasi Asal di atas</p>
								<p class="text-2xs text-zinc-400">Daftar pegawai yang terdaftar pada unit tersebut akan muncul di sini</p>
							</div>
						{:else if loadingPegawai}
							<div class="py-12">
								<LoadingState message="Memuat daftar pegawai di unit organisasi asal..." />
							</div>
						{:else if errorPegawai}
							<div class="p-6 text-center text-rose-600 dark:text-rose-400 text-xs">
								<p class="font-bold mb-1">Gagal memuat pegawai</p>
								<p>{errorPegawai}</p>
							</div>
						{:else if filteredPegawai.length === 0}
							<div class="py-10">
								<EmptyState
									icon="👥"
									message={searchFilter ? 'Tidak ada pegawai cocok dengan pencarian.' : 'Tidak ada pegawai aktif di unit organisasi ini.'}
								/>
							</div>
						{:else}
							<table class="w-full text-left text-xs">
								<thead class="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
									<tr>
										<th class="w-10 px-4 py-2.5 text-center">
											<input
												type="checkbox"
												checked={isAllSelected}
												onchange={toggleSelectAll}
												disabled={filteredPegawai.length === 0}
												class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-600 cursor-pointer"
											/>
										</th>
										<th class="px-3 py-2.5">Pegawai</th>
										<th class="px-3 py-2.5">Jabatan Saat Ini</th>
										<th class="px-3 py-2.5">Unit & Jabatan di Tujuan</th>
										<th class="px-3 py-2.5 text-right">Penyesuaian Tree</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-200/80 dark:divide-zinc-800">
									{#each filteredPegawai as p}
										{@const isSelected = selectedPegawaiIds.has(p.id)}
										{@const isStruktural = p.kategori_jabatan === 'STRUKTURAL' || p.kategori_jabatan === 'Struktural'}
										{@const structPlacement = isStruktural ? getStructuralPlacement(p) : null}
										<tr
											class="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 {isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}"
										>
											<td class="px-4 py-2.5 text-center">
												<input
													type="checkbox"
													checked={isSelected}
													onchange={() => togglePegawai(p.id)}
													class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-600 cursor-pointer"
												/>
											</td>
											<td class="px-3 py-2.5">
												<div class="flex items-center gap-2.5">
													<Avatar src={p.foto} name={p.nama} size="sm" />
													<div class="min-w-0">
														<div class="font-bold text-zinc-900 dark:text-zinc-100 truncate">
															{p.nama}
														</div>
														<div class="text-[11px] font-mono text-zinc-400">
															{p.nip}
														</div>
														<div class="text-2xs text-zinc-400">
															{p.golongan} — {p.pangkat}
														</div>
													</div>
												</div>
											</td>
											<td class="px-3 py-2.5">
												<div class="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
													{p.jabatan}
												</div>
												<div class="flex items-center gap-1.5 mt-0.5">
													{#if isStruktural}
														<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
															STRUKTURAL
														</span>
													{:else if p.kategori_jabatan === 'FUNGSIONAL'}
														<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
															FUNGSIONAL
														</span>
													{:else}
														<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
															{p.kategori_jabatan || 'PELAKSANA'}
														</span>
													{/if}
													<span class="text-2xs text-zinc-400 truncate max-w-[120px]">
														{p.unit_kerja}
													</span>
												</div>
											</td>
											<td class="px-3 py-2.5">
												{#if isSelected}
													{#if isStruktural}
														<!-- Pejabat Struktural: Disesuaikan dari Tree Unor -->
														<div class="space-y-1">
															<div class="flex items-center gap-1.5">
																<span class="font-bold text-xs text-purple-700 dark:text-purple-300 truncate max-w-xs">
																	{structPlacement?.nm_jab || '-'}
																</span>
																<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 shrink-0">
																	{structPlacement?.isCustom ? 'Tree Pilihan' : 'Tree Tujuan'}
																</span>
															</div>
															<div class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs flex items-center gap-1">
																<span class="text-zinc-400">Unit:</span>
																<span class="font-semibold text-zinc-700 dark:text-zinc-200 truncate">{structPlacement?.unitName}</span>
															</div>
														</div>
													{:else}
														<!-- Pegawai Fungsional & Pelaksana: Jabatan Tetap (Tanpa Penyesuaian) -->
														<div class="space-y-1">
															<div class="flex items-center gap-1.5">
																<span class="font-medium text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-xs">
																	{p.jabatan}
																</span>
																<span class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-700">
																	Jabatan Tetap
																</span>
															</div>
															<div class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs flex items-center gap-1">
																<span class="text-zinc-400">Pindah ke:</span>
																<span class="font-semibold text-zinc-700 dark:text-zinc-200 truncate">{targetUnorDetail?.nmUnor || '-'}</span>
															</div>
														</div>
													{/if}
												{:else}
													<span class="text-zinc-400 text-2xs italic">Centang pegawai terlebih dahulu</span>
												{/if}
											</td>
											<td class="px-3 py-2.5 text-right whitespace-nowrap">
												{#if isSelected && isStruktural}
													<button
														type="button"
														onclick={() => openTreeSelectForStructural(p)}
														class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
													>
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
														<span>{customUnorPerPegawai.has(p.id) ? 'Ganti dari Tree' : 'Pilih dari Tree'}</span>
													</button>
												{:else if isSelected}
													<span class="text-zinc-400 text-2xs italic">Tetap</span>
												{:else}
													<span class="text-zinc-400 text-2xs">-</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</div>

				<!-- Catatan / Alasan Pemindahan -->
				<div class="space-y-1">
					<label for="keterangan_pindah_unor" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Catatan / Alasan Pemindahan Unit Kerja (Opsional)
					</label>
					<input
						id="keterangan_pindah_unor"
						type="text"
						bind:value={keterangan}
						placeholder="Misal: Penataan penempatan pegawai dan penyesuaian pejabat struktural"
						class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
					/>
				</div>

				{#if submitError}
					<div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
						<svg class="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
						<span>{submitError}</span>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
				<div class="text-xs text-zinc-500 dark:text-zinc-400">
					{#if selectedPegawaiIds.size > 0 && targetUnorDetail}
						Memindahkan <strong class="text-indigo-600 dark:text-indigo-400 font-bold">{selectedPegawaiIds.size} pegawai</strong> ke <strong class="text-zinc-900 dark:text-zinc-100 font-bold">{targetUnorDetail.nmUnor}</strong>
						{#if selectedStructuralCount > 0}
							<span> (<strong class="text-purple-600 dark:text-purple-400 font-bold">{selectedStructuralCount} jabatan struktural disesuaikan dari Tree Unor</strong>)</span>
						{/if}.
					{:else}
						Pilih unit asal, centang pegawai, dan tentukan unit tujuan dari Tree Unor Induk.
					{/if}
				</div>

				<div class="flex items-center gap-2.5 justify-end">
					<Button variant="ghost" onclick={onclose} disabled={submitting}>
						Batal
					</Button>
					<button
						type="button"
						onclick={handleSubmit}
						disabled={submitting || selectedPegawaiIds.size === 0 || !targetUnorId || !sourceUnorId}
						class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						{#if submitting}
							<span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
							<span>Menerapkan Mutasi Masal...</span>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
							<span>Terapkan Pemindahan ({selectedPegawaiIds.size} Pegawai)</span>
						{/if}
					</button>
				</div>
			</div>

		</div>
	</div>
{/if}

<!-- Sub-Modal: Pemilihan Unit Kerja & Jabatan dari Tree Unor Induk Khusus Pejabat Struktural -->
{#if editingStructuralPegawai}
	{@const tempNode = unorMap.get(tempSelectedUnorId)}
	<div class="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
		<div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg text-zinc-800 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
			
			<div class="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20 rounded-t-2xl">
				<div>
					<h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
						Pilih dari Tree Unor Induk
						<span class="px-2 py-0.2 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] font-bold">
							Jabatan Struktural
						</span>
					</h3>
					<p class="text-2xs text-zinc-500 dark:text-zinc-400 mt-0.5">
						Tentukan unit kerja tujuan pada hierarki tree. Jabatan struktural akan otomatis terisi sesuai unit yang dipilih.
					</p>
				</div>
				<button
					type="button"
					onclick={() => editingStructuralPegawai = null}
					class="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>

			<div class="p-5 space-y-4 text-xs">
				<!-- Info Pegawai -->
				<div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
					<Avatar src={editingStructuralPegawai.foto} name={editingStructuralPegawai.nama} size="sm" />
					<div class="min-w-0">
						<div class="font-bold text-zinc-900 dark:text-zinc-100 truncate">
							{editingStructuralPegawai.nama}
						</div>
						<div class="text-[11px] font-mono text-zinc-400">
							{editingStructuralPegawai.nip}
						</div>
						<div class="text-2xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
							Jabatan Asal: {editingStructuralPegawai.jabatan}
						</div>
					</div>
				</div>

				<!-- Komponen Pemilih Tree Unor Induk (Select Option Search) -->
				<div class="space-y-1.5">
					<label class="text-2xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
						Pilih Unit Organisasi dari Tree:
					</label>
					<UnorTreeSelect
						label=""
						placeholder="Pilih atau cari unit di dalam tree..."
						tree={refUnorTree}
						flatOptions={refUnorFlat}
						value={tempSelectedUnorId}
						onchange={(newId) => tempSelectedUnorId = newId}
					/>
				</div>

				<!-- Preview Jabatan Struktural Hasil Pilihan Tree -->
				{#if tempNode}
					<div class="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
						<div class="text-2xs text-purple-900 dark:text-purple-200 font-bold uppercase tracking-wider">
							Hasil Penyesuaian dari Tree:
						</div>
						<div class="space-y-0.5 text-xs">
							<div>
								<span class="text-zinc-500 dark:text-zinc-400">Unit Kerja Tujuan:</span>
								<strong class="text-zinc-900 dark:text-zinc-100 ml-1">{tempNode.nmUnor || tempNode.label}</strong>
							</div>
							<div>
								<span class="text-zinc-500 dark:text-zinc-400">Jabatan Struktural:</span>
								<strong class="text-purple-800 dark:text-purple-300 ml-1">{tempNode.nm_jab || tempNode.nmUnor}</strong>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between rounded-b-2xl">
				{#if customUnorPerPegawai.has(editingStructuralPegawai.id)}
					<button
						type="button"
						onclick={resetTreeSelectForStructural}
						class="text-2xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
					>
						Reset (Ikuti Unit Tujuan Utama)
					</button>
				{:else}
					<div></div>
				{/if}

				<div class="flex items-center gap-2">
					<Button variant="ghost" onclick={() => editingStructuralPegawai = null}>
						Batal
					</Button>
					<button
						type="button"
						onclick={applyTreeSelectForStructural}
						disabled={!tempSelectedUnorId}
						class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						Terapkan Pilihan
					</button>
				</div>
			</div>

		</div>
	</div>
{/if}
