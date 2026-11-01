<script>
	import { untrack } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let {
		open = false,
		nip = '',
		onClose = () => {},
		onSuccess = () => {},
	} = $props();

	let loading = $state(false);
	let loadingSubmit = $state(false);
	let errorMessage = $state('');
	let checkData = $state(null);

	// Mode konfirmasi referensi pendidikan: 'new' | 'existing'
	let mode = $state('new');

	// Form fields untuk mode 'new'
	let newTktPendId = $state('');
	let newPendNama = $state('');
	let newKode = $state('');

	// Form fields untuk mode 'existing'
	let selectedPendId = $state('');
	let selectedPendObj = $state(null);
	let searchRefQuery = $state('');
	let searchRefList = $state([]);
	let loadingSearchRef = $state(false);

	// Riwayat tambahan pendidikan
	let thnLulus = $state('');
	let nmSekolah = $state('');

	// Load pre-check data saat modal dibuka dengan NIP
	async function loadCheckData(targetNip) {
		if (!targetNip) return;
		loading = true;
		errorMessage = '';
		checkData = null;

		try {
			const res = await api(`/data-matching/sync/pendidikan/check?nip=${encodeURIComponent(targetNip)}`);
			if (res?.data) {
				checkData = res.data;
				thnLulus = checkData.siasn?.tahun_lulus || '';
				nmSekolah = checkData.siasn?.nama_sekolah || '';

				if (checkData.matched_ref) {
					mode = 'existing';
					selectedPendId = checkData.matched_ref.id;
					selectedPendObj = checkData.matched_ref;
					searchRefQuery = checkData.matched_ref.pend;
				} else {
					mode = 'new';
					newTktPendId = checkData.suggestion?.tktpend_id || '8';
					newPendNama = checkData.suggestion?.pend || '';
					newKode = checkData.suggestion?.kode || '';
				}
			}
		} catch (err) {
			errorMessage = err.message || 'Gagal memeriksa data pegawai & referensi pendidikan dari SIASN';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open && nip) {
			const currentNip = nip;
			untrack(() => {
				loadCheckData(currentNip);
			});
		}
	});

	// Pencarian referensi master pendidikan lokal (ref_pend)
	let debounceTimeout;
	function handleSearchRefInput(e) {
		const val = e.target.value;
		searchRefQuery = val;
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(async () => {
			if (!val.trim()) {
				searchRefList = [];
				return;
			}
			loadingSearchRef = true;
			try {
				const res = await api(`/data-matching/sync/pendidikan/search-ref?search=${encodeURIComponent(val.trim())}&limit=10`);
				searchRefList = res.data || [];
			} catch (err) {
				searchRefList = [];
			} finally {
				loadingSearchRef = false;
			}
		}, 300);
	}

	function selectExistingRef(ref) {
		selectedPendId = ref.id;
		selectedPendObj = ref;
		searchRefQuery = ref.pend;
		searchRefList = [];
	}

	async function handleSubmit(e) {
		e?.preventDefault?.();
		errorMessage = '';

		if (mode === 'new') {
			if (!newPendNama.trim()) {
				errorMessage = 'Nama Program Studi / Pendidikan wajib diisi';
				return;
			}
			if (!newTktPendId) {
				errorMessage = 'Tingkat pendidikan wajib dipilih';
				return;
			}
		} else {
			if (!selectedPendId) {
				errorMessage = 'Silakan pilih salah satu master referensi pendidikan lokal yang tersedia';
				return;
			}
		}

		loadingSubmit = true;
		try {
			const payload = {
				nip,
				education_config: {
					mode,
					...(mode === 'existing'
						? { selected_pend_id: selectedPendId }
						: {
								new_ref: {
									tktpend_id: newTktPendId,
									pend: newPendNama.trim().toUpperCase(),
									kode: newKode.trim() || null,
								},
							}),
					thnLulus: thnLulus.trim() || null,
					nmSekolah: nmSekolah.trim() || null,
				},
			};

			const res = await api('/data-matching/sync/import-pegawai', {
				method: 'POST',
				body: JSON.stringify(payload),
			});

			const result = res?.data || {};
			if (result.imported_count > 0) {
				toastStore.success(res.message || `Pegawai ${checkData?.nama || nip} berhasil dimasukkan ke Database Lokal`);
				onSuccess();
				onClose();
			} else {
				const reason = result.results?.[0]?.alasan || 'Terjadi kendala saat memproses impor data pegawai';
				errorMessage = reason;
			}
		} catch (err) {
			errorMessage = err.message || 'Gagal memasukkan data pegawai ke database lokal';
		} finally {
			loadingSubmit = false;
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Escape' && open && !loadingSubmit) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
	<!-- Backdrop Overlay -->
	<div
		class="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
		onclick={(e) => {
			if (e.target === e.currentTarget && !loadingSubmit) onClose();
		}}
		role="presentation"
	>
		<!-- Modal Box -->
		<div
			class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="p-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-purple-50/50 dark:bg-purple-950/20 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
					</div>
					<div>
						<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							Masukkan Pegawai SIASN ke Database Lokal
						</h3>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Membentuk data <strong>ta_orang</strong> & <strong>ta_pegawai</strong> beserta konfirmasi manual referensi pendidikan.
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					disabled={loadingSubmit}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
					title="Tutup (Esc)"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
				{#if errorMessage}
					<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
						<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				{#if loading}
					<div class="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
						<svg class="w-7 h-7 animate-spin text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
						<p class="text-xs font-medium">Memeriksa data pegawai & status referensi pendidikan dari SIASN...</p>
					</div>
				{:else if checkData}
					<!-- Profil Ringkas Calon Pegawai -->
					<div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5">
						<div class="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
							<div>
								<span class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{checkData.nama}</span>
								<div class="font-mono text-xs text-zinc-500 dark:text-zinc-400">{checkData.nip}</div>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
									{checkData.siasn?.status_cpns_pns === 'C' ? 'CPNS' : 'PNS'}
								</span>
								{#if checkData.siasn?.golongan}
									<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
										{checkData.siasn.golongan}
									</span>
								{/if}
							</div>
						</div>

						<div class="grid grid-cols-2 gap-2.5 text-[11px] pt-0.5">
							<div>
								<span class="text-[10px] uppercase font-bold text-zinc-400 block">Tempat / Tanggal Lahir</span>
								<span class="font-medium text-zinc-700 dark:text-zinc-300">
									{checkData.siasn?.tempat_lahir || '-'}, {checkData.siasn?.tanggal_lahir || '-'}
								</span>
							</div>
							<div>
								<span class="text-[10px] uppercase font-bold text-zinc-400 block">Email Resmi</span>
								<span class="font-medium text-zinc-700 dark:text-zinc-300 truncate block font-mono" title={checkData.siasn?.email}>
									{checkData.siasn?.email || '-'}
								</span>
							</div>
							<div class="col-span-2">
								<span class="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 block">Pendidikan Terdata di SIASN</span>
								<span class="font-bold text-purple-700 dark:text-purple-300">
									{checkData.siasn?.pendidikan_nama || '-'}
								</span>
							</div>
						</div>
					</div>

					<!-- Status Referensi Pendidikan Master Banner -->
					{#if checkData.matched_ref}
						<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
							<div class="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							</div>
							<div class="space-y-1">
								<div class="font-bold text-emerald-800 dark:text-emerald-200">Referensi Pendidikan Cocok di Database Lokal</div>
								<p class="text-[11px] text-emerald-700 dark:text-emerald-300">
									Jurusan SIASN cocok dengan master: <strong>{checkData.matched_ref.pend}</strong> ({checkData.matched_ref.tingkat || 'S-1'}). Anda dapat langsung mengonfirmasi atau memilih referensi lokal lain di bawah ini.
								</p>
							</div>
						</div>
					{:else}
						<div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
							<div class="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
							</div>
							<div class="space-y-1">
								<div class="font-bold text-amber-800 dark:text-amber-200">Referensi Belum Terdaftar di Tabel Master Lokal (ref_pend)</div>
								<p class="text-[11px] text-amber-700 dark:text-amber-300">
									Program studi <strong>"{checkData.siasn?.pendidikan_nama}"</strong> belum ada di tabel master pendidikan lokal (<code class="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">ref_pend</code>). Sesuai aturan, data master tidak dibuat otomatis tanpa konfirmasi Anda. Silakan pilih tab di bawah.
								</p>
							</div>
						</div>
					{/if}

					<!-- Mode Selector Tabs (Konfirmasi Manual) -->
					<div class="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
						<button
							type="button"
							onclick={() => { mode = 'new'; }}
							class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5
								{mode === 'new' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'}"
						>
							<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
							<span>Tambah Master Referensi Baru</span>
						</button>

						<button
							type="button"
							onclick={() => { mode = 'existing'; }}
							class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5
								{mode === 'existing' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'}"
						>
							<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
							<span>Pilih Master Referensi yang Ada</span>
						</button>
					</div>

					<!-- Form Mode 'new' -->
					{#if mode === 'new'}
						<div class="space-y-3 p-3.5 rounded-xl border border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10">
							<div class="text-[11px] font-bold text-purple-700 dark:text-purple-300">
								Formulir Tambah Master Referensi Pendidikan (ref_pend) Baru
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<!-- Tingkat Pendidikan -->
								<div class="space-y-1">
									<label for="importNewTktPendId" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
										Tingkat Pendidikan <span class="text-rose-500">*</span>
									</label>
									<select
										id="importNewTktPendId"
										bind:value={newTktPendId}
										class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
									>
										{#each checkData.tingkat_list as tkt}
											<option value={tkt.id}>{tkt.tktpend}</option>
										{/each}
									</select>
								</div>

								<!-- Kode BKN / SIASN -->
								<div class="space-y-1">
									<label for="importNewKode" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
										Kode Pendidikan SIASN (Opsional)
									</label>
									<input
										id="importNewKode"
										type="text"
										bind:value={newKode}
										placeholder="Kode BKN jika ada"
										class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
									/>
								</div>
							</div>

							<!-- Nama Program Studi / Pendidikan -->
							<div class="space-y-1">
								<label for="importNewPendNama" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
									Nama Pendidikan / Jurusan <span class="text-rose-500">*</span>
								</label>
								<input
									id="importNewPendNama"
									type="text"
									bind:value={newPendNama}
									placeholder="Contoh: S-1 ILMU HUKUM"
									class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
								/>
								<p class="text-[10px] text-zinc-400">Data ini akan disimpan ke tabel master referensi <code class="text-purple-600 dark:text-purple-400">ref_pend</code> dan dikaitkan ke riwayat pegawai.</p>
							</div>
						</div>
					{:else}
						<!-- Form Mode 'existing' -->
						<div class="space-y-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
							<div class="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
								Pilih Master Pendidikan yang Sudah Ada
							</div>

							<div class="space-y-1 relative">
								<label for="importSearchRefQuery" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
									Cari Nama Jurusan / Program Studi Lokal
								</label>
								<div class="relative">
									<input
										id="importSearchRefQuery"
										type="text"
										value={searchRefQuery}
										oninput={handleSearchRefInput}
										placeholder="Ketik untuk mencari referensi master lokal..."
										class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
									/>
									{#if loadingSearchRef}
										<div class="absolute right-2.5 top-2 text-zinc-400">
											<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
										</div>
									{/if}
								</div>

								<!-- Dropdown Hasil Pencarian -->
								{#if searchRefList.length > 0}
									<div class="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
										{#each searchRefList as ref}
											<button
												type="button"
												onclick={() => selectExistingRef(ref)}
												class="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-between cursor-pointer"
											>
												<span class="font-medium text-zinc-900 dark:text-zinc-100">{ref.pend}</span>
												<span class="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{ref.ref_tktpend?.tktpend || 'Tingkat ' + ref.tktpend_id}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>

							{#if selectedPendObj}
								<div class="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-between">
									<div>
										<span class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase block">Master Referensi Terpilih:</span>
										<span class="font-bold text-zinc-900 dark:text-zinc-100">{selectedPendObj.pend}</span>
									</div>
									<Badge variant="indigo">{selectedPendObj.ref_tktpend?.tktpend || selectedPendObj.tingkat || 'S-1'}</Badge>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Informasi Riwayat (Tahun Lulus & Nama Sekolah) -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
						<div class="space-y-1">
							<label for="importThnLulus" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Tahun Kelulusan
							</label>
							<input
								id="importThnLulus"
								type="text"
								bind:value={thnLulus}
								placeholder="Contoh: 2024"
								class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
							/>
						</div>

						<div class="space-y-1">
							<label for="importNmSekolah" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Nama Sekolah / Kampus (Opsional)
							</label>
							<input
								id="importNmSekolah"
								type="text"
								bind:value={nmSekolah}
								placeholder="Contoh: Universitas Tadulako"
								class="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
							/>
						</div>
					</div>

					<!-- Ringkasan Operasi Atomik Database -->
					<div class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-purple-900 dark:text-purple-200 space-y-1">
						<div class="font-bold flex items-center gap-1.5">
							<svg class="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
							<span>Operasi yang akan dieksekusi secara atomik:</span>
						</div>
						<ol class="list-decimal list-inside space-y-0.5 pl-1 text-[11px] text-purple-800 dark:text-purple-300">
							<li>Membuat identitas diri pada <strong>ta_orang</strong> (nama bersih tanpa gelar, NIK, TTL, gender, agama, status perkawinan, email resmi).</li>
							<li>Membuat entri kepegawaian <strong>ta_pegawai</strong> (NIP, status aktif CPNS/PNS).</li>
							<li>Membentuk riwayat golongan awal (<code>rwt_gol</code>) dan riwayat pendidikan awal (<code>rwt_pend</code>).</li>
							<li>Menyimpan dokumen SK CPNS/PNS pada <code>ta_cpnspns</code>.</li>
						</ol>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-end gap-2.5 shrink-0">
				<Button
					variant="secondary"
					onclick={onClose}
					disabled={loadingSubmit}
					class="text-xs"
				>
					Batal
				</Button>

				<Button
					variant="primary"
					onclick={handleSubmit}
					disabled={loading || !checkData}
					loading={loadingSubmit}
					class="text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
					<span>{mode === 'new' ? 'Simpan Master & Masukkan Pegawai' : 'Konfirmasi & Masukkan Pegawai'}</span>
				</Button>
			</div>
		</div>
	</div>
{/if}
