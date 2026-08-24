<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';

	const toast = toastStore;

	let {
		open = false,
		pegawaiId = null,
		item = null,
		refGolongan = [],
		onClose = () => {},
		onSuccess = () => {}
	} = $props();

	// Form states
	let spns_id = $state('1'); // '1' = CPNS, '2' = PNS
	let sk = $state('');
	let tglsk = $state('');
	let tmtsk = $state('');
	let gol_id = $state('');
	let maskerThn = $state('');
	let maskerBln = $state('');
	let pertekBkn = $state('');
	let tglPertekBkn = $state('');
	let sttpl = $state('');
	let tglsttpl = $state('');
	let noKarpeg = $state('');
	let tglKarpeg = $state('');
	let penanda_tangan = $state('');

	// Upload Dokumen SK
	let fileDokumen = $state(null);
	let fileInputRef = $state(null);
	let existingDokumenUrl = $state(null);

	let internalRefGolongan = $state([]);
	let loadingRef = $state(false);

	let loading = $state(false);
	let errorMessage = $state('');

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	const listGolongan = $derived(refGolongan && refGolongan.length > 0 ? refGolongan : internalRefGolongan);

	function findKdGolByGol(golStr) {
		if (!golStr) return '';
		const normalized = golStr.replace(/^(Golongan|Gol\.?)\s*/i, '').trim().split(/\s*-\s*/)[0].trim().toLowerCase();
		const found = listGolongan.find(g => 
			g.gol?.trim().toLowerCase() === normalized ||
			g.pangkat?.trim().toLowerCase() === normalized
		);
		return found ? (found.id || found.kdGol) : '';
	}

	async function loadReferensi() {
		if (refGolongan && refGolongan.length > 0) return;
		if (internalRefGolongan.length > 0) return;

		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/golongan');
			if (res?.data?.golongan) {
				internalRefGolongan = res.data.golongan || [];
				if (item && !gol_id) {
					gol_id = item.gol_id || (item.golongan ? findKdGolByGol(item.golongan) : '');
				}
			}
		} catch (err) {
			console.error('Gagal memuat referensi golongan', err);
		} finally {
			loadingRef = false;
		}
	}

	// Helper formatDate to YYYY-MM-DD for input[type="date"]
	function toDateInputVal(dateVal) {
		if (!dateVal || dateVal === '-' || dateVal === 'null') return '';
		
		if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
			return String(dateVal).substring(0, 10);
		}
		
		const dmyMatch = String(dateVal).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
		if (dmyMatch) {
			const day = dmyMatch[1].padStart(2, '0');
			const month = dmyMatch[2].padStart(2, '0');
			const year = dmyMatch[3];
			return `${year}-${month}-${day}`;
		}

		const months = {
			'januari': '01', 'jan': '01',
			'februari': '02', 'feb': '02',
			'maret': '03', 'mar': '03',
			'april': '04', 'apr': '04',
			'mei': '05', 'may': '05',
			'juni': '06', 'jun': '06',
			'juli': '07', 'jul': '07',
			'agustus': '08', 'ags': '08', 'agt': '08', 'aug': '08',
			'september': '09', 'sep': '09',
			'oktober': '10', 'okt': '10', 'oct': '10',
			'november': '11', 'nov': '11',
			'desember': '12', 'des': '12', 'dec': '12'
		};

		const parts = String(dateVal).trim().split(/\s+/);
		if (parts.length >= 3) {
			const day = parts[0].padStart(2, '0');
			const monthKey = parts[1].toLowerCase().replace(/[^a-z]/g, '');
			const year = parts[2];
			if (months[monthKey] && /^\d{4}$/.test(year)) {
				return `${year}-${months[monthKey]}-${day}`;
			}
		}

		const d = new Date(dateVal);
		if (!isNaN(d.getTime())) {
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		}

		return '';
	}

	// Reset / Load form values saat modal dibuka
	$effect(() => {
		if (open) {
			errorMessage = '';
			fileDokumen = null;
			if (fileInputRef) fileInputRef.value = '';
			loadReferensi();

			if (item) {
				// Edit mode
				spns_id = String(item.spns_id || (item.status_pns?.includes('CPNS') ? '1' : '2'));
				sk = item.sk && item.sk !== '-' ? item.sk : '';
				tglsk = toDateInputVal(item.tglsk || item.tgl_sk);
				tmtsk = toDateInputVal(item.tmtsk || item.tmt_sk);
				gol_id = item.gol_id ? String(item.gol_id) : (item.golongan ? findKdGolByGol(item.golongan) : '');
				maskerThn = item.maskerThn !== undefined && item.maskerThn !== null && item.maskerThn !== '-' ? String(item.maskerThn) : '';
				maskerBln = item.maskerBln !== undefined && item.maskerBln !== null && item.maskerBln !== '-' ? String(item.maskerBln) : '';
				pertekBkn = item.pertekBkn || (item.pertek_bkn && item.pertek_bkn !== '-' ? item.pertek_bkn : '');
				tglPertekBkn = toDateInputVal(item.tglPertekBkn || item.tgl_pertek);
				sttpl = item.sttpl && item.sttpl !== '-' ? item.sttpl : '';
				tglsttpl = toDateInputVal(item.tglsttpl || item.tgl_sttpl);
				noKarpeg = item.noKarpeg || (item.no_karpeg && item.no_karpeg !== '-' ? item.no_karpeg : '');
				tglKarpeg = toDateInputVal(item.tglKarpeg || item.tgl_karpeg);
				penanda_tangan = item.penanda_tangan && item.penanda_tangan !== '-' ? item.penanda_tangan : '';
				existingDokumenUrl = item.dokumen_sk || null;
			} else {
				// Create mode
				spns_id = '1';
				sk = '';
				tglsk = '';
				tmtsk = '';
				gol_id = '';
				maskerThn = '';
				maskerBln = '';
				pertekBkn = '';
				tglPertekBkn = '';
				sttpl = '';
				tglsttpl = '';
				noKarpeg = '';
				tglKarpeg = '';
				penanda_tangan = '';
				existingDokumenUrl = null;
			}
		}
	});

	// Handle File upload
	function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.type !== 'application/pdf') {
			errorMessage = 'File dokumen harus berformat PDF';
			fileDokumen = null;
			if (fileInputRef) fileInputRef.value = '';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			errorMessage = 'Ukuran file dokumen maksimal 5MB';
			fileDokumen = null;
			if (fileInputRef) fileInputRef.value = '';
			return;
		}

		errorMessage = '';
		fileDokumen = file;
	}

	function removeSelectedFile() {
		fileDokumen = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	async function handleSubmit(e) {
		e?.preventDefault?.();
		errorMessage = '';

		// Validasi dasar
		if (!spns_id) {
			errorMessage = 'Status penetapan (CPNS / PNS) wajib dipilih';
			return;
		}
		if (!sk.trim()) {
			errorMessage = 'Nomor SK wajib diisi';
			return;
		}
		if (!tglsk) {
			errorMessage = 'Tanggal SK wajib diisi';
			return;
		}
		if (!tmtsk) {
			errorMessage = 'TMT SK wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			formData.append('spns_id', spns_id);
			formData.append('sk', sk.trim());
			formData.append('tglsk', tglsk);
			formData.append('tmtsk', tmtsk);
			if (gol_id) formData.append('gol_id', gol_id);
			if (maskerThn) formData.append('maskerThn', maskerThn);
			if (maskerBln) formData.append('maskerBln', maskerBln);

			// Khusus CPNS: Pertek BKN
			if (spns_id === '1') {
				if (pertekBkn.trim()) formData.append('pertekBkn', pertekBkn.trim());
				if (tglPertekBkn) formData.append('tglPertekBkn', tglPertekBkn);
			}

			// Khusus PNS: STTPL & KARPEG (Pertek BKN tidak perlu di SK PNS)
			if (spns_id === '2') {
				if (sttpl.trim()) formData.append('sttpl', sttpl.trim());
				if (tglsttpl) formData.append('tglsttpl', tglsttpl);
				if (noKarpeg.trim()) formData.append('noKarpeg', noKarpeg.trim());
				if (tglKarpeg) formData.append('tglKarpeg', tglKarpeg);
			}

			if (penanda_tangan.trim()) formData.append('penanda_tangan', penanda_tangan.trim());

			if (fileDokumen) {
				formData.append('dokumen_sk', fileDokumen);
			}

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/cpns-pns/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Data CPNS/PNS berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/cpns-pns`, {
					method: 'POST',
					body: formData
				});
				toast.success('Data CPNS/PNS baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan data CPNS/PNS';
			toast.error(errorMessage);
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' && open) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	>
		<!-- Modal Container -->
		<div class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] transition-all transform animate-in zoom-in-95 duration-150 mx-3 sm:mx-auto">
			
			<!-- Modal Header -->
			<div class="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Data CPNS / PNS' : 'Tambah Data CPNS / PNS'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi penetapan SK CPNS atau SK Pengangkatan PNS' : 'Isi rincian data penetapan SK CPNS / SK Pengangkatan PNS dan unggah berkas SK'}
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
					aria-label="Tutup Modal"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body / Form -->
			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
				
				{#if errorMessage}
					<div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- Section: Status Penetapan & Golongan Ruang -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="spns_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenis SK Penetapan <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<select
								id="spns_id"
								bind:value={spns_id}
								disabled={loading}
								required
								class="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer shadow-2xs"
							>
								<option value="1">Calon Pegawai Negeri Sipil (CPNS)</option>
								<option value="2">Pegawai Negeri Sipil (PNS)</option>
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="gol_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Golongan Ruang
						</label>
						<div class="relative">
							<select
								id="gol_id"
								bind:value={gol_id}
								disabled={loading}
								class="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer shadow-2xs"
							>
								<option value="">-- Pilih Golongan Ruang --</option>
								{#each listGolongan as g}
									<option value={g.id || g.kdGol}>{g.gol} {g.pangkat ? `- ${g.pangkat}` : ''}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Section: Nomor SK -->
				<div class="space-y-1.5">
					<label for="sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Nomor SK <span class="text-rose-500">*</span>
					</label>
					<input 
						id="sk"
						type="text"
						placeholder="Contoh: 821.2/062/BKPSDMD-B.TU/2020"
						bind:value={sk}
						disabled={loading}
						required
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium font-mono"
					/>
				</div>

				<!-- Section: Tanggal SK & TMT SK -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tglsk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal SK <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglsk"
							type="date"
							bind:value={tglsk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tmtsk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT SK <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tmtsk"
							type="date"
							bind:value={tmtsk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Masa Kerja Golongan (Tahun & Bulan) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="maskerThn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Kerja Golongan (Tahun)
						</label>
						<input 
							id="maskerThn"
							type="number"
							min="0"
							max="99"
							placeholder="Contoh: 0"
							bind:value={maskerThn}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="maskerBln" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Kerja Golongan (Bulan)
						</label>
						<input 
							id="maskerBln"
							type="number"
							min="0"
							max="11"
							placeholder="Contoh: 0"
							bind:value={maskerBln}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Pejabat Penetap -->
				<div class="space-y-1.5">
					<label for="penanda_tangan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Pejabat Yang Menetapkan / Menandatangani
					</label>
					<input 
						id="penanda_tangan"
						type="text"
						placeholder="Contoh: BUPATI TOJO UNA-UNA / KEPALA BKN"
						bind:value={penanda_tangan}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
					/>
				</div>

				<!-- Bagian Khusus CPNS: Pertek BKN -->
				{#if spns_id === '1'}
					<div class="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
						<div class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
							<h4 class="text-xs font-bold text-indigo-900 dark:text-indigo-200">
								Informasi Persetujuan Teknis BKN (CPNS)
							</h4>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div class="space-y-1.5">
								<label for="pertekBkn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Nomor Pertek BKN
								</label>
								<input 
									id="pertekBkn"
									type="text"
									placeholder="Contoh: 821.2/123/BKN/2020"
									bind:value={pertekBkn}
									disabled={loading}
									class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="tglPertekBkn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Tanggal Pertek BKN
								</label>
								<input 
									id="tglPertekBkn"
									type="date"
									bind:value={tglPertekBkn}
									disabled={loading}
									class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- Bagian Khusus PNS: STTPL (Prajabatan / Latsar) -->
				{#if spns_id === '2'}
					<div class="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-3">
						<div class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
							<h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200">
								Informasi STTPL (Prajabatan / Latsar PNS)
							</h4>
						</div>

						<!-- STTPL -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div class="space-y-1.5">
								<label for="sttpl" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Nomor STTPL / Diklat Prajabatan
								</label>
								<input 
									id="sttpl"
									type="text"
									placeholder="Contoh: 125/II-PSO/STTPL/XI/2019"
									bind:value={sttpl}
									disabled={loading}
									class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="tglsttpl" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Tanggal STTPL
								</label>
								<input 
									id="tglsttpl"
									type="date"
									bind:value={tglsttpl}
									disabled={loading}
									class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- Section: Upload Dokumen SK (PDF) -->
				<div class="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<label for="file_dokumen_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600 dark:text-indigo-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
							<span>Upload Berkas SK {spns_id === '1' ? 'CPNS' : 'PNS'} (PDF)</span>
						</span>
						<span class="text-[11px] font-normal text-zinc-400">Maks. 5MB</span>
					</label>

					<div class="flex items-center gap-3">
						<input
							id="file_dokumen_sk"
							type="file"
							accept="application/pdf"
							bind:this={fileInputRef}
							onchange={handleFileChange}
							disabled={loading}
							class="block w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30"
						/>

						{#if fileDokumen}
							<button
								type="button"
								onclick={removeSelectedFile}
								class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0 cursor-pointer"
								title="Batalkan file terpilih"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
							</button>
						{/if}
					</div>

					{#if existingDokumenUrl && !fileDokumen}
						<div class="flex items-center gap-2 pt-1">
							<a
								href={`${API_BASE}${existingDokumenUrl}`}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v6"/><path d="m13 16-3 3-3-3"/></svg>
								<span>Lihat Dokumen SK Tersimpan</span>
							</a>
							<span class="text-[10px] text-zinc-400">(Pilih file baru jika ingin mengganti)</span>
						</div>
					{/if}
				</div>

				<!-- Modal Footer Buttons -->
				<div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
					<Button
						variant="secondary"
						onclick={onClose}
						disabled={loading}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						type="submit"
						{loading}
					>
						{item ? 'Simpan Perubahan' : 'Tambah Riwayat CPNS / PNS'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
