<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';

	const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
	const toast = toastStore;

	let {
		open = false,
		pegawaiId = null,
		item = null,
		onClose = () => {},
		onSuccess = () => {}
	} = $props();

	// Form states
	let gol_id = $state('');
	let sk = $state('');
	let tglSk = $state('');
	let tmtSk = $state('');
	let maskerThn = $state('');
	let maskerBln = $state('');
	let gapok = $state('');
	let pengesahan = $state('');

	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi Golongan
	let refGolongan = $state([]);

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
				gol_id = item.gol_id || (item.gol_kode ? findKdGolByGol(item.gol_kode) : (item.golongan ? findKdGolByGol(item.golongan) : ''));
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
				sk = '';
				tglSk = '';
				tmtSk = '';
				maskerThn = '';
				maskerBln = '';
				gapok = '';
				pengesahan = '';
				existingDokumen = null;
			}
		}
	});

	async function loadReferensi() {
		if (refGolongan.length > 0) {
			if (item && !gol_id) {
				gol_id = item.gol_id || (item.gol_kode ? findKdGolByGol(item.gol_kode) : (item.golongan ? findKdGolByGol(item.golongan) : ''));
			}
			return;
		}
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/golongan');
			if (res?.data) {
				refGolongan = res.data.golongan || [];
				if (item && !gol_id) {
					gol_id = item.gol_id || (item.gol_kode ? findKdGolByGol(item.gol_kode) : (item.golongan ? findKdGolByGol(item.golongan) : ''));
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
		if (!tglSk) {
			errorMessage = 'Tanggal SK KGB wajib diisi';
			return;
		}
		if (!tmtSk) {
			errorMessage = 'TMT KGB wajib diisi';
			return;
		}
		if (!gapok || isNaN(parseInt(gapok))) {
			errorMessage = 'Gaji Pokok Baru wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			if (gol_id) formData.append('gol_id', gol_id);
			if (sk.trim()) formData.append('sk', sk.trim());
			formData.append('tglSk', tglSk);
			formData.append('tmtSk', tmtSk);
			
			if (maskerThn !== '') formData.append('maskerThn', maskerThn);
			if (maskerBln !== '') formData.append('maskerBln', maskerBln);
			formData.append('gapok', gapok);
			if (pengesahan.trim()) formData.append('pengesahan', pengesahan.trim());
			if (fileDokumen) formData.append('dokumen_sk', fileDokumen);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-kgb/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat KGB berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-kgb`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat KGB baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat KGB';
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
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Riwayat Kenaikan Gaji Berkala' : 'Tambah Riwayat Kenaikan Gaji Berkala'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi SK & TMT KGB' : 'Isi formulir kenaikan gaji berkala (KGB) pegawai'}
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

				<!-- Section: Golongan -->
				<div class="space-y-1.5">
					<label for="gol_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Golongan / Pangkat saat KGB
					</label>
					<div class="relative">
						<select
							id="gol_id"
							bind:value={gol_id}
							disabled={loading || loadingRef}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer"
						>
							<option value="">-- Pilih Golongan (Opsional) --</option>
							{#each refGolongan as rg}
								<option value={rg.kdGol}>{rg.gol} — {rg.pangkat}</option>
							{/each}
						</select>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
						</div>
					</div>
				</div>

				<!-- Section: No SK & Tanggal SK -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor SK KGB
						</label>
						<input 
							id="sk"
							type="text"
							placeholder="Contoh: 822/01/KGB/2024"
							bind:value={sk}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal SK KGB <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglSk"
							type="date"
							bind:value={tglSk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: TMT KGB & Gaji Pokok Baru -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tmtSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT KGB (Kenaikan Gaji Berkala) <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tmtSk"
							type="date"
							bind:value={tmtSk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="gapok" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Gaji Pokok Baru (Rp) <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-zinc-400">Rp</span>
							<input 
								id="gapok"
								type="number"
								min="0"
								placeholder="3500000"
								bind:value={gapok}
								disabled={loading}
								required
								class="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium font-mono"
							/>
						</div>
					</div>
				</div>

				<!-- Section: Masa Kerja -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="maskerThn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Kerja (Tahun)
						</label>
						<input 
							id="maskerThn"
							type="number"
							min="0"
							max="99"
							placeholder="Contoh: 12"
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
							placeholder="Contoh: 0"
							bind:value={maskerBln}
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
						placeholder="Contoh: Kepala BKPSDM / Kepala Dinas"
						bind:value={pengesahan}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Upload Dokumen SK KGB -->
				<div class="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<div class="flex items-center justify-between">
						<label for="file_sk_kgb" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<span>Upload Dokumen SK KGB (PDF)</span>
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
							id="file_sk_kgb"
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
						{item ? 'Simpan Perubahan' : 'Tambah Riwayat KGB'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
