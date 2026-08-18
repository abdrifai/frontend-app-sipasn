<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatHukdisModal from './RiwayatHukdisModal.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';

	const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';

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

	function openCreateModal() {
		selectedItem = null;
		showModal = true;
	}

	function openEditModal(rh) {
		selectedItem = rh;
		showModal = true;
	}

	function openDeleteModal(rh) {
		itemToDelete = rh;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-hukdis/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat hukuman disiplin berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat hukuman disiplin');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex items-center justify-between gap-3 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-rose-500"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Catatan Rekam Jejak Hukuman Disiplin
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
					{riwayat.length} Catatan
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
				title="Tambah catatan hukuman disiplin baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Hukuman Disiplin</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat List -->
	{#if riwayat?.length}
		<div class="space-y-3">
			{#each riwayat as rh}
				<div class="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-3 shadow-2xs">
					
					<!-- Header Item: Level Badge, Jenis, TMT & Actions -->
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex flex-wrap items-center gap-2">
							<span class="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 text-[11px] font-bold border border-rose-200 dark:border-rose-800">
								{rh.tingkat}
							</span>
							<span class="font-bold text-xs sm:text-sm text-rose-950 dark:text-rose-100">
								{rh.jenis}
							</span>
						</div>

						<div class="flex items-center gap-2">
							<span class="px-2.5 py-1 rounded-lg bg-rose-100/60 dark:bg-rose-900/40 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
								Masa: {rh.masa_hukuman} (TMT: {rh.tmt_sk} s/d {rh.tgl_akhir})
							</span>

							{#if pegawaiId}
								<div class="flex items-center gap-1 pl-1">
									<button
										type="button"
										onclick={() => openEditModal(rh)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
										title="Edit catatan hukuman disiplin"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
									</button>
									<button
										type="button"
										onclick={() => openDeleteModal(rh)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
										title="Hapus catatan hukuman disiplin"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Alasan Penjatuhan Hukuman -->
					<div class="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-rose-100 dark:border-rose-900/30 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
						<strong class="text-zinc-900 dark:text-zinc-100 font-semibold">Alasan Penjatuhan Hukuman:</strong> {rh.alasan}
					</div>

					<!-- Footer Details: No. SK, Tgl SK, Dasar Hukum, Pejabat / Ket, & PDF SK -->
					<div class="flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-500 pt-1 border-t border-rose-100 dark:border-rose-900/30">
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
							<span>No. SK: <strong class="font-mono text-zinc-700 dark:text-zinc-300">{rh.sk}</strong> ({rh.tgl_sk})</span>
							<span>Dasar Hukum: <strong class="text-zinc-700 dark:text-zinc-300">{rh.no_pp}</strong></span>
							{#if rh.ket && rh.ket !== '-'}
								<span>Pejabat/Ket: <strong class="text-zinc-700 dark:text-zinc-300">{rh.ket}</strong></span>
							{/if}
						</div>

						{#if rh.dokumen_sk}
							<a
								href={`${BACKEND_URL}${rh.dokumen_sk}`}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-200 text-xs font-semibold transition-colors"
								title="Buka / Unduh Dokumen SK Hukuman Disiplin (PDF)"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
								<span>Dokumen SK Hukdis</span>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 border border-dashed border-emerald-200 dark:border-emerald-900/40 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10">
			<div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
			</div>
			<p class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Tidak Ada Catatan Hukuman Disiplin</p>
			<p class="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai memiliki rekam jejak disiplin yang bersih tanpa catatan sanksi atau pelanggaran.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Hukuman Disiplin</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Hukdis -->
<RiwayatHukdisModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Catatan Hukuman Disiplin"
	message={`Apakah Anda yakin ingin menghapus catatan hukuman disiplin ${itemToDelete?.jenis ? `"${itemToDelete.jenis}"` : ''} (SK: ${itemToDelete?.sk || '-'})? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Catatan"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
