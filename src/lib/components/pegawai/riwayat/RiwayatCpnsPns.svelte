<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatCpnsPnsModal from './RiwayatCpnsPnsModal.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';

	const toast = toastStore;

	let { 
		riwayat = [],
		pegawaiId = null,
		refGolongan = [],
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

	function openEditModal(cp) {
		selectedItem = cp;
		showModal = true;
	}

	function openDeleteModal(cp) {
		itemToDelete = cp;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;

		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/cpns-pns/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toast.success('Data CPNS/PNS berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data CPNS/PNS');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Data Penetapan CPNS / PNS Pegawai
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
					{riwayat.length} Penetapan
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah riwayat CPNS / PNS baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah CPNS / PNS</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat List Cards -->
	{#if riwayat?.length}
		<div class="space-y-3.5">
			{#each riwayat as cp}
				<div class="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all">
					
					<!-- Header Card: Status Badge, Golongan, TMT + Actions -->
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
						<div class="flex items-center gap-2 flex-wrap min-w-0">
							<Badge variant={cp.status_pns?.includes('CPNS') ? 'indigo' : 'success'}>
								{cp.status_pns || 'CPNS/PNS'}
							</Badge>
							{#if cp.golongan && cp.golongan !== '-'}
								<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
									Golongan {cp.golongan}
								</span>
							{/if}
							{#if cp.masa_kerja && cp.masa_kerja !== '0 Thn 0 Bln' && cp.masa_kerja !== '-'}
								<span class="text-[11px] text-zinc-500 font-medium">
									(MK: {cp.masa_kerja})
								</span>
							{/if}
						</div>

						<div class="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
							<span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 font-mono">
								TMT: {cp.tmt_sk || '-'}
							</span>

							{#if pegawaiId}
								<div class="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onclick={() => openEditModal(cp)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
										title="Edit data CPNS/PNS"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
									</button>
									<button
										type="button"
										onclick={() => openDeleteModal(cp)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
										title="Hapus data CPNS/PNS"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Body Card: Grid Info (Kondisional CPNS vs PNS) -->
					{#if cp.status_pns?.includes('CPNS') || String(cp.spns_id) === '1'}
						<!-- Tampilan Khusus SK CPNS -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
							<!-- SK CPNS Details -->
							<div class="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
								<p class="text-[10px] uppercase font-bold text-zinc-400">Nomor & Tanggal SK CPNS</p>
								<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{cp.sk || '-'}</p>
								<p class="text-[11px] text-zinc-500 font-mono">Tgl: {cp.tgl_sk || '-'}</p>
							</div>

							<!-- Pertek BKN (Khusus CPNS) -->
							<div class="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
								<p class="text-[10px] uppercase font-bold text-zinc-400">Persetujuan Teknis (Pertek BKN)</p>
								<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{cp.pertek_bkn && cp.pertek_bkn !== '-' ? cp.pertek_bkn : 'Belum diisi'}</p>
								{#if cp.tgl_pertek && cp.tgl_pertek !== '-'}
									<p class="text-[11px] text-zinc-500 font-mono">Tgl: {cp.tgl_pertek}</p>
								{/if}
							</div>
						</div>
					{:else}
						<!-- Tampilan Khusus SK PNS (Hanya SK PNS & STTPL) -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
							<!-- SK PNS Details -->
							<div class="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
								<p class="text-[10px] uppercase font-bold text-zinc-400">Nomor & Tanggal SK PNS</p>
								<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{cp.sk || '-'}</p>
								<p class="text-[11px] text-zinc-500 font-mono">Tgl: {cp.tgl_sk || '-'}</p>
							</div>

							<!-- STTPL / Diklat Prajabatan / Latsar -->
							<div class="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
								<p class="text-[10px] uppercase font-bold text-zinc-400">STTPL (Prajabatan / Latsar)</p>
								<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{cp.sttpl && cp.sttpl !== '-' ? cp.sttpl : 'Belum diisi'}</p>
								{#if cp.tgl_sttpl && cp.tgl_sttpl !== '-'}
									<p class="text-[11px] text-zinc-500 font-mono">Tgl: {cp.tgl_sttpl}</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Bottom Row: Pejabat Penetap & Dokumen SK -->
					<div class="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
						<div class="text-zinc-500 min-w-0">
							{#if cp.penanda_tangan && cp.penanda_tangan !== '-'}
								<span class="break-words">Pejabat Penetap: <strong class="text-zinc-700 dark:text-zinc-300 font-semibold">{cp.penanda_tangan}</strong></span>
							{/if}
						</div>

						{#if cp.dokumen_sk}
							<a
								href={`${API_BASE}${cp.dokumen_sk}`}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200/60 dark:border-indigo-800/60 transition-colors w-full sm:w-auto"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v6"/><path d="m13 16-3 3-3-3"/></svg>
								<span>Lihat Dokumen SK (PDF)</span>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
			</div>
			<h5 class="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Data CPNS / PNS</h5>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
				Data riwayat penetapan SK CPNS atau SK Pengangkatan PNS belum tercatat untuk pegawai ini.
			</p>
			{#if pegawaiId}
				<div class="mt-4">
					<Button
						variant="primary"
						onclick={openCreateModal}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
						<span>Tambah Data CPNS / PNS Sekarang</span>
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Tambah / Edit CPNS/PNS -->
<RiwayatCpnsPnsModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	{refGolongan}
	onClose={() => showModal = false}
	{onSuccess}
/>

<!-- Modal Konfirmasi Hapus Data CPNS/PNS -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Data Penetapan CPNS / PNS"
	message={`Apakah Anda yakin ingin menghapus data penetapan "${itemToDelete?.status_pns || ''} - SK: ${itemToDelete?.sk || ''}"? Berkas digital SK terkait juga akan dihapus dari server.`}
	confirmLabel="Hapus Data"
	confirmVariant="danger"
	loading={deleting}
	onClose={() => { if (!deleting) showDeleteModal = false; }}
	onConfirm={handleDelete}
/>
