<script>
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';

	const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';

	let {
		open = false,
		pegawaiId = '',
		item = null, // Jika null = Create mode, jika ada object = Edit mode
		onClose = () => {},
		onSuccess = () => {}
	} = $props();

	// Form fields
	let gol_id = $state('');
	let jnsKp_id = $state('');
	let sk = $state('');
	let tglSk = $state('');
	let tmtSk = $state('');
	let maskerThn = $state('');
	let maskerBln = $state('');
	let pertekBkn = $state('');
	let tglPertek = $state('');
	let gapok = $state('');
	let pengesahan = $state('');

	// File upload state
	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi
	let refGolongan = $state([]);
	let refJnsKp = $state([]);

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

	function findKdGolByGol(golName) {
		if (!golName || golName === '-') return '';
		const clean = String(golName).trim().toLowerCase();
		const found = refGolongan.find(g => 
			g.kdGol === golName || 
			g.gol.toLowerCase() === clean || 
			clean.startsWith(g.gol.toLowerCase()) ||
			`${g.gol} - ${g.pangkat}`.toLowerCase() === clean
		);
		return found ? found.kdGol : '';
	}

	// Reset / Load form values saat modal dibuka
	$effect(() => {
		if (open) {
			loadReferensi();
			errorMessage = '';
			fileDokumen = null;

			if (item) {
				// Edit mode
				gol_id = item.gol_id || (item.golongan ? findKdGolByGol(item.golongan) : '');
				jnsKp_id = item.jnsKp_id !== undefined && item.jnsKp_id !== null ? String(item.jnsKp_id) : '';
				sk = item.sk && item.sk !== '-' ? item.sk : '';
				tglSk = toDateInputVal(item.tglSk || item.tgl_sk);
				tmtSk = toDateInputVal(item.tmtSk || item.tmt_sk);

				// Parse masa kerja
				if (item.maskerThn !== undefined && item.maskerThn !== null) {
					maskerThn = String(item.maskerThn);
					maskerBln = String(item.maskerBln || '0');
				} else if (item.masa_kerja && item.masa_kerja !== '-') {
					const match = item.masa_kerja.match(/(\d+)\s*Thn\s*(\d+)\s*Bln/i);
					if (match) {
						maskerThn = match[1];
						maskerBln = match[2];
					}
				}

				pertekBkn = item.pertekBkn || item.pertek_bkn || '';
				if (pertekBkn === '-') pertekBkn = '';
				tglPertek = toDateInputVal(item.tglPertek || item.tgl_pertek);
				
				// Parse gapok
				if (item.gapok_raw !== undefined && item.gapok_raw !== null) {
					gapok = String(item.gapok_raw);
				} else if (item.gapok && item.gapok !== '-') {
					const num = typeof item.gapok === 'number' 
						? item.gapok 
						: parseInt(String(item.gapok).replace(/[^0-9]/g, ''));
					gapok = isNaN(num) ? '' : String(num);
				} else {
					gapok = '';
				}
				pengesahan = item.pengesahan && item.pengesahan !== '-' ? item.pengesahan : '';
				existingDokumen = item.dokumen_sk || null;
			} else {
				// Create mode (kosongkan)
				gol_id = '';
				jnsKp_id = '';
				sk = '';
				tglSk = '';
				tmtSk = '';
				maskerThn = '';
				maskerBln = '';
				pertekBkn = '';
				tglPertek = '';
				gapok = '';
				pengesahan = '';
				existingDokumen = null;
			}
		}
	});

	async function loadReferensi() {
		if (refGolongan.length > 0 && refJnsKp.length > 0) {
			if (item && !gol_id) {
				gol_id = item.gol_id || (item.golongan ? findKdGolByGol(item.golongan) : '');
			}
			return;
		}
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/golongan');
			if (res?.data) {
				refGolongan = res.data.golongan || [];
				refJnsKp = res.data.jenis_kp || [];
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

	function handleFileChange(e) {
		const files = e.target.files;
		if (files && files[0]) {
			const file = files[0];
			if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
				errorMessage = 'Format file tidak didukung. Hanya file PDF yang diperbolehkan';
				fileDokumen = null;
				if (fileInputRef) fileInputRef.value = '';
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				errorMessage = 'Ukuran file maksimal 5 MB';
				fileDokumen = null;
				if (fileInputRef) fileInputRef.value = '';
				return;
			}
			fileDokumen = file;
			errorMessage = '';
		}
	}

	function removeSelectedFile() {
		fileDokumen = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	async function handleSubmit(e) {
		e?.preventDefault?.();
		errorMessage = '';

		// Validasi dasar
		if (!gol_id) {
			errorMessage = 'Pangkat / Golongan wajib dipilih';
			return;
		}
		if (!tmtSk) {
			errorMessage = 'TMT Golongan wajib diisi';
			return;
		}
		if (!tglSk) {
			errorMessage = 'Tanggal SK wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			formData.append('gol_id', gol_id);
			formData.append('tglSk', tglSk);
			formData.append('tmtSk', tmtSk);
			
			if (jnsKp_id) formData.append('jnsKp_id', jnsKp_id);
			if (sk.trim()) formData.append('sk', sk.trim());
			if (maskerThn !== '') formData.append('maskerThn', maskerThn);
			if (maskerBln !== '') formData.append('maskerBln', maskerBln);
			if (pertekBkn.trim()) formData.append('pertekBkn', pertekBkn.trim());
			if (tglPertek) formData.append('tglPertek', tglPertek);
			if (gapok) formData.append('gapok', gapok);
			if (pengesahan.trim()) formData.append('pengesahan', pengesahan.trim());
			if (fileDokumen) formData.append('dokumen_sk', fileDokumen);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-golongan/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat Golongan berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-golongan`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat Golongan baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat golongan';
			toast.error(errorMessage);
		} finally {
			loading = false;
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Escape' && open && !loading) {
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
			if (e.target === e.currentTarget && !loading) onClose();
		}}
		role="presentation"
	>
		<!-- Modal Content Box -->
		<div 
			class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Modal Header -->
			<div class="p-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="m15.4 12.5 2.1 7.5-5.5-3-5.5 3 2.1-7.5"/></svg>
					</div>
					<div>
						<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Riwayat Golongan & Pangkat' : 'Tambah Riwayat Golongan & Pangkat'}
						</h3>
						<p class="text-xs text-zinc-400">
							{item ? 'Perbarui data SK & TMT kenaikan pangkat pegawai.' : 'Input riwayat kenaikan pangkat baru pegawai.'}
						</p>
					</div>
				</div>

				<button 
					type="button"
					onclick={onClose}
					disabled={loading}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
					title="Tutup (Esc)"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Modal Body / Form -->
			<form id="form-riwayat-golongan" onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
				{#if errorMessage}
					<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- Section: Jenis KP & Golongan -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Jenis Kenaikan Pangkat -->
					<div class="space-y-1.5">
						<label for="jnsKp_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenis Kenaikan Pangkat
						</label>
						<select
							id="jnsKp_id"
							bind:value={jnsKp_id}
							disabled={loading || loadingRef}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						>
							<option value="">-- Pilih Jenis KP (Opsional) --</option>
							{#each refJnsKp as jk}
								<option value={String(jk.id)}>{jk.jnskp}</option>
							{/each}
						</select>
					</div>

					<!-- Pilihan Golongan -->
					<div class="space-y-1.5">
						<label for="gol_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Golongan / Pangkat <span class="text-rose-500">*</span>
						</label>
						<select
							id="gol_id"
							bind:value={gol_id}
							required
							disabled={loading || loadingRef}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						>
							<option value="">-- Pilih Golongan / Pangkat --</option>
							{#each refGolongan as rg}
								<option value={rg.kdGol}>{rg.gol} - {rg.pangkat}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Section: SK & TMT -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-1.5 sm:col-span-1">
						<label for="sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor SK
						</label>
						<input 
							id="sk"
							type="text"
							placeholder="Contoh: 823/01/BKPSDM"
							bind:value={sk}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal SK <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglSk"
							type="date"
							bind:value={tglSk}
							required
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tmtSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT Golongan <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tmtSk"
							type="date"
							bind:value={tmtSk}
							required
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Masa Kerja Golongan & Gaji Pokok -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-1.5">
						<label for="maskerThn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Kerja (Tahun)
						</label>
						<input 
							id="maskerThn"
							type="number"
							min="0"
							placeholder="Contoh: 10"
							bind:value={maskerThn}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="maskerBln" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Kerja (Bulan)
						</label>
						<input 
							id="maskerBln"
							type="number"
							min="0"
							max="11"
							placeholder="Contoh: 6"
							bind:value={maskerBln}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="gapok" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Gaji Pokok (Rp)
						</label>
						<input 
							id="gapok"
							type="number"
							min="0"
							placeholder="Contoh: 3500000"
							bind:value={gapok}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Pertek BKN -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="pertekBkn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor Pertek BKN
						</label>
						<input 
							id="pertekBkn"
							type="text"
							placeholder="Contoh: PK-12345/BKN"
							bind:value={pertekBkn}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglPertek" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Pertek BKN
						</label>
						<input 
							id="tglPertek"
							type="date"
							bind:value={tglPertek}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Pejabat Penandatangan -->
				<div class="space-y-1.5">
					<label for="pengesahan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Pejabat Penandatangan
					</label>
					<input 
						id="pengesahan"
						type="text"
						placeholder="Contoh: Kepala BKN / Bupati / Gubernur"
						bind:value={pengesahan}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Upload Dokumen SK -->
				<div class="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<div class="flex items-center justify-between">
						<label for="file_sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<span>Upload Dokumen SK (PDF)</span>
						</label>

						{#if existingDokumen}
							<a 
								href={`${BACKEND_URL}${existingDokumen}`} 
								target="_blank" 
								rel="noreferrer"
								class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
							>
								<span>Lihat Dokumen Saat Ini</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
							</a>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<input 
							id="file_sk"
							type="file"
							accept=".pdf,application/pdf"
							bind:this={fileInputRef}
							onchange={handleFileChange}
							disabled={loading}
							class="hidden"
						/>

						<button
							type="button"
							onclick={() => fileInputRef?.click()}
							disabled={loading}
							class="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
							<span>{existingDokumen ? 'Ganti File SK (PDF)' : 'Pilih File SK (PDF)'}</span>
						</button>

						{#if fileDokumen}
							<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs">
								<span class="truncate max-w-[240px] font-medium text-indigo-900 dark:text-indigo-200">
									{fileDokumen.name}
								</span>
								<button
									type="button"
									onclick={removeSelectedFile}
									class="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
									title="Batal pilih file"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
								</button>
							</div>
						{:else if !existingDokumen}
							<span class="text-[11px] text-zinc-400">Format: PDF (Maks. 5 MB)</span>
						{/if}
					</div>
				</div>
			</form>

			<!-- Modal Footer Actions -->
			<div class="p-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-end gap-2.5 shrink-0">
				<Button
					variant="ghost"
					onclick={onClose}
					disabled={loading}
				>
					Batal
				</Button>
				<Button
					type="submit"
					variant="primary"
					loading={loading}
					onclick={handleSubmit}
				>
					{item ? 'Simpan Perubahan' : 'Tambah Riwayat'}
				</Button>
			</div>
		</div>
	</div>
{/if}
