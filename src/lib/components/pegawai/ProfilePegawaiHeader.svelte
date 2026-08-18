<script>
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CropModal from '$lib/components/ui/CropModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore';

	let {
		pegawai = {},
		pegawaiId = null,
		onClose = null,
		showFullProfileLink = false,
		editable = true,
		onPhotoUpdated = null,
		variant = 'card' // 'card' | 'embedded'
	} = $props();

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	// State untuk upload & crop foto
	let fileInputRef = $state(null);
	let tempImage = $state(null);
	let showCropModal = $state(false);
	let uploading = $state(false);
	let fotoOverride = $state(null);

	const actualPegawaiId = $derived(pegawaiId || pegawai?.id);

	// Helper format nama lengkap dengan gelar depan & belakang
	const formatNamaGelar = (namaRaw, gd, gb) => {
		if (!namaRaw || namaRaw === '-') return '-';
		let result = namaRaw.trim();
		const cleanGd = gd && gd !== '-' ? gd.trim() : '';
		const cleanGb = gb && gb !== '-' ? gb.trim() : '';

		if (cleanGd && !result.toLowerCase().startsWith(cleanGd.toLowerCase())) {
			result = `${cleanGd} ${result}`;
		}
		if (cleanGb && !result.toLowerCase().endsWith(cleanGb.toLowerCase())) {
			result = `${result}, ${cleanGb}`;
		}
		return result;
	};

	const rawNama = $derived(
		pegawai?.nama_asli ||
		pegawai?.ta_orang?.nama || 
		pegawai?.nama || 
		'-'
	);

	const gelarDepan = $derived(
		pegawai?.gelar_depan ||
		pegawai?.ta_orang?.gelar_depan ||
		pegawai?.rwt_pend?.gd ||
		pegawai?.riwayat_pendidikan?.[0]?.gelar_depan ||
		pegawai?.riwayat_pendidikan?.[0]?.gd ||
		''
	);

	const gelarBelakang = $derived(
		pegawai?.gelar_belakang ||
		pegawai?.ta_orang?.gelar_belakang ||
		pegawai?.rwt_pend?.gb ||
		pegawai?.riwayat_pendidikan?.[0]?.gelar_belakang ||
		pegawai?.riwayat_pendidikan?.[0]?.gb ||
		''
	);

	// Derived helpers for flexible data structures
	const nama = $derived(
		pegawai?.nama_formatted ||
		pegawai?.ta_orang?.nama_formatted || 
		formatNamaGelar(rawNama, gelarDepan, gelarBelakang)
	);

	const nip = $derived(
		pegawai?.nipBaru || 
		pegawai?.nip || 
		pegawai?.ta_orang?.nip || 
		'-'
	);

	const foto = $derived(
		fotoOverride ||
		pegawai?.ta_orang?.foto || 
		pegawai?.foto || 
		''
	);

	const fotoSrc = $derived(
		foto ? (foto.startsWith('http') || foto.startsWith('blob:') || foto.startsWith('data:') ? foto : `${API_BASE}/${foto}`) : ''
	);

	const golongan = $derived(
		pegawai?.golongan || 
		pegawai?.rwt_gol?.ref_gol?.gol || 
		pegawai?.riwayat_golongan?.[0]?.golongan ||
		pegawai?.rwt_golongan?.golongan_nama || 
		'-'
	);

	const jabatan = $derived(
		pegawai?.jabatan_nama || 
		pegawai?.jabatan || 
		pegawai?.riwayat_jabatan?.[0]?.nama_jabatan ||
		pegawai?.rwt_jabatan?.nama_jabatan || 
		pegawai?.rwt_jabatan?.ref_jab?.nm_jab || 
		pegawai?.rwt_jabatan?.ref_nmjabsimpeglama?.nmJab || 
		'-'
	);

	const unitKerja = $derived(
		pegawai?.unit_kerja || 
		pegawai?.rwt_jabatan?.ref_unorinduk?.nmUnor || 
		pegawai?.riwayat_jabatan?.[0]?.unit_kerja ||
		'-'
	);

	const statusPns = $derived(pegawai?.status_pns || 'PNS Aktif');

	function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				tempImage = event.target.result;
				showCropModal = true;
			};
			reader.readAsDataURL(file);
			e.target.value = '';
		}
	}

	async function handleCrop(blob) {
		showCropModal = false;
		if (!actualPegawaiId) {
			toast.error('ID Pegawai tidak ditemukan');
			return;
		}

		uploading = true;
		try {
			const file = new File([blob], `foto-${actualPegawaiId}.jpg`, { type: 'image/jpeg' });
			const formData = new FormData();
			formData.append('foto', file);

			const res = await api(`/pegawai/${actualPegawaiId}/foto`, {
				method: 'PUT',
				body: formData
			});

			fotoOverride = res.data.foto;
			toast.success('Foto pegawai berhasil diperbarui');
			onPhotoUpdated?.(res.data);
		} catch (err) {
			toast.error(err.message || 'Gagal mengunggah foto pegawai');
		} finally {
			uploading = false;
		}
	}
