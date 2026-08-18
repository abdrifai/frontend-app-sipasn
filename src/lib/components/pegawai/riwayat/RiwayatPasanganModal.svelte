<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';

	const toast = toastStore;

	let {
		open = false,
		pegawaiId = null,
		item = null,
		onClose = () => {},
		onSuccess = () => {}
	} = $props();

	// Form states
	let orang_id = $state('');
	let jenisPasangan = $state('Istri'); // 'Istri' | 'Suami'
	let urutanPasangan = $state('1'); // '1', '2', '3', '4', etc.
	let pns = $state(false);
	let nama = $state('');
	let nik = $state('');
	let t4Lhr = $state('');
	let tglLhr = $state('');
	let jkl_id = $state('2');
	let aktaMenikah = $state('');
	let tglMenikah = $state('');
	let karisKarsu = $state('');
	let npwp = $state('');
	let no_hp = $state('');
	let alamat = $state('');

	// Upload Dokumen Buku Nikah states
	let fileDokumen = $state(null);
	let fileInputRef = $state(null);
	let existingDokumenUrl = $state(null);

	// Status Pisah / Meninggal
	let showStatusLainnya = $state(false);
	let aktaCerai = $state('');
	let tglCerai = $state('');
	let aktaMeninggal = $state('');
	let tglMeninggal = $state('');

	// PNS Search states
	let searchNip = $state('');
	let searchLoading = $state(false);
	let searchResults = $state([]);
	let searchAttempted = $state(false);
	let selectedPegawaiPns = $state(null);

	let loading = $state(false);
	let errorMessage = $state('');

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
	const opsiJenisPasangan = ['Istri', 'Suami'];
	const opsiUrutan = [
		{ value: '1', label: 'Ke-1 (Pertama)' },
		{ value: '2', label: 'Ke-2 (Kedua)' },
		{ value: '3', label: 'Ke-3 (Ketiga)' },
		{ value: '4', label: 'Ke-4 (Keempat)' },
		{ value: '5', label: 'Ke-5 (Kelima)' }
	];

	// Helper parse string hubungan
	function parseHubungan(raw) {
		if (!raw || raw === '-') return { jenis: 'Istri', urutan: '1' };
		const str = String(raw).trim();
		const isSuami = str.toLowerCase().includes('suami');
		const jenis = isSuami ? 'Suami' : 'Istri';
		const numMatch = str.match(/\d+/);
		const urutan = numMatch ? numMatch[0] : '1';
		return { jenis, urutan };
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

	function handleJenisPasanganChange(val) {
		jenisPasangan = val;
		if (val === 'Suami') {
			jkl_id = '1';
		} else {
			jkl_id = '2';
		}
	}

	// Reset / Load form values saat modal dibuka
	$effect(() => {
		if (open) {
			errorMessage = '';
			searchNip = '';
			searchLoading = false;
			searchResults = [];
			searchAttempted = false;
			selectedPegawaiPns = null;
			fileDokumen = null;
			if (fileInputRef) fileInputRef.value = '';

			if (item) {
				// Edit mode
				orang_id = item.orang_id || '';
				const parsed = parseHubungan(item.hubungan);
				jenisPasangan = parsed.jenis;
				urutanPasangan = parsed.urutan;
				pns = Boolean(item.is_pns ?? (item.pns === 'PNS' || item.pns === true || item.pns === 1));
				nama = item.nama && item.nama !== '-' ? item.nama : '';
				nik = item.nik && item.nik !== '-' ? item.nik : '';
				t4Lhr = item.t4Lhr && item.t4Lhr !== '-' ? item.t4Lhr : '';
				tglLhr = toDateInputVal(item.tglLhr || item.tgl_lhr);
				jkl_id = item.jkl_id || (jenisPasangan === 'Suami' ? '1' : '2');
				aktaMenikah = item.aktaMenikah && item.aktaMenikah !== '-' ? item.aktaMenikah : (item.akta_nikah && item.akta_nikah !== '-' ? item.akta_nikah : '');
				tglMenikah = toDateInputVal(item.tglMenikah || item.tgl_nikah);
				karisKarsu = item.karisKarsu && item.karisKarsu !== '-' ? item.karisKarsu : (item.karis_karsu && item.karis_karsu !== '-' ? item.karis_karsu : '');
				npwp = item.npwp && item.npwp !== '-' ? item.npwp : '';
				no_hp = item.no_hp && item.no_hp !== '-' ? item.no_hp : '';
				alamat = item.alamat && item.alamat !== '-' ? item.alamat : '';

				existingDokumenUrl = item.dokumen_sk || item.dokumen_nikah || null;

				aktaCerai = item.aktaCerai && item.aktaCerai !== '-' ? item.aktaCerai : (item.akta_cerai && item.akta_cerai !== '-' ? item.akta_cerai : '');
				tglCerai = toDateInputVal(item.tglCerai || item.tgl_cerai);
				aktaMeninggal = item.aktaMeninggal && item.aktaMeninggal !== '-' ? item.aktaMeninggal : (item.akta_meninggal && item.akta_meninggal !== '-' ? item.akta_meninggal : '');
				tglMeninggal = toDateInputVal(item.tglMeninggal || item.tgl_meninggal);

				showStatusLainnya = Boolean(aktaCerai || tglCerai || aktaMeninggal || tglMeninggal);
			} else {
				// Create mode
				orang_id = '';
				jenisPasangan = 'Istri';
				urutanPasangan = '1';
				pns = false;
				nama = '';
				nik = '';
				t4Lhr = '';
				tglLhr = '';
				jkl_id = '2';
				aktaMenikah = '';
				tglMenikah = '';
				karisKarsu = '';
				npwp = '';
				no_hp = '';
				alamat = '';
				existingDokumenUrl = null;
				aktaCerai = '';
				tglCerai = '';
				aktaMeninggal = '';
				tglMeninggal = '';
				showStatusLainnya = false;
			}
		}
	});

	// Fungsi pencarian Pegawai PNS di database berdasarkan NIP / Nama
	async function handleCariPegawaiPns() {
		if (!searchNip.trim()) {
			searchResults = [];
			searchAttempted = false;
			return;
		}

		searchLoading = true;
		searchAttempted = true;
		searchResults = [];

		try {
			const res = await api(`/pegawai?search=${encodeURIComponent(searchNip.trim())}&limit=5`);
			if (res?.data && Array.isArray(res.data)) {
				searchResults = res.data;
			} else {
				searchResults = [];
			}
		} catch (err) {
			console.error('Gagal mencari data pegawai PNS', err);
			searchResults = [];
		} finally {
			searchLoading = false;
		}
	}

	// Fungsi ketika pegawai PNS hasil pencarian dipilih
	function handlePilihPegawai(p) {
		selectedPegawaiPns = p;
		orang_id = p.orang_id || '';
		nama = p.nama || p.nama_asli || '';
		nik = p.nik && p.nik !== '-' ? p.nik : '';
		t4Lhr = p.t4Lhr && p.t4Lhr !== '-' ? p.t4Lhr : '';
		tglLhr = toDateInputVal(p.tglLhr);
		jkl_id = p.jkl_id ? String(p.jkl_id) : (jenisPasangan === 'Suami' ? '1' : '2');
		alamat = p.alamat && p.alamat !== '-' ? p.alamat : '';
		no_hp = p.no_hp && p.no_hp !== '-' ? p.no_hp : '';
		npwp = p.npwp && p.npwp !== '-' ? p.npwp : '';

		// Tutup dropdown hasil pencarian
		searchResults = [];
		searchAttempted = false;
	}

	// Fungsi batal menghubungkan pegawai PNS terpilih
	function handleBatalHubungkanPns() {
		selectedPegawaiPns = null;
		orang_id = '';
	}

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
		if (!jenisPasangan) {
			errorMessage = 'Status pasangan (Suami/Istri) wajib dipilih';
			return;
		}
		if (!nama.trim()) {
			errorMessage = 'Nama lengkap pasangan wajib diisi';
			return;
		}
		if (!t4Lhr.trim()) {
			errorMessage = 'Tempat lahir wajib diisi';
			return;
		}
		if (!tglLhr) {
			errorMessage = 'Tanggal lahir wajib diisi';
			return;
		}

		loading = true;
		try {
			const hubunganFinal = `${jenisPasangan} Ke-${urutanPasangan || '1'}`;

			const formData = new FormData();
			if (orang_id) formData.append('orang_id', orang_id);
			formData.append('hubungan', hubunganFinal);
			formData.append('pns', pns);
			formData.append('nama', nama.trim());
			if (nik.trim()) formData.append('nik', nik.trim());
			formData.append('t4Lhr', t4Lhr.trim());
			formData.append('tglLhr', tglLhr);
			formData.append('jkl_id', jkl_id);

			if (aktaMenikah.trim()) formData.append('aktaMenikah', aktaMenikah.trim());
			if (tglMenikah) formData.append('tglMenikah', tglMenikah);
			if (karisKarsu.trim()) formData.append('karisKarsu', karisKarsu.trim());
			if (npwp.trim()) formData.append('npwp', npwp.trim());
			if (no_hp.trim()) formData.append('no_hp', no_hp.trim());
			if (alamat.trim()) formData.append('alamat', alamat.trim());

			if (aktaCerai.trim()) formData.append('aktaCerai', aktaCerai.trim());
			if (tglCerai) formData.append('tglCerai', tglCerai);
			if (aktaMeninggal.trim()) formData.append('aktaMeninggal', aktaMeninggal.trim());
			if (tglMeninggal) formData.append('tglMeninggal', tglMeninggal);

			if (fileDokumen) {
				formData.append('dokumen_sk', fileDokumen);
			}

			if (item?.id) {
				// Update
				await api(`/pegawai/${pegawaiId}/riwayat-pasangan/${item.id}`, {
					method: 'PUT',
					body: formData
				});
				toast.success('Data pasangan berhasil diperbarui');
			} else {
				// Create
				await api(`/pegawai/${pegawaiId}/riwayat-pasangan`, {
					method: 'POST',
					body: formData
				});
				toast.success('Data pasangan baru berhasil ditambahkan');
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan data pasangan';
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
					<div class="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200/60 dark:border-pink-800/60 flex items-center justify-center text-pink-600 dark:text-pink-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
					</div>
					<div>
						<h3 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							{item ? 'Edit Data Pasangan' : 'Tambah Data Pasangan'}
						</h3>
						<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
							{item ? 'Perbarui informasi data suami/istri (termasuk urutan pernikahan) & dokumen buku nikah' : 'Isi data suami atau istri pegawai, tentukan urutan pernikahan & upload buku nikah'}
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

				<!-- Section: Hubungan & Urutan Pasangan Ke- -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="jenis_pasangan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Status Hubungan <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<select
								id="jenis_pasangan"
								bind:value={jenisPasangan}
								onchange={(e) => handleJenisPasanganChange(e.target.value)}
								disabled={loading}
								required
								class="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none cursor-pointer shadow-2xs"
							>
								{#each opsiJenisPasangan as jp}
									<option value={jp}>{jp}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="urutan_pasangan" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
							<span>{jenisPasangan} Ke- <span class="text-rose-500">*</span></span>
							<span class="text-[10px] text-pink-600 font-bold bg-pink-50 dark:bg-pink-950/60 px-1.5 py-0.2 rounded font-mono">Urutan</span>
						</label>
						<div class="relative">
							<select
								id="urutan_pasangan"
								bind:value={urutanPasangan}
								disabled={loading}
								required
								class="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none cursor-pointer shadow-2xs"
							>
								{#each opsiUrutan as ou}
									<option value={ou.value}>{jenisPasangan} {ou.label}</option>
								{/each}
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Section: Status Kepegawaian & Live Preview Label -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
					<div class="space-y-1.5">
						<label for="status_pns" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Status Kepegawaian Pasangan
						</label>
						<div class="relative">
							<select
								id="status_pns"
								bind:value={pns}
								onchange={() => {
									if (!pns) {
										selectedPegawaiPns = null;
										searchResults = [];
										searchAttempted = false;
										searchNip = '';
									}
								}}
								disabled={loading}
								class="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none cursor-pointer shadow-2xs"
							>
								<option value={false}>Bukan PNS / Swasta / Wiraswasta</option>
								<option value={true}>Pegawai Negeri Sipil (PNS)</option>
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>

					<div class="sm:pt-5">
						<div class="p-2.5 bg-pink-50/60 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 rounded-xl flex items-center justify-between text-xs">
							<span class="text-zinc-500 dark:text-zinc-400 font-medium">Format Terdaftar:</span>
							<span class="font-bold text-pink-700 dark:text-pink-300 bg-pink-100/90 dark:bg-pink-900/70 px-3 py-1 rounded-lg font-mono text-xs shadow-2xs">
								{jenisPasangan} Ke-{urutanPasangan || '1'}
							</span>
						</div>
					</div>
				</div>

				<!-- Section Khusus: Pencarian Pasangan PNS di Database SIPASN (jika pns === true) -->
				{#if pns}
					<div class="p-3.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/50 space-y-2.5 transition-all">
						<div class="flex items-center justify-between">
							<label for="search_nip" class="text-xs font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-pink-600 dark:text-pink-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
								<span>Cari Pasangan PNS di Database (Berdasarkan NIP / Nama)</span>
							</label>

							{#if selectedPegawaiPns}
								<button
									type="button"
									onclick={handleBatalHubungkanPns}
									class="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
								>
									Reset Hubungan PNS
								</button>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<div class="relative flex-1">
								<input
									id="search_nip"
									type="text"
									placeholder="Ketik NIP (contoh: 1985...) atau Nama Pegawai..."
									bind:value={searchNip}
									onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCariPegawaiPns(); } }}
									disabled={loading || searchLoading}
									class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-pink-200 dark:border-pink-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 font-medium placeholder:text-zinc-400 font-mono"
								/>
							</div>

							<button
								type="button"
								onclick={handleCariPegawaiPns}
								disabled={loading || searchLoading || !searchNip.trim()}
								class="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
							>
								{#if searchLoading}
									<span class="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full"></span>
									<span>Mencari...</span>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
									<span>Cari NIP</span>
								{/if}
							</button>
						</div>

						<!-- Status PNS Terhubung -->
						{#if selectedPegawaiPns}
							<div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex items-start justify-between gap-2 text-xs">
								<div class="space-y-0.5">
									<p class="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
										<span>Terhubung dengan PNS: {selectedPegawaiPns.nama}</span>
									</p>
									<p class="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
										NIP: {selectedPegawaiPns.nipBaru || selectedPegawaiPns.nip || '-'} • {selectedPegawaiPns.unit_kerja || selectedPegawaiPns.jabatan || 'PNS'}
									</p>
								</div>
								<span class="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold rounded-md">
									Otomatis Terisi
								</span>
							</div>
						{/if}

						<!-- Hasil Pencarian Dropdown / List -->
						{#if searchResults.length > 0}
							<div class="p-2 bg-white dark:bg-zinc-800 border border-pink-200 dark:border-pink-800 rounded-xl shadow-lg space-y-1 max-h-48 overflow-y-auto">
								<p class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">Pilih Pegawai Pasangan dari Hasil Pencarian:</p>
								{#each searchResults as peg}
									<button
										type="button"
										onclick={() => handlePilihPegawai(peg)}
										class="w-full text-left p-2 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-950/50 transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer group"
									>
										<div class="space-y-0.5">
											<p class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-pink-600 dark:group-hover:text-pink-400">
												{peg.nama}
											</p>
											<p class="text-[11px] text-zinc-500 font-mono">
												NIP: {peg.nipBaru || peg.nip || '-'} • {peg.unit_kerja || peg.jabatan || '-'}
											</p>
										</div>
										<span class="px-2 py-1 rounded-md bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 text-[10px] font-bold shrink-0">
											Pilih
										</span>
									</button>
								{/each}
							</div>
						{:else if searchAttempted && !searchLoading && searchResults.length === 0}
							<div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-amber-600"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
								<span>Pegawai dengan NIP/Nama tersebut tidak ditemukan di database SIPASN. Silakan lengkapi formulir di bawah secara manual.</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Section: Nama & NIK -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="nama" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nama Lengkap Pasangan <span class="text-rose-500">*</span>
						</label>
						<input 
							id="nama"
							type="text"
							placeholder="Contoh: MARDIANA DAHLAN"
							bind:value={nama}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="nik" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							NIK (Nomor Induk Kependudukan)
						</label>
						<input 
							id="nik"
							type="text"
							maxlength="19"
							placeholder="Contoh: 7209055605850001"
							bind:value={nik}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium font-mono"
						/>
					</div>
				</div>

				<!-- Section: Tempat Lahir & Tanggal Lahir -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="t4Lhr" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tempat Lahir <span class="text-rose-500">*</span>
						</label>
						<input 
							id="t4Lhr"
							type="text"
							placeholder="Contoh: AMPANA"
							bind:value={t4Lhr}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglLhr" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Lahir <span class="text-rose-500">*</span>
						</label>
						<input 
							id="tglLhr"
							type="date"
							bind:value={tglLhr}
							disabled={loading}
							required
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: Akta Nikah & Tanggal Nikah -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="aktaMenikah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Nomor Buku / Akta Nikah
						</label>
						<input 
							id="aktaMenikah"
							type="text"
							placeholder="Contoh: 0155/009/X/2020"
							bind:value={aktaMenikah}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="tglMenikah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Tanggal Menikah
						</label>
						<input 
							id="tglMenikah"
							type="date"
							bind:value={tglMenikah}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>
				</div>

				<!-- Section: KARIS/KARSU & NPWP -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="karisKarsu" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							No. KARIS / KARSU (Kartu Istri / Suami)
						</label>
						<input 
							id="karisKarsu"
							type="text"
							placeholder="Contoh: BA 04085760"
							bind:value={karisKarsu}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium font-mono"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="npwp" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							NPWP Pasangan
						</label>
						<input 
							id="npwp"
							type="text"
							placeholder="Contoh: 12.345.678.9-123.000"
							bind:value={npwp}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium font-mono"
						/>
					</div>
				</div>

				<!-- Section: No Handphone & Jenis Kelamin -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="no_hp" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							No. Handphone / Kontak
						</label>
						<input 
							id="no_hp"
							type="text"
							placeholder="Contoh: 082291488817"
							bind:value={no_hp}
							disabled={loading}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="jkl_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							Jenis Kelamin
						</label>
						<div class="relative">
							<select
								id="jkl_id"
								bind:value={jkl_id}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none cursor-pointer"
							>
								<option value="1">Laki-Laki</option>
								<option value="2">Perempuan</option>
							</select>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Section: Alamat Domisili -->
				<div class="space-y-1.5">
					<label for="alamat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
						Alamat Domisili Pasangan
					</label>
					<textarea 
						id="alamat"
						rows="2"
						placeholder="Contoh: JL. TRANS SULAWESI, KEL. BAILO, KEC. AMPANA KOTA"
						bind:value={alamat}
						disabled={loading}
						class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
					></textarea>
				</div>

				<!-- Section: Upload Dokumen Buku Nikah / Akta Nikah -->
				<div class="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<label for="file_buku_nikah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-pink-600 dark:text-pink-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
							<span>Upload Buku Nikah / Akta Nikah (PDF)</span>
						</span>
						<span class="text-[11px] font-normal text-zinc-400">Maks. 5MB</span>
					</label>

					<div class="flex items-center gap-3">
						<input
							id="file_buku_nikah"
							type="file"
							accept="application/pdf"
							bind:this={fileInputRef}
							onchange={handleFileChange}
							disabled={loading}
							class="block w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 dark:file:bg-pink-950/60 dark:file:text-pink-300 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30"
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
								class="inline-flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-lg border border-pink-200/60 dark:border-pink-800/60"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v6"/><path d="m13 16-3 3-3-3"/></svg>
								<span>Lihat Dokumen Buku Nikah Tersimpan</span>
							</a>
							<span class="text-[10px] text-zinc-400">(Pilih file baru jika ingin mengganti)</span>
						</div>
					{/if}
				</div>

				<!-- Collapsible: Status Perceraian / Meninggal Dunia -->
				<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
					<button
						type="button"
						onclick={() => showStatusLainnya = !showStatusLainnya}
						class="flex items-center justify-between w-full py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
					>
						<span class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
							<span>Informasi Cerai / Meninggal Dunia (Opsional)</span>
						</span>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-200 {showStatusLainnya ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6"/></svg>
					</button>

					{#if showStatusLainnya}
						<div class="pt-3 space-y-3.5 animate-in fade-in duration-150">
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 rounded-xl">
								<div class="space-y-1.5">
									<label for="aktaCerai" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
										Nomor Akta Cerai
									</label>
									<input 
										id="aktaCerai"
										type="text"
										placeholder="Nomor Akta Perceraian"
										bind:value={aktaCerai}
										disabled={loading}
										class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
									/>
								</div>

								<div class="space-y-1.5">
									<label for="tglCerai" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
										Tanggal Cerai
									</label>
									<input 
										id="tglCerai"
										type="date"
										bind:value={tglCerai}
										disabled={loading}
										class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 rounded-xl">
								<div class="space-y-1.5">
									<label for="aktaMeninggal" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
										Nomor Surat Kematian
									</label>
									<input 
										id="aktaMeninggal"
										type="text"
										placeholder="Nomor Akta Kematian"
										bind:value={aktaMeninggal}
										disabled={loading}
										class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
									/>
								</div>

								<div class="space-y-1.5">
									<label for="tglMeninggal" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
										Tanggal Meninggal
									</label>
									<input 
										id="tglMeninggal"
										type="date"
										bind:value={tglMeninggal}
										disabled={loading}
										class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
									/>
								</div>
							</div>
						</div>
					{/if}
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
						{item ? 'Simpan Perubahan' : 'Tambah Data Pasangan'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
