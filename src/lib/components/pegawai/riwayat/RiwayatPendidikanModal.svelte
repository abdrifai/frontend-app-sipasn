<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';

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
	let tktPend_id = $state('');
	let pend_id = $state('');
	let nmSekolah = $state('');
	let jurusan = $state('');
	let thnLulus = $state('');
	let noIjazah = $state('');
	let tglIjazah = $state('');
	let gd = $state('');
	let gb = $state('');
	let pengesahan = $state('');

	// Upload Ijazah
	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	// Upload Transkrip
	let fileTranskrip = $state(null);
	let existingTranskrip = $state(null);
	let fileTranskripInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi
	let refTingkat = $state([]);
	let refProdi = $state([]);

	// Combobox options
	let prodiOptions = $derived(
		refProdi.map(p => ({ value: p.id, label: p.pend, kode: p.kode }))
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
			fileTranskrip = null;

			if (item) {
				// Edit mode
				tktPend_id = item.tktPend_id !== undefined && item.tktPend_id !== null ? String(item.tktPend_id) : '';
				pend_id = item.pend_id || '';
				nmSekolah = item.nmSekolah && item.nmSekolah !== '-' ? item.nmSekolah : (item.sekolah && item.sekolah !== '-' ? item.sekolah : '');
				jurusan = item.jurusan && item.jurusan !== '-' ? item.jurusan : '';
				thnLulus = item.thnLulus && item.thnLulus !== '-' ? item.thnLulus : (item.tahun_lulus && item.tahun_lulus !== '-' ? item.tahun_lulus : '');
				noIjazah = item.noIjazah && item.noIjazah !== '-' ? item.noIjazah : (item.no_ijazah && item.no_ijazah !== '-' ? item.no_ijazah : '');
				tglIjazah = toDateInputVal(item.tglIjazah || item.tgl_ijazah);
				gd = item.gd && item.gd !== '-' ? item.gd : (item.gelar_depan && item.gelar_depan !== '-' ? item.gelar_depan : '');
				gb = item.gb && item.gb !== '-' ? item.gb : (item.gelar_belakang && item.gelar_belakang !== '-' ? item.gelar_belakang : '');
				pengesahan = item.pengesahan && item.pengesahan !== '-' ? item.pengesahan : '';
				existingDokumen = item.dokumen_ijazah || item.dokumen_sk || null;
				existingTranskrip = item.dokumen_transkrip || null;
			} else {
				// Create mode (kosongkan)
				tktPend_id = '';
				pend_id = '';
				nmSekolah = '';
				jurusan = '';
				thnLulus = '';
				noIjazah = '';
				tglIjazah = '';
				gd = '';
				gb = '';
				pengesahan = '';
				existingDokumen = null;
				existingTranskrip = null;
			}
		}
	});

	async function loadReferensi() {
		if (refTingkat.length > 0) return;
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/pendidikan');
			if (res?.data) {
				refTingkat = (res.data.tingkat_pendidikan || []).sort((a, b) => parseInt(a.id || 0) - parseInt(b.id || 0));
				refProdi = res.data.program_studi || [];
			}
		} catch (err) {
			console.error('Gagal memuat referensi pendidikan', err);
		} finally {
			loadingRef = false;
		}
	}

	function handleProdiChange(selectedId, opt) {
		pend_id = selectedId || '';
		if (opt) {
			jurusan = opt.label || '';
		}
	}

	function handleFileChange(e) {
		const files = e.target.files;
		if (files && files[0]) {
			const file = files[0];
			if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
				errorMessage = 'Format file Ijazah tidak didukung. Hanya file PDF yang diperbolehkan';
				fileDokumen = null;
				if (fileInputRef) fileInputRef.value = '';
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				errorMessage = 'Ukuran file Ijazah maksimal 5 MB';
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

	function handleTranskripChange(e) {
		const files = e.target.files;
		if (files && files[0]) {
			const file = files[0];
			if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
				errorMessage = 'Format file Transkrip Nilai tidak didukung. Hanya file PDF yang diperbolehkan';
				fileTranskrip = null;
				if (fileTranskripInputRef) fileTranskripInputRef.value = '';
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				errorMessage = 'Ukuran file Transkrip Nilai maksimal 5 MB';
				fileTranskrip = null;
				if (fileTranskripInputRef) fileTranskripInputRef.value = '';
				return;
			}
			fileTranskrip = file;
			errorMessage = '';
		}
	}

	function removeSelectedTranskrip() {
		fileTranskrip = null;
		if (fileTranskripInputRef) fileTranskripInputRef.value = '';
	}

	async function handleSubmit(e) {
		e?.preventDefault?.();
		errorMessage = '';

		// Validasi dasar
		if (!tktPend_id) {
			errorMessage = 'Tingkat Pendidikan wajib dipilih';
			return;
		}
		if (!nmSekolah.trim()) {
			errorMessage = 'Nama Lembaga / Sekolah / Universitas wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			formData.append('tktPend_id', tktPend_id);
			if (pend_id) formData.append('pend_id', pend_id);
			formData.append('nmSekolah', nmSekolah.trim());
			if (jurusan.trim()) formData.append('jurusan', jurusan.trim());
			if (thnLulus.trim()) formData.append('thnLulus', thnLulus.trim());
			if (noIjazah.trim()) formData.append('noIjazah', noIjazah.trim());
			if (tglIjazah) formData.append('tglIjazah', tglIjazah);
			if (gd.trim()) formData.append('gd', gd.trim());
			if (gb.trim()) formData.append('gb', gb.trim());
			if (pengesahan.trim()) formData.append('pengesahan', pengesahan.trim());
			if (fileDokumen) formData.append('dokumen_ijazah', fileDokumen);
			if (fileTranskrip) formData.append('dokumen_transkrip', fileTranskrip);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-pendidikan/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat pendidikan berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-pendidikan`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat pendidikan baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat pendidikan';
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
		<div class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-in zoom-in-95 duration-150">
			
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Riwayat Pendidikan' : 'Tambah Riwayat Pendidikan'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi ijazah, transkrip nilai, dan tingkat pendidikan' : 'Isi formulir riwayat pendidikan formal pegawai'}
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
					aria-label="Tutup Modal"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>

			<!-- Modal Body / Form -->
			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
				
				{#if errorMessage}
					<div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- Section: Tingkat Pendidikan & Nama Sekolah/Kampus -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tktPend_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tingkat Pendidikan <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<select
								id="tktPend_id"
								bind:value={tktPend_id}
								disabled={loading || loadingRef}
								required
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="">-- Pilih Tingkat Pendidikan --</option>
								{#each refTingkat as rt}
									<option value={rt.id}>{rt.tktpend}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="nmSekolah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nama Lembaga / Sekolah / Universitas <span class="text-rose-500">*</span>
						</label>
						<input 
							id="nmSekolah"
							type="text"
							placeholder="Contoh: Universitas Tadulako / SMA Negeri 1"
							bind:value={nmSekolah}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Jurusan / Program Studi -->
				<div class="space-y-1">
					<Combobox 
						options={prodiOptions}
						bind:value={pend_id}
						label="Jurusan / Program Studi (Pilih dari Master)"
						placeholder="Ketik untuk mencari jurusan..."
						disabled={loading || loadingRef}
						onchange={handleProdiChange}
					/>
					{#if !pend_id}
						<input 
							type="text"
							placeholder="Atau ketik nama jurusan secara manual..."
							bind:value={jurusan}
							disabled={loading}
							class="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
						/>
					{/if}
				</div>

				<!-- Section: Tahun Lulus & Nomor Ijazah -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="thnLulus" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tahun Kelulusan
						</label>
						<input 
							id="thnLulus"
							type="text"
							maxlength="4"
							placeholder="Contoh: 2018"
							bind:value={thnLulus}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="noIjazah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor Ijazah
						</label>
						<input 
							id="noIjazah"
							type="text"
							placeholder="Contoh: 1234/UN28/S1/2018"
							bind:value={noIjazah}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Tanggal Ijazah & Pejabat Penandatangan -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tglIjazah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Ijazah
						</label>
						<input 
							id="tglIjazah"
							type="date"
							bind:value={tglIjazah}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="pengesahan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Pejabat Penandatangan / Pengesahan
						</label>
						<input 
							id="pengesahan"
							type="text"
							placeholder="Contoh: Rektor / Dekan / Kepala Sekolah"
							bind:value={pengesahan}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Gelar Depan & Gelar Belakang -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="gd" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Gelar Depan
						</label>
						<input 
							id="gd"
							type="text"
							placeholder="Contoh: Dr. / Ir. / Drs."
							bind:value={gd}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="gb" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Gelar Belakang
						</label>
						<input 
							id="gb"
							type="text"
							placeholder="Contoh: S.Kom / M.Si / S.Pd"
							bind:value={gb}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Upload Dokumen Ijazah & Transkrip Nilai -->
				<div class="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
					
					<!-- 1. Upload Dokumen Ijazah -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<label for="file_ijazah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
								<span>1. Dokumen Ijazah (PDF)</span>
							</label>

							{#if existingDokumen}
								<a 
									href={`${BACKEND_URL}${existingDokumen}`} 
									target="_blank" 
									rel="noreferrer"
									class="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
								>
									<span>Lihat Dokumen Ijazah</span>
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
								</a>
							{/if}
						</div>

						<div class="flex items-center gap-3">
							<input 
								id="file_ijazah"
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
								class="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
								<span>{existingDokumen ? 'Ganti File Ijazah' : 'Pilih File Ijazah'}</span>
							</button>

							{#if fileDokumen}
								<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
									<span class="truncate max-w-[200px] font-medium text-purple-900 dark:text-purple-200">
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
								<span class="text-[11px] text-zinc-400">PDF (Maks. 5 MB)</span>
							{/if}
						</div>
					</div>

					<!-- 2. Upload Transkrip Nilai -->
					<div class="space-y-2 pt-2 border-t border-zinc-100/80 dark:border-zinc-800/60">
						<div class="flex items-center justify-between">
							<label for="file_transkrip" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
								<span>2. Dokumen Transkrip Nilai (PDF)</span>
							</label>

							{#if existingTranskrip}
								<a 
									href={`${BACKEND_URL}${existingTranskrip}`} 
									target="_blank" 
									rel="noreferrer"
									class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
								>
									<span>Lihat Transkrip Nilai</span>
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
								</a>
							{/if}
						</div>

						<div class="flex items-center gap-3">
							<input 
								id="file_transkrip"
								type="file"
								accept=".pdf,application/pdf"
								bind:this={fileTranskripInputRef}
								onchange={handleTranskripChange}
								disabled={loading}
								class="hidden"
							/>

							<button
								type="button"
								onclick={() => fileTranskripInputRef?.click()}
								disabled={loading}
								class="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
								<span>{existingTranskrip ? 'Ganti File Transkrip' : 'Pilih File Transkrip'}</span>
							</button>

							{#if fileTranskrip}
								<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs">
									<span class="truncate max-w-[200px] font-medium text-indigo-900 dark:text-indigo-200">
										{fileTranskrip.name}
									</span>
									<button
										type="button"
										onclick={removeSelectedTranskrip}
										class="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
										title="Batal pilih file"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
									</button>
								</div>
							{:else if !existingTranskrip}
								<span class="text-[11px] text-zinc-400">PDF (Maks. 5 MB)</span>
							{/if}
						</div>
					</div>

				</div>

				<!-- Modal Footer Buttons -->
				<div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
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
						{item ? 'Simpan Perubahan' : 'Tambah Riwayat Pendidikan'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
