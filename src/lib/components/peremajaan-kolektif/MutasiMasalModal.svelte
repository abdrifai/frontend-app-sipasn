<script>
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import UnorTreeSelect from '$lib/components/ui/UnorTreeSelect.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';

	let {
		isOpen = false,
		skId = '',
		skDetail = null,
		skDraftList = [],
		refUnorTree = [],
		refUnorFlat = [],
		refJabatan = [],
		onclose = () => {},
		onsuccess = () => {}
	} = $props();

	// State
	let selectedSkId = $state(skId || '');
	let sourceUnorId = $state('');
	let includeSub = $state(true);
	let targetUnorId = $state('');
	let keterangan = $state('');

	// Jabatan Tujuan Option: 'ASAL' | 'STRUKTURAL' | 'CUSTOM'
	let opsiJabatan = $state('ASAL');
	let customJabatanId = $state('');

	// Data Pegawai
	let loadingPegawai = $state(false);
	let errorPegawai = $state('');
	let rawPegawaiList = $state([]);
	let searchFilter = $state('');
	let selectedPegawaiIds = $state(new Set());

	// Submission state
	let submitting = $state(false);
	let submitError = $state('');

	// Update selectedSkId whenever skId changes
	$effect(() => {
		if (skId) {
			selectedSkId = skId;
		} else if (!selectedSkId && skDraftList.length > 0) {
			selectedSkId = skDraftList[0].id;
		}
	});

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			sourceUnorId = '';
			targetUnorId = '';
			rawPegawaiList = [];
			selectedPegawaiIds = new Set();
			searchFilter = '';
			keterangan = '';
			opsiJabatan = 'ASAL';
			customJabatanId = '';
			submitError = '';
			errorPegawai = '';
		}
	});

	// Unor Lookup Map
	let unorMap = $derived.by(() => {
		const map = new Map();
		for (const u of refUnorFlat) {
			map.set(u.id, u);
		}
		return map;
	});

	let sourceUnorDetail = $derived(unorMap.get(sourceUnorId));
	let targetUnorDetail = $derived(unorMap.get(targetUnorId));

	// Filtered Pegawai List based on search
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

	// Count selectable pegawai (those not already in SK)
	let selectablePegawai = $derived(filteredPegawai.filter((p) => !p.is_already_in_sk));
	let isAllSelected = $derived(
		selectablePegawai.length > 0 &&
		selectablePegawai.every((p) => selectedPegawaiIds.has(p.id))
	);

	// Jabatan Options for Combobox
	let jabatanComboboxOptions = $derived(
		refJabatan.map((j) => ({
			value: j.id,
			label: `${j.nama || j.nama_jabatan || '-'} (${j.kategori || 'STRUKTURAL'})`,
			kategori: j.kategori,
		}))
	);

	// Fetch Pegawai by Source Unor
	async function loadPegawaiByUnor(unorId, withSub) {
		if (!unorId) {
			rawPegawaiList = [];
			selectedPegawaiIds = new Set();
			return;
		}

		loadingPegawai = true;
		errorPegawai = '';
		try {
			const query = new URLSearchParams({
				unor_id: unorId,
				include_sub: withSub ? 'true' : 'false',
				...(selectedSkId ? { sk_kolektif_id: selectedSkId } : {})
			});
			const res = await api(`/peremajaan-kolektif/pegawai-by-unor?${query.toString()}`);
			rawPegawaiList = res.data || [];
			selectedPegawaiIds = new Set();
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
		const target = unorMap.get(newUnorId);
		// Auto detect if target unor has structural jab_id
		if (target?.jab_id) {
			// keep structural option available
		} else if (opsiJabatan === 'STRUKTURAL') {
			opsiJabatan = 'ASAL';
		}
	}

	function toggleSelectAll() {
		const newSet = new Set(selectedPegawaiIds);
		if (isAllSelected) {
			for (const p of selectablePegawai) {
				newSet.delete(p.id);
			}
		} else {
			for (const p of selectablePegawai) {
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
	}

	async function handleSubmit() {
		submitError = '';

		if (!selectedSkId) {
			submitError = 'Pilih SK Kolektif tujuan terlebih dahulu.';
			return;
		}
		if (!sourceUnorId) {
			submitError = 'Pilih Unit Organisasi asal terlebih dahulu.';
			return;
		}
		if (selectedPegawaiIds.size === 0) {
			submitError = 'Centang minimal satu pegawai yang akan dimutasi.';
			return;
		}
		if (!targetUnorId) {
			submitError = 'Pilih Unit Organisasi tujuan terlebih dahulu.';
			return;
		}
		if (sourceUnorId === targetUnorId) {
			submitError = 'Unit Organisasi tujuan tidak boleh sama dengan Unit Organisasi asal.';
			return;
		}
		if (opsiJabatan === 'CUSTOM' && !customJabatanId) {
			submitError = 'Pilih nama jabatan baru yang akan ditetapkan bersama.';
			return;
		}

		// Prepare batch payload
		const selectedList = rawPegawaiList.filter((p) => selectedPegawaiIds.has(p.id));
		let batchTargetJabId = null;

		if (opsiJabatan === 'CUSTOM') {
			batchTargetJabId = customJabatanId;
		} else if (opsiJabatan === 'STRUKTURAL') {
			batchTargetJabId = targetUnorDetail?.jab_id || null;
		}

		const pegawaiListPayload = selectedList.map((p) => ({
			pegawai_id: p.id,
			nip: p.nip,
			nama: p.nama,
			nm_jab_id: opsiJabatan === 'ASAL' ? (p.nm_jab_id || null) : batchTargetJabId,
			jns_jab_id: p.jns_jab_id || null,
			eselon_id: p.eselon_id || null,
			keterangan: keterangan || `Mutasi dari ${sourceUnorDetail?.nmUnor || 'OPD Asal'} ke ${targetUnorDetail?.nmUnor || 'OPD Tujuan'}`,
		}));

		submitting = true;
		try {
			const res = await api(`/peremajaan-kolektif/${selectedSkId}/pegawai-batch`, {
				method: 'POST',
				body: JSON.stringify({
					target_unor_id: targetUnorId,
					target_nm_jab_id: batchTargetJabId,
					keterangan: keterangan || null,
					pegawai_list: pegawaiListPayload,
				}),
			});

			toast.success(`${res.data?.total_added || selectedPegawaiIds.size} pegawai berhasil dimutasikan ke SK Kolektif`);
			onsuccess(res.data);
			onclose();
		} catch (err) {
			submitError = err.message || 'Gagal memproses mutasi masal pegawai';
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
							Mutasi Masal Pegawai Antar Unit Organisasi (OPD)
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Pindahkan rombongan pegawai dari satu unit organisasi ke unit organisasi tujuan dalam satu penetapan SK Kolektif.
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
				
				<!-- Target SK Selector (if not inside detail page) -->
				{#if !skId && skDraftList.length > 0}
					<div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
						<label for="pilih_sk_kolektif" class="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
							<svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
							SK Kolektif Tujuan (Status Draft)
						</label>
						<select
							id="pilih_sk_kolektif"
							bind:value={selectedSkId}
							class="w-full text-xs bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
						>
							{#each skDraftList as draft}
								<option value={draft.id}>
									{draft.no_sk} — {draft.keterangan || 'Tanpa keterangan'} ({draft.total_pegawai || 0} pegawai terdaftar)
								</option>
							{/each}
						</select>
					</div>
				{:else if skDetail}
					<div class="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold text-indigo-800 dark:text-indigo-300">
						<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
						Dimutasikan ke SK Kolektif: <span class="font-bold underline">{skDetail.no_sk}</span> (Status Draft)
					</div>
				{/if}

				<!-- Step 1 & 2 Layout: Asal vs Tujuan Cards -->
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
							<span class="text-2xs text-zinc-400">Pilih unit kerja tempat pegawai saat ini</span>
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
									{rawPegawaiList.length} Pegawai Ditemukan
								</span>
							{/if}
						</div>
					</div>

					<!-- Kanan: Unit Organisasi Tujuan -->
					<div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">3</span>
								<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
									Unit Organisasi Tujuan (Penempatan Baru)
								</h3>
							</div>
							<span class="text-2xs text-zinc-400">Pilih OPD / Unit Kerja tujuan mutasi</span>
						</div>

						<UnorTreeSelect
							label=""
							placeholder="Cari atau pilih OPD / Unit Kerja Tujuan..."
							tree={refUnorTree}
							flatOptions={refUnorFlat}
							value={targetUnorId}
							onchange={handleTargetUnorChange}
						/>

						{#if targetUnorDetail}
							<div class="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-2xs">
								<span class="text-emerald-800 dark:text-emerald-300 font-semibold truncate">
									Unit Tujuan: <strong class="text-emerald-900 dark:text-emerald-200">{targetUnorDetail.nmUnor}</strong>
								</span>
								{#if targetUnorDetail.jab_id}
									<span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
										Tersedia Jabatan Struktural
									</span>
								{/if}
							</div>
						{/if}

						<!-- Pengaturan Opsi Jabatan Tujuan -->
						<div class="space-y-2 pt-1 border-t border-zinc-200/80 dark:border-zinc-700/80">
							<label class="text-2xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
								Aturan Jabatan Baru
							</label>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
								<button
									type="button"
									onclick={() => opsiJabatan = 'ASAL'}
									class="p-2 text-left rounded-xl border transition cursor-pointer {opsiJabatan === 'ASAL' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}"
								>
									<div class="text-[11px] font-semibold">Pertahankan Asal</div>
									<div class="text-[9px] text-zinc-400">Cocok staf/fungsional</div>
								</button>

								{#if targetUnorDetail?.jab_id}
									<button
										type="button"
										onclick={() => opsiJabatan = 'STRUKTURAL'}
										class="p-2 text-left rounded-xl border transition cursor-pointer {opsiJabatan === 'STRUKTURAL' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}"
									>
										<div class="text-[11px] font-semibold">Jabatan Pimpinan</div>
										<div class="text-[9px] text-zinc-400">Jabatan struktural unit</div>
									</button>
								{/if}

								<button
									type="button"
									onclick={() => opsiJabatan = 'CUSTOM'}
									class="p-2 text-left rounded-xl border transition cursor-pointer {opsiJabatan === 'CUSTOM' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}"
								>
									<div class="text-[11px] font-semibold">Tentukan Bersama</div>
									<div class="text-[9px] text-zinc-400">Pilih 1 jabatan baru</div>
								</button>
							</div>

							{#if opsiJabatan === 'CUSTOM'}
								<div class="pt-1">
									<Combobox
										items={jabatanComboboxOptions}
										bind:value={customJabatanId}
										placeholder="Pilih nama jabatan baru untuk semua..."
										searchPlaceholder="Cari jabatan..."
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Step 2: Daftar Pegawai & Seleksi (Centang Checkbox) -->
				<div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs space-y-0">
					<!-- Top Action bar in table -->
					<div class="p-3.5 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">2</span>
							<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
								Pilih Pegawai yang Dimutasi
							</h3>
							{#if selectedPegawaiIds.size > 0}
								<span class="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-2xs">
									{selectedPegawaiIds.size} Dipilih
								</span>
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
					<div class="max-h-72 overflow-y-auto divide-y divide-zinc-200/80 dark:divide-zinc-800">
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
												disabled={selectablePegawai.length === 0}
												class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-600 cursor-pointer disabled:opacity-40"
											/>
										</th>
										<th class="px-3 py-2.5">Pegawai</th>
										<th class="px-3 py-2.5">Gol / Pangkat</th>
										<th class="px-3 py-2.5">Jabatan Saat Ini</th>
										<th class="px-3 py-2.5">Unit Kerja Saat Ini</th>
										<th class="px-3 py-2.5 text-right">Status</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-200/80 dark:divide-zinc-800">
									{#each filteredPegawai as p}
										<tr
											class="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 {selectedPegawaiIds.has(p.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''} {p.is_already_in_sk ? 'opacity-50 bg-zinc-50/30' : ''}"
										>
											<td class="px-4 py-2 text-center">
												<input
													type="checkbox"
													checked={selectedPegawaiIds.has(p.id)}
													disabled={p.is_already_in_sk}
													onchange={() => togglePegawai(p.id)}
													class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-600 cursor-pointer disabled:cursor-not-allowed"
												/>
											</td>
											<td class="px-3 py-2">
												<div class="flex items-center gap-2.5">
													<Avatar src={p.foto} name={p.nama} size="sm" />
													<div class="min-w-0">
														<div class="font-bold text-zinc-900 dark:text-zinc-100 truncate">
															{p.nama}
														</div>
														<div class="text-[11px] font-mono text-zinc-400">
															{p.nip}
														</div>
													</div>
												</div>
											</td>
											<td class="px-3 py-2 whitespace-nowrap">
												<span class="font-bold text-zinc-700 dark:text-zinc-300">{p.golongan}</span>
												<span class="text-zinc-400 text-2xs block truncate">{p.pangkat}</span>
											</td>
											<td class="px-3 py-2">
												<div class="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
													{p.jabatan}
												</div>
												<div class="text-2xs text-zinc-400">
													{p.kategori_jabatan || '-'}
												</div>
											</td>
											<td class="px-3 py-2 text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
												{p.unit_kerja}
											</td>
											<td class="px-3 py-2 text-right whitespace-nowrap">
												{#if p.is_already_in_sk}
													<span class="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold text-[10px]">
														Sudah di SK
													</span>
												{:else if selectedPegawaiIds.has(p.id)}
													<span class="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
														Terpilih
													</span>
												{:else}
													<span class="text-zinc-400 text-2xs">Siap</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</div>

				<!-- Catatan / Keterangan Mutasi -->
				<div class="space-y-1">
					<label for="keterangan_mutasi_masal" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Catatan / Keterangan Mutasi Masal (Opsional)
					</label>
					<input
						id="keterangan_mutasi_masal"
						type="text"
						bind:value={keterangan}
						placeholder="Misal: Mutasi Penataan dan Restrukturisasi Perangkat Daerah 2026"
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
						Memutasikan <strong class="text-indigo-600 dark:text-indigo-400 font-bold">{selectedPegawaiIds.size} pegawai</strong> ke <strong class="text-zinc-900 dark:text-zinc-100 font-bold">{targetUnorDetail.nmUnor}</strong>.
					{:else}
						Pilih pegawai dan unit organisasi tujuan untuk melanjutkan.
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
							<span>Memproses Mutasi Masal...</span>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
							<span>Tambahkan ke SK ({selectedPegawaiIds.size} Pegawai)</span>
						{/if}
					</button>
				</div>
			</div>

		</div>
	</div>
{/if}
