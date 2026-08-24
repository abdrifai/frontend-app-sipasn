<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatPasanganModal from './RiwayatPasanganModal.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';

	let { 
		riwayat = [],
		pegawaiId = null,
		onSuccess = () => {}
	} = $props();

	let showModal = $state(false);
	let selectedItem = $state(null);

	let showDeleteModal = $state(false);
	let itemToDelete = $state(null);
	let deleting = $state(false);

	const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

	function openCreateModal() {
		selectedItem = null;
		showModal = true;
	}

	function openEditModal(rpas) {
		selectedItem = rpas;
		showModal = true;
	}

	function openDeleteModal(rpas) {
		itemToDelete = rpas;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-pasangan/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Data pasangan berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus data pasangan');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-pink-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Data Riwayat Pasangan (Suami / Istri)
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200/60 dark:border-pink-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah data pasangan baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Data Pasangan</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Grid Cards -->
	{#if riwayat?.length}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
			{#each riwayat as rpas}
				<div class="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-pink-200 dark:hover:border-pink-900/60 transition-all">
					
					<!-- Header Card: Hubungan & PNS Badge + Actions -->
					<div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-2 flex-wrap min-w-0">
							<Badge variant={rpas.hubungan?.toLowerCase().includes('suami') ? 'blue' : 'pink'}>
								{rpas.hubungan}
							</Badge>
							<span class="px-2 py-0.5 text-[10px] font-bold rounded-md {rpas.is_pns || rpas.pns === 'PNS' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}">
								{rpas.pns || 'Bukan PNS'}
							</span>
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rpas)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/50 transition-colors cursor-pointer"
									title="Edit data pasangan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rpas)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus data pasangan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body Card: Nama, NIK, NPWP -->
					<div class="space-y-0.5">
						<h5 class="font-bold text-sm text-zinc-900 dark:text-zinc-100 break-words">{rpas.nama || '-'}</h5>
						<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 font-mono mt-0.5">
							{#if rpas.nik && rpas.nik !== '-'}
								<p class="break-all">NIK: <span class="text-zinc-700 dark:text-zinc-300 font-medium">{rpas.nik}</span></p>
							{/if}
							{#if rpas.npwp && rpas.npwp !== '-'}
								<p class="break-all">NPWP: <span class="text-zinc-700 dark:text-zinc-300 font-medium">{rpas.npwp}</span></p>
							{/if}
						</div>
					</div>

					<!-- Body Card: Akta Nikah, Tgl Nikah, KARIS/KARSU -->
					<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
						<div>
							<span class="text-[10px] uppercase font-bold text-zinc-400">Akta / Buku Nikah</span>
							<p class="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 break-words break-all">{rpas.akta_nikah || '-'}</p>
						</div>
						<div>
							<span class="text-[10px] uppercase font-bold text-zinc-400">Tanggal Menikah</span>
							<p class="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{rpas.tgl_nikah || '-'}</p>
						</div>
						{#if rpas.karis_karsu && rpas.karis_karsu !== '-'}
							<div class="sm:col-span-2 pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
								<span class="text-[10px] uppercase font-bold text-zinc-400">No. Karis / Karsu</span>
								<p class="font-mono font-bold text-pink-700 dark:text-pink-300 mt-0.5 break-words break-all">{rpas.karis_karsu}</p>
							</div>
						{/if}
						{#if rpas.dokumen_sk || rpas.dokumen_nikah}
							<div class="sm:col-span-2 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-700/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
								<span class="text-[10px] uppercase font-bold text-zinc-400">Dokumen Buku Nikah</span>
								<a
									href={`${API_BASE}${rpas.dokumen_sk || rpas.dokumen_nikah}`}
									target="_blank"
									rel="noreferrer"
									class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/50 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-semibold text-[11px] border border-pink-200/60 dark:border-pink-800/60 transition-colors w-full sm:w-auto"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v6"/><path d="m13 16-3 3-3-3"/></svg>
									<span>Lihat Buku Nikah (PDF)</span>
								</a>
							</div>
						{/if}
					</div>

					<!-- Body Card: TTL, Kontak & Alamat -->
					<div class="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
						<p class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
							<span class="break-words">TTL: <strong class="text-zinc-800 dark:text-zinc-200">{rpas.ttl || '-'}</strong></span>
						</p>

						{#if rpas.no_hp && rpas.no_hp !== '-'}
							<p class="flex items-center gap-1.5">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
								<span>No. HP: <span class="text-zinc-800 dark:text-zinc-200 font-medium font-mono">{rpas.no_hp}</span></span>
							</p>
						{/if}

						{#if rpas.alamat && rpas.alamat !== '-'}
							<p class="flex items-start gap-1.5 pt-0.5 text-[11px]">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
								<span class="leading-relaxed break-words">{rpas.alamat}</span>
							</p>
						{/if}

						<!-- Status Khusus Cerai / Meninggal jika ada -->
						{#if (rpas.akta_cerai && rpas.akta_cerai !== '-') || (rpas.akta_meninggal && rpas.akta_meninggal !== '-')}
							<div class="pt-2 mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-1">
								{#if rpas.akta_cerai && rpas.akta_cerai !== '-'}
									<div class="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded text-[11px] flex flex-wrap items-center justify-between gap-1">
										<span class="break-words break-all">Akta Cerai: <strong>{rpas.akta_cerai}</strong></span>
										<span>Tgl: {rpas.tgl_cerai || '-'}</span>
									</div>
								{/if}
								{#if rpas.akta_meninggal && rpas.akta_meninggal !== '-'}
									<div class="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[11px] flex flex-wrap items-center justify-between gap-1">
										<span class="break-words break-all">Surat Kematian: <strong>{rpas.akta_meninggal}</strong></span>
										<span>Tgl: {rpas.tgl_meninggal || '-'}</span>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 flex items-center justify-center text-pink-500 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Data Pasangan</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki data suami atau istri yang tercatat dalam sistem.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Data Pasangan</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Pasangan -->
<RiwayatPasanganModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Data Pasangan"
	message={`Apakah Anda yakin ingin menghapus data pasangan ${itemToDelete?.nama ? `"${itemToDelete.nama}"` : ''} (${itemToDelete?.hubungan || '-'})? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Data"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
