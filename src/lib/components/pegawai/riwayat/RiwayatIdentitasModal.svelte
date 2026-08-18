<script>
	import { api } from '$lib/utils/api.js';
	import { toastStore as toast } from '$lib/stores/toastStore.js';

	let {
		open = false,
		item = null,        // data pegawai (ta_pegawai)
		orang = null,       // data orang (ta_orang)
		pegawaiId = null,
		onClose = () => {},
		onSuccess = () => {}
	} = $props();

	// Form State - Kepegawaian
	let nipBaru = $state('');
	let nipLama = $state('');
	let kedudukanPns_id = $state('1');
	let karpeg = $state('');
	let taspen = $state('');
	let bpjs = $state('');

	// Form State - Pribadi
	let nama = $state('');
	let nik = $state('');
	let kk = $state('');
	let t4Lhr = $state('');
	let tglLhr = $state('');
	let jkl_id = $state('1');
	let agama_id = $state('1');
	let kawin_id = $state('1');
	let golDarah = $state('-');

	// Form State - Kontak & Domisili
	let no_hp = $state('');
	let email = $state('');
	let npwp = $state('');
	let alamat = $state('');

	// Referensi Master
	let refAgama = $state([]);
	let refKawin = $state([]);
	let refJkl = $state([]);
	let refKedudukan = $state([]);
	let loadingRef = $state(false);

	let loading = $state(false);
	let errorMessage = $state('');

	async function loadReferensi() {
		if (refAgama.length > 0) return;
		loadingRef = true;
		try {
			const res = await api('/pegawai/referensi/identitas');
			if (res?.data) {
				refAgama = res.data.agama || [];
				refKawin = res.data.kawin || [];
				refJkl = res.data.jkl || [];
				refKedudukan = res.data.kedudukan_pns || [];
			}
		} catch (err) {
			console.error('Gagal memuat master referensi identitas', err);
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

	$effect(() => {
		if (open) {
			errorMessage = '';
			loadReferensi();

			const activePegawai = item || {};
			const activeOrang = orang || activePegawai.ta_orang || {};

			if (pegawaiId || item) {
				// Edit mode
				nipBaru = activePegawai.nipBaru || activePegawai.nip || '';
				nipLama = activePegawai.nipLama && activePegawai.nipLama !== '-' ? activePegawai.nipLama : '';
				kedudukanPns_id = String(activePegawai.kedudukanPns_id || '1');
				karpeg = activePegawai.karpeg && activePegawai.karpeg !== '-' ? activePegawai.karpeg : '';
				taspen = activePegawai.taspen && activePegawai.taspen !== '-' ? activePegawai.taspen : '';
				bpjs = activePegawai.bpjs && activePegawai.bpjs !== '-' ? activePegawai.bpjs : '';

				nama = activeOrang.nama || activePegawai.nama || '';
				nik = activeOrang.nik && activeOrang.nik !== '-' ? activeOrang.nik : (activePegawai.nik || '');
				kk = activeOrang.kk && activeOrang.kk !== '-' ? activeOrang.kk : '';
				t4Lhr = activeOrang.t4Lhr && activeOrang.t4Lhr !== '-' ? activeOrang.t4Lhr : '';
				tglLhr = toDateInputVal(activeOrang.tglLhr || activeOrang.tgl_lahir || activePegawai.tglLhr);
				jkl_id = String(activeOrang.jkl_id || '1');
				agama_id = String(activeOrang.agama_id || '1');
				kawin_id = String(activeOrang.kawin_id || '1');
				golDarah = activeOrang.golDarah && activeOrang.golDarah !== '-' ? activeOrang.golDarah : '-';

				no_hp = activeOrang.no_hp && activeOrang.no_hp !== '-' ? activeOrang.no_hp : '';
				email = activeOrang.email && activeOrang.email !== '-' ? activeOrang.email : '';
				npwp = activeOrang.npwp && activeOrang.npwp !== '-' ? activeOrang.npwp : '';
				alamat = activeOrang.alamat && activeOrang.alamat !== '-' ? activeOrang.alamat : '';
			} else {
				// Create mode (Tambah Pegawai Baru)
				nipBaru = '';
				nipLama = '';
				kedudukanPns_id = '1';
				karpeg = '';
				taspen = '';
				bpjs = '';

				nama = '';
				nik = '';
				kk = '';
				t4Lhr = '';
				tglLhr = '';
				jkl_id = '1';
				agama_id = '1';
				kawin_id = '1';
				golDarah = '-';

				no_hp = '';
				email = '';
				npwp = '';
				alamat = '';
			}
		}
	});

	async function handleSubmit(e) {
		e?.preventDefault?.();
		errorMessage = '';

		// Validasi dasar
		if (!nama.trim()) {
			errorMessage = 'Nama lengkap pegawai wajib diisi';
			return;
		}
		if (!nipBaru.trim()) {
			errorMessage = 'NIP Baru wajib diisi';
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
		if (!jkl_id) {
			errorMessage = 'Jenis kelamin wajib dipilih';
			return;
		}

		loading = true;
		try {
			const payload = {
				nama: nama.trim(),
				nipBaru: nipBaru.trim(),
				nipLama: nipLama.trim() || null,
				nik: nik.trim() || null,
				kk: kk.trim() || null,
				t4Lhr: t4Lhr.trim(),
				tglLhr,
				jkl_id,
				agama_id,
				kawin_id,
				golDarah,
				no_hp: no_hp.trim() || null,
				email: email.trim() || null,
				npwp: npwp.trim() || null,
				alamat: alamat.trim() || null,
				karpeg: karpeg.trim() || null,
				taspen: taspen.trim() || null,
				bpjs: bpjs.trim() || null,
				kedudukanPns_id: kedudukanPns_id ? parseInt(kedudukanPns_id) : 1
			};

			const targetId = pegawaiId || item?.id;

			if (targetId) {
				// Update
				await api(`/pegawai/${targetId}/identitas`, {
					method: 'PUT',
					body: JSON.stringify(payload)
				});
				toast.success('Identitas pegawai berhasil diperbarui');
			} else {
				// Create
				const res = await api('/pegawai', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Pegawai baru berhasil ditambahkan');
				if (res?.data?.id) {
					onSuccess(res.data);
					onClose();
					return;
				}
			}

			onSuccess();
			onClose();
		} catch (err) {
			errorMessage = err.message || 'Gagal menyimpan data identitas pegawai';
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
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-identitas-title"
	>
		<!-- Modal Container -->
		<div 
			class="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
		>
			<!-- Modal Header -->
			<div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					</div>
					<div>
						<h3 id="modal-identitas-title" class="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
							Edit Identitas Pegawai
						</h3>
						<p class="text-xs text-zinc-500">
							Perbarui informasi pribadi dan data kepegawaian ASN
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					disabled={loading}
					class="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
					aria-label="Tutup modal"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Modal Body (Scrollable Form) -->
			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-5 space-y-5 text-zinc-900 dark:text-zinc-100">
				{#if errorMessage}
					<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- SECTION 1: DATA KEPEGAWAIAN -->
				<div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3.5">
					<div class="flex items-center gap-2 border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
						<div class="w-2 h-2 rounded-full bg-indigo-500"></div>
						<h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
							1. Data Kepegawaian
						</h4>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
						<!-- NIP Baru (Terkunci / Tidak Dapat Diubah) -->
						<div class="space-y-1.5 sm:col-span-2 md:col-span-1">
							<div class="flex items-center justify-between">
								<label for="nipBaru" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									NIP Baru (18 Digit)
								</label>
								<span class="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
									Terkunci
								</span>
							</div>
							<input 
								id="nipBaru"
								type="text"
								value={nipBaru}
								disabled={true}
								readonly
								class="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-mono font-bold select-all"
								title="NIP tidak dapat diubah"
							/>
						</div>

						<!-- NIP Lama (Terkunci / Tidak Dapat Diubah) -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<label for="nipLama" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									NIP Lama (9 Digit)
								</label>
								<span class="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
									Terkunci
								</span>
							</div>
							<input 
								id="nipLama"
								type="text"
								value={nipLama || '-'}
								disabled={true}
								readonly
								class="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-mono select-all"
								title="NIP Lama tidak dapat diubah"
							/>
						</div>

						<!-- Kedudukan PNS -->
						<div class="space-y-1.5">
							<label for="kedudukanPns_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Kedudukan PNS
							</label>
							<select
								id="kedudukanPns_id"
								bind:value={kedudukanPns_id}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								{#each refKedudukan as kp}
									<option value={String(kp.id)}>{kp.kedudukanPns}</option>
								{/each}
							</select>
						</div>

						<!-- No. KARPEG -->
						<div class="space-y-1.5">
							<label for="karpeg" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. Kartu Pegawai (KARPEG)
							</label>
							<input 
								id="karpeg"
								type="text"
								placeholder="Contoh: A 04033853"
								bind:value={karpeg}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- No. Taspen -->
						<div class="space-y-1.5">
							<label for="taspen" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. Taspen
							</label>
							<input 
								id="taspen"
								type="text"
								placeholder="Contoh: 19900101..."
								bind:value={taspen}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- No. BPJS / Askes -->
						<div class="space-y-1.5">
							<label for="bpjs" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. BPJS Kesehatan / Askes
							</label>
							<input 
								id="bpjs"
								type="text"
								placeholder="Contoh: 0001234567890"
								bind:value={bpjs}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>
					</div>
				</div>

				<!-- SECTION 2: DATA PRIBADI -->
				<div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3.5">
					<div class="flex items-center gap-2 border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
						<div class="w-2 h-2 rounded-full bg-emerald-500"></div>
						<h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
							2. Data Pribadi Pegawai
						</h4>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
						<!-- Nama Lengkap -->
						<div class="space-y-1.5 sm:col-span-2">
							<label for="nama" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Nama Lengkap <span class="text-rose-500">*</span>
							</label>
							<input 
								id="nama"
								type="text"
								placeholder="Contoh: AHMAD DAHLAN, S.Kom."
								bind:value={nama}
								disabled={loading}
								required
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
							/>
						</div>

						<!-- Golongan Darah -->
						<div class="space-y-1.5">
							<label for="golDarah" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Golongan Darah
							</label>
							<select
								id="golDarah"
								bind:value={golDarah}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								<option value="-">-</option>
								<option value="A">A</option>
								<option value="B">B</option>
								<option value="AB">AB</option>
								<option value="O">O</option>
							</select>
						</div>

						<!-- NIK -->
						<div class="space-y-1.5">
							<label for="nik" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								NIK (16 Digit)
							</label>
							<input 
								id="nik"
								type="text"
								maxlength="19"
								placeholder="Contoh: 7209010101900001"
								bind:value={nik}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- No. KK -->
						<div class="space-y-1.5">
							<label for="kk" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. Kartu Keluarga (KK)
							</label>
							<input 
								id="kk"
								type="text"
								maxlength="25"
								placeholder="Contoh: 7209010101900002"
								bind:value={kk}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- Tempat Lahir -->
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
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
							/>
						</div>

						<!-- Tanggal Lahir -->
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
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
							/>
						</div>

						<!-- Jenis Kelamin -->
						<div class="space-y-1.5">
							<label for="jkl_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Jenis Kelamin <span class="text-rose-500">*</span>
							</label>
							<select
								id="jkl_id"
								bind:value={jkl_id}
								disabled={loading}
								required
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								{#each refJkl as j}
									<option value={String(j.id)}>{j.jkl}</option>
								{/each}
							</select>
						</div>

						<!-- Agama -->
						<div class="space-y-1.5">
							<label for="agama_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Agama
							</label>
							<select
								id="agama_id"
								bind:value={agama_id}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								{#each refAgama as a}
									<option value={String(a.id)}>{a.agama}</option>
								{/each}
							</select>
						</div>

						<!-- Status Perkawinan -->
						<div class="space-y-1.5">
							<label for="kawin_id" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Status Perkawinan
							</label>
							<select
								id="kawin_id"
								bind:value={kawin_id}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								{#each refKawin as k}
									<option value={String(k.id)}>{k.kawin}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- SECTION 3: KONTAK & DOMISILI -->
				<div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3.5">
					<div class="flex items-center gap-2 border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
						<div class="w-2 h-2 rounded-full bg-amber-500"></div>
						<h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
							3. Kontak & Domisili
						</h4>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
						<!-- No HP / WA -->
						<div class="space-y-1.5">
							<label for="no_hp" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. HP / WhatsApp
							</label>
							<input 
								id="no_hp"
								type="tel"
								placeholder="Contoh: 081234567890"
								bind:value={no_hp}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- Email -->
						<div class="space-y-1.5">
							<label for="email" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Alamat Email
							</label>
							<input 
								id="email"
								type="email"
								placeholder="Contoh: ahmad@tojouanua.go.id"
								bind:value={email}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
							/>
						</div>

						<!-- NPWP -->
						<div class="space-y-1.5">
							<label for="npwp" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								No. NPWP
							</label>
							<input 
								id="npwp"
								type="text"
								placeholder="Contoh: 12.345.678.9-012.000"
								bind:value={npwp}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
							/>
						</div>

						<!-- Alamat Lengkap -->
						<div class="space-y-1.5 sm:col-span-2 md:col-span-3">
							<label for="alamat" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Alamat Domisili Lengkap
							</label>
							<textarea 
								id="alamat"
								rows="2"
								placeholder="Contoh: Jl. Merdeka No. 10, Kel. Ampana, Kec. Ampana Kota, Kab. Tojo Una-Una"
								bind:value={alamat}
								disabled={loading}
								class="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
							></textarea>
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={onClose}
						disabled={loading}
						class="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer"
					>
						Batal
					</button>

					<button
						type="submit"
						disabled={loading}
						class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
					>
						{#if loading}
							<span class="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"></span>
							<span>Menyimpan...</span>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							<span>Simpan Perubahan</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
