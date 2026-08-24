<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatGolonganModal from './RiwayatGolonganModal.svelte';
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

	function openEditModal(rg) {
		selectedItem = rg;
		showModal = true;
	}

	function openDeleteModal(rg) {
		itemToDelete = rg;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-golongan/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat golongan berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat golongan');
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
				Riwayat Golongan & Pangkat
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
				title="Tambah riwayat golongan baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Riwayat Golongan</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Data List -->
	{#if riwayat?.length}
		<!-- Mobile Card View (Tampilan Khusus Layar Kecil / Smartphone) -->
		<div class="block sm:hidden space-y-3">
			{#each riwayat as rg, idx}
				<div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all {idx === 0 ? 'ring-1 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/10' : ''}">
					<!-- Top Row: Badges & Actions -->
					<div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-1.5 flex-wrap min-w-0">
							<Badge variant="indigo">{rg.golongan}</Badge>
							<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{rg.pangkat}</span>
							{#if idx === 0}
								<span class="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md">Aktif</span>
							{/if}
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rg)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
									title="Edit data riwayat golongan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rg)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus riwayat golongan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body: Jenis KP & Masa Kerja -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60">
							<p class="text-[10px] uppercase font-bold text-zinc-400">Jenis KP</p>
							<p class="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] truncate">{rg.jenis_kp || '-'}</p>
						</div>
						<div class="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60">
							<p class="text-[10px] uppercase font-bold text-zinc-400">Masa Kerja</p>
							<p class="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] truncate">{rg.masa_kerja || '-'}</p>
						</div>
					</div>

					<!-- Bottom Grid: TMT, Gaji Pokok & SK -->
					<div class="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-zinc-400">TMT Golongan:</span>
							<span class="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{rg.tmt_sk || '-'}</span>
						</div>
						{#if rg.gapok && rg.gapok !== '-'}
							<div class="flex items-center justify-between text-[11px]">
								<span class="text-zinc-400">Gaji Pokok:</span>
								<span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{rg.gapok}</span>
							</div>
						{/if}

						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1 mt-1">
							<p class="text-[10px] uppercase font-bold text-zinc-400">Nomor & Tanggal SK</p>
							<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 text-[11px] break-words break-all">{rg.sk || '-'}</p>
							<p class="text-[10px] text-zinc-400 font-mono">Tgl: {rg.tgl_sk || '-'}</p>

							{#if rg.dokumen_sk}
								<div class="pt-1.5">
									<a
										href={`${BACKEND_URL}${rg.dokumen_sk}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
										title="Buka / Unduh Dokumen SK"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Dokumen SK (PDF)</span>
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
						<th class="p-3">Golongan / Pangkat</th>
						<th class="p-3">Jenis KP</th>
						<th class="p-3">Masa Kerja</th>
						<th class="p-3">No. SK / Tanggal</th>
						<th class="p-3">TMT Golongan</th>
						<th class="p-3">Gaji Pokok</th>
						{#if pegawaiId}
							<th class="p-3 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
					{#each riwayat as rg, idx}
						<tr class="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors {idx === 0 ? 'bg-indigo-50/15 dark:bg-indigo-950/10' : ''}">
							<td class="p-3">
								<div class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
									<Badge variant="indigo">{rg.golongan}</Badge>
									<span>{rg.pangkat}</span>
									{#if idx === 0}
										<span class="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md">Aktif</span>
									{/if}
								</div>
							</td>
							<td class="p-3 text-zinc-600 dark:text-zinc-300">{rg.jenis_kp}</td>
							<td class="p-3 font-medium text-zinc-700 dark:text-zinc-300">{rg.masa_kerja}</td>
							<td class="p-3">
								<p class="font-mono text-[11px] text-zinc-800 dark:text-zinc-200 font-medium break-words break-all">{rg.sk}</p>
								<p class="text-[10px] text-zinc-400">Tgl: {rg.tgl_sk}</p>
								{#if rg.dokumen_sk}
									<a
										href={`${BACKEND_URL}${rg.dokumen_sk}`}
										target="_blank"
										rel="noreferrer"
										class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
										title="Buka / Unduh Dokumen SK"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Dokumen SK</span>
									</a>
								{/if}
							</td>
							<td class="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{rg.tmt_sk}</td>
							<td class="p-3 font-mono text-zinc-800 dark:text-zinc-200">{rg.gapok}</td>
							{#if pegawaiId}
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											type="button"
											onclick={() => openEditModal(rg)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
											title="Edit data riwayat golongan"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(rg)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
											title="Hapus riwayat golongan"
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
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="m15.4 12.5 2.1 7.5-5.5-3-5.5 3 2.1-7.5"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Riwayat Golongan</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki catatan riwayat kenaikan pangkat atau golongan.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Riwayat Golongan</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Tambah / Edit Riwayat Golongan -->
<RiwayatGolonganModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Riwayat Golongan"
	message={`Apakah Anda yakin ingin menghapus data riwayat golongan ${itemToDelete?.golongan || ''} (${itemToDelete?.sk || ''})?`}
	confirmLabel="Hapus Riwayat"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
