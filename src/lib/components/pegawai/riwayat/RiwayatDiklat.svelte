<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatDiklatModal from './RiwayatDiklatModal.svelte';
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

	function openEditModal(rd) {
		selectedItem = rd;
		showModal = true;
	}

	function openDeleteModal(rd) {
		itemToDelete = rd;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-diklat/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat diklat berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat diklat');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Riwayat Diklat & Pelatihan
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah riwayat diklat baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Riwayat Diklat</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Data List -->
	{#if riwayat?.length}
		<!-- Mobile Card View (Tampilan Khusus Layar Kecil / Smartphone) -->
		<div class="block sm:hidden space-y-3">
			{#each riwayat as rd, idx}
				<div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-amber-200 dark:hover:border-amber-900/60 transition-all {idx === 0 ? 'ring-1 ring-amber-500/20 bg-amber-50/10 dark:bg-amber-950/10' : ''}">
					<!-- Top Row: Badges & Actions -->
					<div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-1.5 flex-wrap min-w-0">
							<span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs border border-amber-200/50 dark:border-amber-800/50">
								{rd.jenis_diklat || 'Diklat'}
							</span>
							{#if rd.jenjang_diklat && rd.jenjang_diklat !== '-'}
								<span class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-700">
									{rd.jenjang_diklat}
								</span>
							{/if}
							{#if idx === 0}
								<span class="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md">Terbaru</span>
							{/if}
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rd)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
									title="Edit data riwayat diklat"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rd)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus riwayat diklat"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body: Nama Diklat, Penyelenggara, Tempat & Angkatan -->
					<div class="space-y-1 text-xs">
						<p class="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words">
							{rd.nama_diklat || '-'}
						</p>
						<p class="text-xs font-medium text-zinc-700 dark:text-zinc-300 break-words">
							Penyelenggara: <span class="font-semibold text-zinc-800 dark:text-zinc-200">{rd.penyelenggara || '-'}</span>
						</p>
						<div class="pt-0.5 text-[11px] text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
							{#if rd.tempat && rd.tempat !== '-'}
								<span class="flex items-center gap-1">
									<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
									<span>{rd.tempat}</span>
								</span>
							{/if}
							{#if rd.angkatan && rd.angkatan !== '-'}
								<span>Angkatan: <strong class="text-zinc-800 dark:text-zinc-200 font-semibold">{rd.angkatan}</strong></span>
							{/if}
						</div>
					</div>

					<!-- Bottom Grid: Sertifikat & Document -->
					<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2 text-xs">
						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
							<p class="text-[10px] uppercase font-bold text-zinc-400">No. Sertifikat / STTPL & Tanggal</p>
							<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 text-[11px] break-words break-all">{rd.no_sertifikat || '-'}</p>
							<p class="text-[10px] text-zinc-400 font-mono">Tgl: {rd.tgl_sertifikat || '-'}</p>

							{#if rd.dokumen_diklat}
								<div class="pt-1.5">
									<a
										href={`${BACKEND_URL}${rd.dokumen_diklat}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
										title="Buka / Unduh Sertifikat STTPL"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Sertifikat STTPL (PDF)</span>
									</a>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop Table View (Tampilan Layar Sedang & Besar) -->
		<div class="hidden sm:block overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
					<tr>
						<th class="p-3">Nama Diklat</th>
						<th class="p-3">Jenis / Jenjang</th>
						<th class="p-3">Penyelenggara / Tempat</th>
						<th class="p-3">Angkatan</th>
						<th class="p-3">No. Sertifikat / Tgl</th>
						{#if pegawaiId}
							<th class="p-3 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
					{#each riwayat as rd, idx}
						<tr class="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors {idx === 0 ? 'bg-amber-50/15 dark:bg-amber-950/10' : ''}">
							<td class="p-3 font-bold text-zinc-900 dark:text-zinc-100 max-w-xs break-words">
								{rd.nama_diklat}
							</td>
							<td class="p-3">
								<p class="font-semibold text-zinc-800 dark:text-zinc-200">{rd.jenis_diklat}</p>
								{#if rd.jenjang_diklat && rd.jenjang_diklat !== '-'}
									<span class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-[10px] font-medium text-amber-700 dark:text-amber-300">
										{rd.jenjang_diklat}
									</span>
								{/if}
							</td>
							<td class="p-3 text-zinc-700 dark:text-zinc-300">
								<p class="font-medium text-zinc-800 dark:text-zinc-200 break-words">{rd.penyelenggara}</p>
								{#if rd.tempat && rd.tempat !== '-'}
									<p class="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
										<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
										<span>{rd.tempat}</span>
									</p>
								{/if}
							</td>
							<td class="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
								{rd.angkatan && rd.angkatan !== '-' ? rd.angkatan : '-'}
							</td>
							<td class="p-3">
								<p class="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{rd.no_sertifikat}</p>
								<p class="text-[10px] text-zinc-400">Tgl: {rd.tgl_sertifikat}</p>
								{#if rd.dokumen_diklat}
									<a
										href={`${BACKEND_URL}${rd.dokumen_diklat}`}
										target="_blank"
										rel="noreferrer"
										class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
										title="Buka / Unduh Sertifikat STTPL"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Sertifikat STTPL</span>
									</a>
								{/if}
							</td>
							{#if pegawaiId}
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											type="button"
											onclick={() => openEditModal(rd)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
											title="Edit data riwayat diklat"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(rd)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
											title="Hapus riwayat diklat"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
										</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="text-center py-12 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Riwayat Diklat / Pelatihan</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki catatan riwayat pendidikan dan pelatihan formal/teknis.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Riwayat Diklat</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Diklat -->
<RiwayatDiklatModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Riwayat Diklat"
	message={`Apakah Anda yakin ingin menghapus riwayat diklat ${itemToDelete?.nama_diklat ? `"${itemToDelete.nama_diklat}"` : ''}? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Riwayat"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
