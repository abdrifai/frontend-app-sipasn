<script>
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatProfesiModal from './RiwayatProfesiModal.svelte';
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

	function openEditModal(rp) {
		selectedItem = rp;
		showModal = true;
	}

	function openDeleteModal(rp) {
		itemToDelete = rp;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-profesi/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat profesi berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat profesi');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-teal-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Riwayat Profesi & Sertifikasi Keahlian
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah riwayat profesi baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Riwayat Profesi</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Data List -->
	{#if riwayat?.length}
		<!-- Mobile Card View (Tampilan Khusus Layar Kecil / Smartphone) -->
		<div class="block sm:hidden space-y-3">
			{#each riwayat as rprof, idx}
				<div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-teal-200 dark:hover:border-teal-900/60 transition-all {idx === 0 ? 'ring-1 ring-teal-500/20 bg-teal-50/10 dark:bg-teal-950/10' : ''}">
					<!-- Top Row: Badges & Actions -->
					<div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-1.5 flex-wrap min-w-0">
							<span class="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-bold text-xs border border-teal-200/50 dark:border-teal-800/50">
								{rprof.profesi || 'Profesi'}
							</span>
							{#if rprof.berlaku && rprof.berlaku !== '-'}
								<span class="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200/50 dark:border-emerald-800/50">
									Berlaku: {rprof.berlaku}
								</span>
							{/if}
							{#if idx === 0}
								<span class="px-1.5 py-0.2 text-[9px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 rounded-md">Terbaru</span>
							{/if}
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rprof)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
									title="Edit data riwayat profesi"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rprof)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus riwayat profesi"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body: Keterangan Keahlian & Tanggal -->
					<div class="space-y-1 text-xs">
						{#if rprof.ket && rprof.ket !== '-'}
							<p class="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words">
								{rprof.ket}
							</p>
						{/if}
						<div class="pt-0.5 text-[11px] text-zinc-500 flex items-center gap-2">
							<span>Tgl Lulus / Terbit: <strong class="text-zinc-800 dark:text-zinc-200 font-semibold">{rprof.tgl_lulus || '-'}</strong></span>
						</div>
					</div>

					<!-- Bottom Grid: No. Sertifikat / STR & Document -->
					<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2 text-xs">
						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
							<p class="text-[10px] uppercase font-bold text-zinc-400">No. Sertifikat / STR / Lisensi</p>
							<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 text-[11px] break-words break-all">{rprof.no_sertifikat || '-'}</p>

							{#if rprof.dokumen_profesi}
								<div class="pt-1.5">
									<a
										href={`${BACKEND_URL}${rprof.dokumen_profesi}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors"
										title="Buka / Unduh Dokumen Sertifikat Profesi / STR"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Sertifikat / STR (PDF)</span>
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
						<th class="p-3">Organisasi / Jenis Profesi</th>
						<th class="p-3">No. Sertifikat / Tgl</th>
						<th class="p-3">Masa Berlaku</th>
						<th class="p-3">Keterangan / Keahlian</th>
						{#if pegawaiId}
							<th class="p-3 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
					{#each riwayat as rprof, idx}
						<tr class="hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors {idx === 0 ? 'bg-teal-50/15 dark:bg-teal-950/10' : ''}">
							<td class="p-3 font-bold text-zinc-900 dark:text-zinc-100">
								<span class="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-bold text-[11px] border border-teal-200/50 dark:border-teal-800/50">
									{rprof.profesi}
								</span>
							</td>
							<td class="p-3">
								<p class="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{rprof.no_sertifikat}</p>
								<p class="text-[10px] text-zinc-400">Tgl: {rprof.tgl_lulus}</p>
								{#if rprof.dokumen_profesi}
									<a
										href={`${BACKEND_URL}${rprof.dokumen_profesi}`}
										target="_blank"
										rel="noreferrer"
										class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-[10px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
										title="Buka / Unduh Dokumen Sertifikat Profesi / STR"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Sertifikat / STR</span>
									</a>
								{/if}
							</td>
							<td class="p-3">
								{#if rprof.berlaku && rprof.berlaku !== '-'}
									<span class="font-semibold text-teal-600 dark:text-teal-400">
										{rprof.berlaku}
									</span>
								{:else}
									<span class="text-zinc-400">-</span>
								{/if}
							</td>
							<td class="p-3 text-zinc-700 dark:text-zinc-300 font-medium max-w-xs break-words">
								{rprof.ket && rprof.ket !== '-' ? rprof.ket : '-'}
							</td>
							{#if pegawaiId}
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											type="button"
											onclick={() => openEditModal(rprof)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
											title="Edit data riwayat profesi"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(rprof)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
											title="Hapus riwayat profesi"
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
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Riwayat Profesi / Sertifikasi</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki catatan keahlian profesi, STR, sertifikat pendidik, atau lisensi keahlian.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Riwayat Profesi</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Profesi -->
<RiwayatProfesiModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Riwayat Profesi"
	message={`Apakah Anda yakin ingin menghapus riwayat profesi ${itemToDelete?.profesi ? `"${itemToDelete.profesi}"` : ''}? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Riwayat"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
