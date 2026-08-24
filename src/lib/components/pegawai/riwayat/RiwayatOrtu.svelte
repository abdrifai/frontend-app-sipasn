<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatOrtuModal from './RiwayatOrtuModal.svelte';
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

	function openCreateModal() {
		selectedItem = null;
		showModal = true;
	}

	function openEditModal(ro) {
		selectedItem = ro;
		showModal = true;
	}

	function openDeleteModal(ro) {
		itemToDelete = ro;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-ortu/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Data orang tua berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus data orang tua');
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
				Data Riwayat Orang Tua
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah data orang tua baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Data Orang Tua</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Grid Cards -->
	{#if riwayat?.length}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
			{#each riwayat as ro}
				<div class="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all">
					
					<!-- Header Card: Hubungan & PNS Badge + Actions -->
					<div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-2 flex-wrap min-w-0">
							<Badge variant={ro.hubungan?.toLowerCase().includes('mertua') ? 'orange' : 'indigo'}>
								{ro.hubungan}
							</Badge>
							<span class="px-2 py-0.5 text-[10px] font-bold rounded-md {ro.is_pns || ro.pns === 'PNS' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}">
								{ro.pns || 'Bukan PNS'}
							</span>
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(ro)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
									title="Edit data orang tua"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(ro)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus data orang tua"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body Card: Nama & NIK -->
					<div class="space-y-0.5">
						<h5 class="font-bold text-sm text-zinc-900 dark:text-zinc-100 break-words">{ro.nama || '-'}</h5>
						{#if ro.nik && ro.nik !== '-'}
							<p class="text-xs text-zinc-500 font-mono">NIK: <span class="text-zinc-700 dark:text-zinc-300 font-medium break-all">{ro.nik}</span></p>
						{/if}
					</div>

					<!-- Body Card: TTL & Alamat & Kontak -->
					<div class="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
						<p class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
							<span class="break-words">TTL: <strong class="text-zinc-800 dark:text-zinc-200">{ro.ttl || '-'}</strong></span>
						</p>

						{#if ro.no_hp && ro.no_hp !== '-'}
							<p class="flex items-center gap-1.5">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
								<span>No. HP: <span class="text-zinc-800 dark:text-zinc-200 font-medium font-mono">{ro.no_hp}</span></span>
							</p>
						{/if}

						{#if ro.alamat && ro.alamat !== '-'}
							<p class="flex items-start gap-1.5 pt-0.5 text-[11px]">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
								<span class="leading-relaxed break-words">{ro.alamat}</span>
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Data Orang Tua</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki data orang tua kandung atau mertua yang tercatat dalam sistem.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Data Orang Tua</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Ortu -->
<RiwayatOrtuModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Data Orang Tua"
	message={`Apakah Anda yakin ingin menghapus data orang tua ${itemToDelete?.nama ? `"${itemToDelete.nama}"` : ''} (${itemToDelete?.hubungan || '-'})? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Data"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
