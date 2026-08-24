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
	let nmDiklat = $state('');
	let jnsDiklat_id = $state('');
	let jenjangDiklat_id = $state('');
	let penyelenggara = $state('');
	let t4pelaksanaan = $state('');
	let angkatan = $state('');
	let noSertifikat = $state('');
	let tglSertifikat = $state('');

	// Upload Sertifikat / STTPL
	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi
	let refJnsDiklat = $state([]);
	let refJenjangDiklat = $state([]);

	// Filtered Jenjang Diklat berdasarkan Jenis Diklat terpilih
	let filteredJenjang = $derived(
		jnsDiklat_id
			? refJenjangDiklat.filter(j => String(j.jnsDiklat_id || '').trim().toLowerCase() === String(jnsDiklat_id || '').trim().toLowerCase())
			: refJenjangDiklat
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
				nmDiklat = item.nmDiklat && item.nmDiklat !== '-' ? item.nmDiklat : (item.nama_diklat && item.nama_diklat !== '-' ? item.nama_diklat : '');
				jnsDiklat_id = item.jnsDiklat_id || '';
				jenjangDiklat_id = item.jenjangDiklat_id || '';
				penyelenggara = item.penyelenggara && item.penyelenggara !== '-' ? item.penyelenggara : '';
				t4pelaksanaan = item.t4pelaksanaan && item.t4pelaksanaan !== '-' ? item.t4pelaksanaan : (item.tempat && item.tempat !== '-' ? item.tempat : '');
				angkatan = item.angkatan && item.angkatan !== '-' ? item.angkatan : '';
				noSertifikat = item.noSertifikat && item.noSertifikat !== '-' ? item.noSertifikat : (item.no_sertifikat && item.no_sertifikat !== '-' ? item.no_sertifikat : '');
				tglSertifikat = toDateInputVal(item.tglSertifikat || item.tgl_sertifikat);
				existingDokumen = item.dokumen_diklat || item.dokumen_sk || null;
			} else {
				// Create mode
				nmDiklat = '';
				jnsDiklat_id = '';
				jenjangDiklat_id = '';
				penyelenggara = '';
				t4pelaksanaan = '';
				angkatan = '';
				noSertifikat = '';
				tglSertifikat = '';
				existingDokumen = null;
			}
		}
	});

	async function loadReferensi() {
		if (refJnsDiklat.length > 0) return;
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/diklat');
			if (res?.data) {
				refJnsDiklat = res.data.jenis_diklat || [];
				refJenjangDiklat = res.data.jenjang_diklat || [];
			}
		} catch (err) {
			console.error('Gagal memuat referensi diklat', err);
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
				errorMessage = 'Ukuran file sertifikat maksimal 5 MB';
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
		if (!nmDiklat.trim()) {
			errorMessage = 'Nama Diklat / Pelatihan wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			formData.append('nmDiklat', nmDiklat.trim());
			if (jnsDiklat_id) formData.append('jnsDiklat_id', jnsDiklat_id);
			if (jenjangDiklat_id) formData.append('jenjangDiklat_id', jenjangDiklat_id);
			if (penyelenggara.trim()) formData.append('penyelenggara', penyelenggara.trim());
			if (t4pelaksanaan.trim()) formData.append('t4pelaksanaan', t4pelaksanaan.trim());
			if (angkatan.trim()) formData.append('angkatan', angkatan.trim());
			if (noSertifikat.trim()) formData.append('noSertifikat', noSertifikat.trim());
			if (tglSertifikat) formData.append('tglSertifikat', tglSertifikat);
			if (fileDokumen) formData.append('dokumen_diklat', fileDokumen);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-diklat/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat diklat berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-diklat`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat diklat baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat diklat';
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
					<div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Riwayat Diklat / Pelatihan' : 'Tambah Riwayat Diklat / Pelatihan'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi sertifikat dan kegiatan diklat' : 'Isi formulir riwayat pendidikan dan pelatihan formal/teknis'}
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

				<!-- Section: Nama Diklat -->
				<div class="space-y-1.5">
					<label for="nmDiklat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Nama Diklat / Pelatihan / Seminar <span class="text-rose-500">*</span>
					</label>
					<input 
						id="nmDiklat"
						type="text"
						placeholder="Contoh: Pelatihan Kepemimpinan Pengawas / Diklat Teknis Manajemen Kepegawaian"
						bind:value={nmDiklat}
						disabled={loading}
						required
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Jenis Diklat & Jenjang Diklat -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="jnsDiklat_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenis Diklat
						</label>
						<div class="relative">
							<select
								id="jnsDiklat_id"
								bind:value={jnsDiklat_id}
								onchange={() => {
									if (jenjangDiklat_id && !refJenjangDiklat.some(j => String(j.id) === String(jenjangDiklat_id) && String(j.jnsDiklat_id || '').trim().toLowerCase() === String(jnsDiklat_id || '').trim().toLowerCase())) {
										jenjangDiklat_id = '';
									}
								}}
								disabled={loading || loadingRef}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="">-- Pilih Jenis Diklat --</option>
								{#each refJnsDiklat as jd}
									<option value={jd.id}>{jd.jnsDiklat}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="jenjangDiklat_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenjang Diklat
						</label>
						<div class="relative">
							<select
								id="jenjangDiklat_id"
								bind:value={jenjangDiklat_id}
								disabled={loading || loadingRef}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="">-- Pilih Jenjang Diklat --</option>
								{#each filteredJenjang as jj}
									<option value={jj.id}>{jj.jenjangDiklat}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Section: Tempat Pelaksanaan & Angkatan -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="t4pelaksanaan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tempat Pelaksanaan
						</label>
						<input 
							id="t4pelaksanaan"
							type="text"
							placeholder="Contoh: Palu / Jakarta / Gedung Diklat Ampana"
							bind:value={t4pelaksanaan}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="angkatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Angkatan
						</label>
						<input 
							id="angkatan"
							type="text"
							placeholder="Contoh: IV / 2023"
							bind:value={angkatan}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Nomor Sertifikat & Tanggal Sertifikat -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="noSertifikat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							No. Sertifikat / STTPL
						</label>
						<input 
							id="noSertifikat"
							type="text"
							placeholder="Contoh: 123/STTPL/2023"
							bind:value={noSertifikat}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglSertifikat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Sertifikat
						</label>
						<input 
							id="tglSertifikat"
							type="date"
							bind:value={tglSertifikat}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Lembaga Penyelenggara (Full width di bagian bawah) -->
				<div class="space-y-1.5">
					<label for="penyelenggara" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Lembaga Penyelenggara
					</label>
					<input 
						id="penyelenggara"
						type="text"
						placeholder="Contoh: BPSDM Provinsi Sulawesi Tengah / LAN RI / Pusdiklat Kemendagri"
						bind:value={penyelenggara}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Upload Berkas Sertifikat / STTPL (PDF) -->
				<div class="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
					<div class="flex items-center justify-between">
						<label for="file_sertifikat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<span>Upload Sertifikat / STTPL (PDF)</span>
						</label>

						{#if existingDokumen}
							<a 
								href={`${BACKEND_URL}${existingDokumen}`} 
								target="_blank" 
								rel="noreferrer"
								class="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
							>
								<span>Lihat Sertifikat Saat Ini</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
							</a>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<input 
							id="file_sertifikat"
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
							<span>{existingDokumen ? 'Ganti File Sertifikat' : 'Pilih File Sertifikat'}</span>
						</button>

						{#if fileDokumen}
							<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs">
								<span class="truncate max-w-[220px] font-medium text-amber-900 dark:text-amber-200">
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
						{item ? 'Simpan Perubahan' : 'Tambah Riwayat Diklat'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