</script>

{#if showCropModal}
	<CropModal 
		image={tempImage} 
		onCrop={handleCrop} 
		onCancel={() => { showCropModal = false; tempImage = null; }} 
	/>
{/if}

<div class="{variant === 'card' 
	? 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all duration-300' 
	: 'p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-linear-to-b from-zinc-50/50 dark:from-zinc-900/50 to-transparent'}">
	<div class="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
		<!-- Foto Pegawai dengan Ring Halus & Tombol Ubah Foto -->
		<div class="relative shrink-0 group">
			<div class="relative ring-4 ring-zinc-100/80 dark:ring-zinc-800/80 rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-[1.02] overflow-hidden">
				<Avatar 
					src={fotoSrc} 
					name={nama} 
					size="xl" 
				/>

				{#if uploading}
					<div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
						<span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mb-1"></span>
						<span class="text-[9px] font-bold tracking-wider">Menyimpan...</span>
					</div>
				{:else if editable && actualPegawaiId}
					<!-- Overlay Hover Trigger -->
					<button
						type="button"
						onclick={() => fileInputRef?.click()}
						class="absolute inset-0 bg-zinc-950/50 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer rounded-2xl z-10"
						title="Klik untuk mengubah foto pegawai"
						aria-label="Ubah Foto Pegawai"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
							<circle cx="12" cy="13" r="3"/>
						</svg>
						<span class="text-[9px] font-bold uppercase tracking-wider mt-1">Ubah Foto</span>
					</button>
				{/if}
			</div>

			{#if editable && actualPegawaiId && !uploading}
				<!-- Badge Tombol Kamera di Sudut Kanan Bawah -->
				<button
					type="button"
					onclick={() => fileInputRef?.click()}
					class="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-md flex items-center justify-center cursor-pointer text-indigo-600 dark:text-indigo-400 hover:scale-110 active:scale-95 transition-all z-20"
					title="Ubah Foto Pegawai"
					aria-label="Ubah Foto Pegawai"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
						<circle cx="12" cy="13" r="3"/>
					</svg>
				</button>

				<input
					bind:this={fileInputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					class="hidden"
					onchange={handleFileChange}
				/>
			{/if}
		</div>
		
		<!-- Identitas Utama & Status -->
		<div class="flex-1 min-w-0 space-y-2.5 w-full">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<!-- Sisi Kiri: Nama & NIP -->
				<div class="flex flex-wrap items-center gap-2 min-w-0">
					<h1 class="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
						{nama}
					</h1>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
						{nip}
					</span>
				</div>

				<!-- Sisi Kanan: Badge Golongan, Status Pegawai, dan Actions -->
				<div class="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
					{#if golongan !== '-'}
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
							<span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
							Gol. {golongan}
						</span>
					{/if}
					<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
						{statusPns}
					</span>

					{#if showFullProfileLink && pegawaiId}
						<a 
							href="/pegawai/{pegawaiId}"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-all shadow-2xs hover:shadow-xs"
						>
							<span>Profil Lengkap</span>
							<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
						</a>
					{/if}

					{#if onClose}
						<button 
							onclick={onClose}
							class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
							title="Tutup"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Jabatan & Unit Kerja Minimalis -->
			<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
				<div class="flex items-center gap-2 min-w-0">
					<div class="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
					</div>
					<span class="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{jabatan}</span>
				</div>

				<span class="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>

				<div class="flex items-center gap-2 min-w-0">
					<div class="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
					</div>
					<span class="text-zinc-600 dark:text-zinc-400 truncate">{unitKerja}</span>
				</div>
			</div>
		</div>
	</div>
</div>
