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
	let tktHukuman_id = $state('');
	let jnsHukuman_id = $state('');
	let skHd = $state('');
	let tglSkHd = $state('');
	let tmtSkHd = $state('');
	let masaHukumanThn = $state('0');
	let masaHukumanBln = $state('0');
	let tglAkhirHukuman = $state('');
	let noPP = $state('Peraturan Pemerintah Nomor 94 Tahun 2021');
	let alasanHukuman = $state('');
	let ket = $state('');

	// Upload SK Hukdis
	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi
	let refTktHukuman = $state([]);
	let refJnsHukuman = $state([]);

	// Filtered Jenis Hukuman berdasarkan Tingkat Hukuman
	let filteredJenisHukuman = $derived(
		tktHukuman_id
			? refJnsHukuman.filter(j => String(j.tktHukuman_id || '').trim().toLowerCase() === String(tktHukuman_id || '').trim().toLowerCase())
			: refJnsHukuman
	);

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
			loadReferensi();
			errorMessage = '';
			fileDokumen = null;

			if (item) {
				// Edit mode
				tktHukuman_id = item.tktHukuman_id || '';
				jnsHukuman_id = item.jnsHukuman_id || '';
				skHd = item.skHd && item.skHd !== '-' ? item.skHd : (item.sk && item.sk !== '-' ? item.sk : '');
				tglSkHd = toDateInputVal(item.tglSkHd || item.tgl_sk);
				tmtSkHd = toDateInputVal(item.tmtSkHd || item.tmt_sk);
				masaHukumanThn = item.masaHukumanThn !== undefined ? String(item.masaHukumanThn) : '0';
				masaHukumanBln = item.masaHukumanBln !== undefined ? String(item.masaHukumanBln) : '0';
				tglAkhirHukuman = toDateInputVal(item.tglAkhirHukuman || item.tgl_akhir);
				noPP = item.noPP && item.noPP !== '-' ? item.noPP : (item.no_pp && item.no_pp !== '-' ? item.no_pp : 'Peraturan Pemerintah Nomor 94 Tahun 2021');
				alasanHukuman = item.alasanHukuman && item.alasanHukuman !== '-' ? item.alasanHukuman : (item.alasan && item.alasan !== '-' ? item.alasan : '');
				ket = item.ket && item.ket !== '-' ? item.ket : '';
				existingDokumen = item.dokumen_sk || null;
			} else {
				// Create mode
				tktHukuman_id = '';
				jnsHukuman_id = '';
				skHd = '';
				tglSkHd = '';
				tmtSkHd = '';
				masaHukumanThn = '0';
				masaHukumanBln = '0';
				tglAkhirHukuman = '';
				noPP = 'Peraturan Pemerintah Nomor 94 Tahun 2021';
				alasanHukuman = '';
				ket = '';
				existingDokumen = null;
			}
		}
	});

	async function loadReferensi() {
		if (refTktHukuman.length > 0 && refJnsHukuman.length > 0) return;
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/hukdis');
			if (res?.data) {
				refTktHukuman = res.data.tingkat_hukuman || [];
				refJnsHukuman = res.data.jenis_hukuman || [];
			}
		} catch (err) {
			console.error('Gagal memuat referensi hukdis', err);
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
				errorMessage = 'Ukuran file SK maksimal 5 MB';
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
		if (!tktHukuman_id) {
			errorMessage = 'Tingkat hukuman wajib dipilih';
			return;
		}
		if (!jnsHukuman_id) {
			errorMessage = 'Jenis hukuman wajib dipilih';
			return;
		}
		if (!skHd.trim()) {
			errorMessage = 'Nomor SK Hukuman Disiplin wajib diisi';
			return;
		}
		if (!tglSkHd) {
			errorMessage = 'Tanggal SK Hukuman Disiplin wajib diisi';
			return;
		}
		if (!tmtSkHd) {
			errorMessage = 'TMT Mulai Hukuman Disiplin wajib diisi';
			return;
		}
		if (!tglAkhirHukuman) {
			errorMessage = 'Tanggal Akhir Hukuman Disiplin wajib diisi';
			return;
		}
		if (!alasanHukuman.trim()) {
			errorMessage = 'Alasan penjatuhan hukuman disiplin wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			formData.append('tktHukuman_id', tktHukuman_id);
			formData.append('jnsHukuman_id', jnsHukuman_id);
			formData.append('skHd', skHd.trim());
			formData.append('tglSkHd', tglSkHd);
			formData.append('tmtSkHd', tmtSkHd);
			formData.append('masaHukumanThn', masaHukumanThn || '0');
			formData.append('masaHukumanBln', masaHukumanBln || '0');
			formData.append('tglAkhirHukuman', tglAkhirHukuman);
			if (noPP.trim()) formData.append('noPP', noPP.trim());
			formData.append('alasanHukuman', alasanHukuman.trim());
			if (ket.trim()) formData.append('ket', ket.trim());
			if (fileDokumen) formData.append('dokumen_sk', fileDokumen);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-hukdis/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat hukuman disiplin berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-hukdis`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat hukuman disiplin baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat hukuman disiplin';
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
					<div class="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Catatan Hukuman Disiplin' : 'Tambah Catatan Hukuman Disiplin'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi SK dan sanksi penjatuhan hukuman disiplin' : 'Isi formulir rekam jejak penjatuhan hukuman disiplin PNS'}
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

				<!-- Section: Tingkat Hukuman & Jenis Hukuman -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tktHukuman_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tingkat Hukuman Disiplin <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<select
								id="tktHukuman_id"
								bind:value={tktHukuman_id}
								onchange={() => {
									if (jnsHukuman_id && !refJnsHukuman.some(j => String(j.id) === String(jnsHukuman_id) && String(j.tktHukuman_id || '').trim().toLowerCase() === String(tktHukuman_id || '').trim().toLowerCase())) {
										jnsHukuman_id = '';
									}
								}}
								disabled={loading || loadingRef}
								required
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="">-- Pilih Tingkat Hukuman --</option>
								{#each refTktHukuman as th}
									<option value={th.id}>{th.tktHukuman}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="jnsHukuman_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenis Hukuman Disiplin <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<select
								id="jnsHukuman_id"
								bind:value={jnsHukuman_id}
								disabled={loading || loadingRef}
								required
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="">-- Pilih Jenis Hukuman --</option>
								{#each filteredJenisHukuman as jh}
									<option value={jh.id}>{jh.jnsHukuman}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Section: Nomor SK & Tanggal SK -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="skHd" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor SK Hukdis <span class="text-rose-500">*</span>
						</label>
						<input 
							id="skHd"
							type="text"
							placeholder="Contoh: 862.1/154/BKPSDMD/2021"
							bind:value={skHd}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglSkHd" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal SK <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglSkHd"
							type="date"
							bind:value={tglSkHd}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: TMT Mulai Hukuman & Tanggal Akhir Hukuman -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tmtSkHd" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT Mulai Hukuman <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tmtSkHd"
							type="date"
							bind:value={tmtSkHd}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglAkhirHukuman" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Akhir Hukuman <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglAkhirHukuman"
							type="date"
							bind:value={tglAkhirHukuman}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Masa Hukuman Tahun, Bulan, & Dasar Hukum PP -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-1.5">
						<label for="masaHukumanThn" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Hukuman (Thn)
						</label>
						<input 
							id="masaHukumanThn"
							type="number"
							min="0"
							placeholder="Contoh: 1"
							bind:value={masaHukumanThn}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="masaHukumanBln" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Masa Hukuman (Bln)
						</label>
						<input 
							id="masaHukumanBln"
							type="number"
							min="0"
							max="12"
							placeholder="Contoh: 0"
							bind:value={masaHukumanBln}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="noPP" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Dasar Hukum / Peraturan
						</label>
						<input 
							id="noPP"
							type="text"
							placeholder="Contoh: PP 94 Tahun 2021"
							bind:value={noPP}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Alasan Penjatuhan Hukuman (Textarea) -->
				<div class="space-y-1.5">
					<label for="alasanHukuman" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Alasan Penjatuhan Hukuman Disiplin <span class="text-rose-500">*</span>
					</label>
					<textarea 
						id="alasanHukuman"
						rows="2"
						placeholder="Contoh: Telah melakukan pelanggaran kewajiban disiplin kehadiran kerja tanpa keterangan sah sesuai ketentuan pasal ..."
						bind:value={alasanHukuman}
						disabled={loading}
						required
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
					></textarea>
				</div>

				<!-- Section: Keterangan Tambahan / Pejabat yang Menetapkan -->
				<div class="space-y-1.5">
					<label for="ket" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Pejabat yang Menetapkan / Keterangan Tambahan
					</label>
					<input 
						id="ket"
						type="text"
						placeholder="Contoh: Bupati Tojo Una-Una / Kepala BKPSDM"
						bind:value={ket}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Upload Berkas SK Hukdis (PDF) -->
				<div class="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
					<div class="flex items-center justify-between">
						<label for="file_hukdis" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<span>Upload Dokumen SK Hukuman Disiplin (PDF)</span>
						</label>

						{#if existingDokumen}
							<a 
								href={`${BACKEND_URL}${existingDokumen}`} 
								target="_blank" 
								rel="noreferrer"
								class="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
							>
								<span>Lihat SK Hukdis Saat Ini</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
							</a>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<input 
							id="file_hukdis"
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
							<span>{existingDokumen ? 'Ganti File SK' : 'Pilih File SK'}</span>
						</button>

						{#if fileDokumen}
							<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs">
								<span class="truncate max-w-[200px] font-medium text-rose-900 dark:text-rose-200">
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
						{item ? 'Simpan Perubahan' : 'Tambah Hukuman Disiplin'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
