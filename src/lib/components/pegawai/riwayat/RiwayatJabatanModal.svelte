<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import UnorTreeSelect from '$lib/components/ui/UnorTreeSelect.svelte';

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
	let jnsJab_id = $state('');
	let nama_jabatan = $state('');
	let nmJab_id = $state('');
	let unorInduk_id = $state('');
	let eselon_id = $state('');
	let jnsMutasi_id = $state('');
	let sk = $state('');
	let tglSk = $state('');
	let tmtSk = $state('');
	let tmtPelantikan = $state('');
	let pengesahan = $state('');

	let fileDokumen = $state(null);
	let existingDokumen = $state(null);
	let fileInputRef = $state(null);

	let loading = $state(false);
	let loadingRef = $state(false);
	let errorMessage = $state('');

	// Master Referensi
	let refJenisJabatan = $state([]);
	let refJenjangJabatan = $state([]);
	let refUnorInduk = $state([]);
	let refUnorTree = $state([]);
	let refEselon = $state([]);
	let refJenisMutasi = $state([]);
	let refDaftarJabatan = $state([]);
	let refJenjangEselonMap = $state({});

	// Combobox Options
	let unorOptions = $derived(
		refUnorInduk
			.filter(u => u.isAktif !== 0 || u.id === unorInduk_id)
			.map(u => ({
				value: u.id,
				label: (u.nmUnor || '').trim() + (u.isAktif === 0 ? ' (Non-Aktif)' : ''),
				nm_jab: u.nm_jab,
				jab_id: u.resolved_jab_id || u.jab_id,
				jns_jab_id: u.jns_jab_id,
				jenjang_jab_id: u.jenjang_jab_id,
				eselon_id: u.eselon_id,
				isAktif: u.isAktif,
			}))
	);

	let jenjangOptions = $derived(
		refJenjangJabatan.map(j => ({ value: j.id, label: j.jenjangjab }))
	);

	let selectedJenjangObj = $derived(
		refJenjangJabatan.find(j => String(j.id) === String(jnsJab_id))
	);

	let selectedJenisJabatanObj = $derived(
		refJenisJabatan.find(j => String(j.id) === String(jnsJab_id))
	);

	let isStrukturalManajerial = $derived.by(() => {
		let text = '';
		if (selectedJenjangObj) {
			text += (selectedJenjangObj.jenjangjab || '').toUpperCase() + ' ';
		}
		if (selectedJenisJabatanObj) {
			text += (selectedJenisJabatanObj.jnsjab || '').toUpperCase();
		}
		if (!text.trim()) return true; // Default ke true (auto-fill dari ref_jabatan) jika belum pilih jenjang
		return (
			text.includes('ADMINISTRATOR') ||
			text.includes('PENGAWAS') ||
			text.includes('PIMPINAN TINGGI') ||
			text.includes('JPT') ||
			text.includes('STRUKTURAL') ||
			text.includes('ADMINISTRASI')
		);
	});

	let isFungsional = $derived(!isStrukturalManajerial);

	let fungsionalOptions = $derived(
		refDaftarJabatan
			.filter(j => j.tipe === 'FUNGSIONAL')
			.map(j => ({
				value: j.id,
				label: j.nama,
			}))
	);

	let jabatanOptions = $derived(
		refDaftarJabatan.map(j => ({ 
			value: j.id, 
			label: j.nama, 
			tipe: j.tipe,
			jns_jab_id: j.jns_jab_id,
			eselon_id: j.eselon_id 
		}))
	);

	let mutasiOptions = $derived(
		refJenisMutasi.map(m => ({ value: m.id, label: m.jnsMutasi }))
	);

	let eselonOptions = $derived.by(() => {
		const validEselonIds = refJenjangEselonMap[String(jnsJab_id)];
		if (validEselonIds && validEselonIds.length > 0) {
			const filtered = refEselon.filter(e => validEselonIds.includes(e.id));
			if (filtered.length > 0) {
				return filtered.map(e => ({ value: e.id, label: e.eselon }));
			}
		}
		return refEselon.map(e => ({ value: e.id, label: e.eselon }));
	});

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
				jnsJab_id = item.jnsJab_id || '';
				nmJab_id = item.nmJab_id || '';
				nama_jabatan = item.nama_jabatan && item.nama_jabatan !== '-' ? item.nama_jabatan : '';
				unorInduk_id = item.unorInduk_id || '';
				eselon_id = item.eselon_id || '';
				jnsMutasi_id = item.jnsMutasi_id || '';
				sk = item.sk && item.sk !== '-' ? item.sk : '';
				tglSk = toDateInputVal(item.tglSk || item.tgl_sk);
				tmtSk = toDateInputVal(item.tmtSk || item.tmt_sk);
				tmtPelantikan = toDateInputVal(item.tmtPelantikan || item.tmt_pelantikan);
				pengesahan = item.pengesahan && item.pengesahan !== '-' ? item.pengesahan : '';
				existingDokumen = item.dokumen_sk || null;
			} else {
				// Create mode (kosongkan)
				jnsJab_id = '';
				nmJab_id = '';
				nama_jabatan = '';
				unorInduk_id = '';
				eselon_id = '';
				jnsMutasi_id = '';
				sk = '';
				tglSk = '';
				tmtSk = '';
				tmtPelantikan = '';
				pengesahan = '';
				existingDokumen = null;
			}
		}
	});

	async function loadReferensi() {
		if (refJenisJabatan.length > 0 && refUnorInduk.length > 0) return;
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/jabatan');
			if (res?.data) {
				refJenisJabatan = res.data.jenis_jabatan || [];
				refJenjangJabatan = res.data.jenjang_jabatan || [];
				refUnorInduk = res.data.unor_induk || [];
				refUnorTree = res.data.unor_tree || [];
				refEselon = res.data.eselon || [];
				refJenisMutasi = res.data.jenis_mutasi || [];
				refDaftarJabatan = res.data.daftar_jabatan || [];
				refJenjangEselonMap = res.data.jenjang_eselon_map || {};
			}
		} catch (err) {
			console.error('Gagal memuat referensi jabatan', err);
		} finally {
			loadingRef = false;
		}
	}

	function handleJenjangChange(selectedId, opt) {
		jnsJab_id = selectedId || '';
		if (!selectedId) return;

		const validEselonIds = refJenjangEselonMap[String(selectedId)];
		if (validEselonIds && validEselonIds.length > 0) {
			if (!eselon_id || !validEselonIds.includes(eselon_id)) {
				eselon_id = validEselonIds[0];
			}
		} else {
			// Jika jenjang pelaksana/fungsional (misal ID 3, 4, 5) tanpa eselon struktural
			const nonEselon = refEselon.find(e => (e.eselon || '').toUpperCase().includes('NON'));
			if (nonEselon && (String(selectedId) === '3' || String(selectedId) === '4' || String(selectedId) === '5')) {
				eselon_id = nonEselon.id;
			}
		}
	}

	function handleUnorChange(selectedId, node) {
		unorInduk_id = selectedId || '';
		if (!selectedId) return;

		let targetNmJab = node?.nm_jab;
		let targetJabId = node?.jab_id || node?.resolved_jab_id;
		let targetJnsJabId = node?.jns_jab_id;
		let targetJenjangJabId = node?.jenjang_jab_id;
		let targetEselonId = node?.eselon_id;

		if (!targetNmJab || !targetJenjangJabId || !targetEselonId) {
			const found = refUnorInduk.find(u => u.id === selectedId);
			if (found) {
				if (!targetNmJab) targetNmJab = found.nm_jab;
				if (!targetJabId) targetJabId = found.resolved_jab_id || found.jab_id;
				if (!targetJnsJabId) targetJnsJabId = found.jns_jab_id;
				if (!targetJenjangJabId) targetJenjangJabId = found.jenjang_jab_id;
				if (!targetEselonId) targetEselonId = found.eselon_id;
			}
		}

		if (targetNmJab) {
			nama_jabatan = targetNmJab;
		}
		if (targetJabId) {
			nmJab_id = targetJabId;
		}
		if (targetJenjangJabId) {
			jnsJab_id = String(targetJenjangJabId);
		} else if (targetJnsJabId) {
			const matchJenjang = refJenjangJabatan.find(
				j => String(j.id) === String(targetJnsJabId) || String(j.jnsjab_id) === String(targetJnsJabId)
			);
			if (matchJenjang) {
				jnsJab_id = String(matchJenjang.id);
			} else {
				jnsJab_id = String(targetJnsJabId);
			}
		}
		if (targetEselonId) {
			eselon_id = targetEselonId;
		}
	}

	function handleJabatanChange(selectedId, opt) {
		nmJab_id = selectedId || '';
		if (opt) {
			nama_jabatan = opt.label || '';
			if (opt.jns_jab_id && !jnsJab_id) {
				jnsJab_id = opt.jns_jab_id;
			}
			if (opt.eselon_id && !eselon_id) {
				eselon_id = opt.eselon_id;
			}
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
		if (!unorInduk_id) {
			errorMessage = 'Unit Organisasi / Satuan Kerja wajib dipilih';
			return;
		}
		if (!nama_jabatan.trim() && !nmJab_id) {
			errorMessage = 'Nama Jabatan wajib dipilih atau diisi';
			return;
		}
		if (!tglSk) {
			errorMessage = 'Tanggal SK Jabatan wajib diisi';
			return;
		}
		if (!tmtSk) {
			errorMessage = 'TMT Jabatan wajib diisi';
			return;
		}

		loading = true;
		try {
			const formData = new FormData();
			if (jnsJab_id) formData.append('jnsJab_id', jnsJab_id);
			if (nmJab_id) formData.append('nmJab_id', nmJab_id);
			if (nama_jabatan.trim()) formData.append('nama_jabatan_custom', nama_jabatan.trim());
			formData.append('unorInduk_id', unorInduk_id);
			if (eselon_id) formData.append('eselon_id', eselon_id);
			if (jnsMutasi_id) formData.append('jnsMutasi_id', jnsMutasi_id);
			if (sk.trim()) formData.append('sk', sk.trim());
			formData.append('tglSk', tglSk);
			formData.append('tmtSk', tmtSk);
			if (tmtPelantikan) formData.append('tmtPelantikan', tmtPelantikan);
			if (pengesahan.trim()) formData.append('pengesahan', pengesahan.trim());
			if (fileDokumen) formData.append('dokumen_sk', fileDokumen);

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-jabatan/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Riwayat jabatan berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-jabatan`, {
					method: 'POST',
					body: formData
				});
				toast.success('Riwayat jabatan baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan riwayat jabatan';
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
					<div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Riwayat Jabatan & Penugasan' : 'Tambah Riwayat Jabatan & Penugasan'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi SK jabatan dan unit kerja' : 'Isi formulir pengangkatan / mutasi jabatan pegawai'}
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

				<!-- Section 1: Unit Organisasi Induk (Tree Select Searchable) -->
				<div class="space-y-1">
					<UnorTreeSelect 
						tree={refUnorTree}
						flatOptions={unorOptions}
						bind:value={unorInduk_id}
						onchange={handleUnorChange}
						label="Unit Organisasi / Satuan Kerja (Aktif)"
						placeholder="Pilih atau cari satuan kerja (Tree View)..."
						required={true}
						disabled={loading || loadingRef}
					/>
				</div>

				<!-- Section 2: Jenis Mutasi -->
				<div class="space-y-1">
					<Combobox 
						options={mutasiOptions}
						bind:value={jnsMutasi_id}
						label="Jenis Mutasi / Pengangkatan"
						placeholder="Ketik untuk cari mutasi..."
						disabled={loading || loadingRef}
					/>
				</div>

				<!-- Section 3: Jenjang Jabatan & Eselon -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1">
						<Combobox 
							options={jenjangOptions.length > 0 ? jenjangOptions : refJenisJabatan.map(j => ({ value: j.id, label: j.jnsjab }))}
							value={jnsJab_id}
							onchange={handleJenjangChange}
							label="Jenjang Jabatan"
							placeholder="Pilih atau cari Jenjang Jabatan..."
							disabled={loading || loadingRef}
						/>
					</div>

					<div class="space-y-1">
						<Combobox 
							options={eselonOptions}
							bind:value={eselon_id}
							label="Eselon"
							placeholder="Non-Eselon / Pilih Eselon..."
							disabled={loading || loadingRef}
						/>
					</div>
				</div>

				<!-- Section 4: Nama Jabatan -->
				<div class="space-y-1.5">
					{#if isFungsional}
						<Combobox 
							options={fungsionalOptions}
							value={nmJab_id}
							onchange={(selectedId, opt) => {
								nmJab_id = selectedId || '';
								if (opt) {
									nama_jabatan = opt.label || '';
								} else {
									nama_jabatan = '';
								}
							}}
							label="Nama Jabatan (Jabatan Fungsional)"
							placeholder="Pilih atau cari Jabatan Fungsional..."
							disabled={loading || loadingRef}
							required={true}
						/>
					{:else}
						<div class="flex items-center justify-between">
							<label for="nama_jabatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Nama Jabatan <span class="text-rose-500">*</span>
							</label>
							<span class="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
								<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
								Terkunci otomatis
							</span>
						</div>
						<textarea 
							id="nama_jabatan"
							rows="2"
							readonly
							placeholder="Nama jabatan akan terisi otomatis setelah memilih unit kerja di atas..."
							bind:value={nama_jabatan}
							class="w-full px-3 py-2 bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-300/80 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 font-semibold cursor-not-allowed outline-none select-none placeholder:text-zinc-400/80 resize-none"
						></textarea>
					{/if}
				</div>

				<!-- Section: No SK & Tanggal SK -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="sk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor SK Jabatan
						</label>
						<input 
							id="sk"
							type="text"
							placeholder="Contoh: 821.2/100/BKPSDM/2024"
							bind:value={sk}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal SK Jabatan <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglSk"
							type="date"
							bind:value={tglSk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: TMT Jabatan & TMT Pelantikan -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="tmtSk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT Jabatan <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tmtSk"
							type="date"
							bind:value={tmtSk}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tmtPelantikan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							TMT Pelantikan (Opsional)
						</label>
						<input 
							id="tmtPelantikan"
							type="date"
							bind:value={tmtPelantikan}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Pejabat Penandatangan -->
				<div class="space-y-1.5">
					<label for="pengesahan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Pejabat Penandatangan / Penetap SK
					</label>
					<input 
						id="pengesahan"
						type="text"
						placeholder="Contoh: Bupati / Gubernur / Kepala BKN"
						bind:value={pengesahan}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
					/>
				</div>

				<!-- Section: Upload Dokumen SK Jabatan -->
				<div class="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<div class="flex items-center justify-between">
						<label for="file_sk_jabatan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<span>Upload Dokumen SK Jabatan (PDF)</span>
						</label>

						{#if existingDokumen}
							<a 
								href={`${BACKEND_URL}${existingDokumen}`} 
								target="_blank" 
								rel="noreferrer"
								class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
							>
								<span>Lihat Dokumen Saat Ini</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
							</a>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<input 
							id="file_sk_jabatan"
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
							<div class="flex-1 flex items-center justify-between px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs">
								<span class="truncate max-w-[240px] font-medium text-blue-900 dark:text-blue-200">
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
						{item ? 'Simpan Perubahan' : 'Tambah Riwayat Jabatan'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
