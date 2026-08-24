<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatJabatanModal from './RiwayatJabatanModal.svelte';
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

	function openEditModal(rj) {
		selectedItem = rj;
		showModal = true;
	}

	function openDeleteModal(rj) {
		itemToDelete = rj;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;
		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-jabatan/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat jabatan berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat jabatan');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Riwayat Jabatan & Penugasan
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah riwayat jabatan baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Riwayat Jabatan</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Data List -->
	{#if riwayat?.length}
		<!-- Mobile Card View (Tampilan Layar Kecil / Smartphone) -->
		<div class="block sm:hidden space-y-3">
			{#each riwayat as rj, idx}
				<div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-blue-200 dark:hover:border-blue-900/60 transition-all {idx === 0 ? 'ring-1 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/10' : ''}">
					<!-- Top Row: Badges & Actions -->
					<div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-1.5 flex-wrap">
							{#if idx === 0}
								<span class="px-2 py-0.5 text-[10px] font-extrabold bg-blue-600 text-white rounded-md uppercase tracking-wider">Aktif</span>
							{/if}
							<Badge variant="blue">{rj.jenis_jabatan}</Badge>
							{#if rj.eselon && rj.eselon !== '-'}
								<span class="text-[10px] text-zinc-400 font-mono">Eselon {rj.eselon}</span>
							{/if}
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rj)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
									title="Edit data riwayat jabatan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rj)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus riwayat jabatan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body: Jabatan & Unit Kerja -->
					<div class="space-y-1">
						<h5 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
							{rj.nama_jabatan}
						</h5>
						<p class="text-xs text-zinc-600 dark:text-zinc-400 font-medium break-words">
							{rj.unit_kerja}
						</p>
					</div>

					<!-- Bottom Grid: TMT & SK -->
					<div class="grid grid-cols-1 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-zinc-400">TMT Jabatan:</span>
							<span class="font-semibold text-blue-600 dark:text-blue-400 font-mono">{rj.tmt_sk}</span>
						</div>
						{#if rj.tmt_pelantikan && rj.tmt_pelantikan !== '-'}
							<div class="flex items-center justify-between text-[11px]">
								<span class="text-zinc-400">TMT Pelantikan:</span>
								<span class="font-medium text-zinc-600 dark:text-zinc-300 font-mono">{rj.tmt_pelantikan}</span>
							</div>
						{/if}

						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1 mt-1">
							<p class="text-[10px] uppercase font-bold text-zinc-400">Nomor & Tanggal SK</p>
							<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 text-[11px] break-words break-all">{rj.sk}</p>
							<p class="text-[10px] text-zinc-400 font-mono">Tgl: {rj.tgl_sk}</p>

							{#if rj.dokumen_sk}
								<div class="pt-1.5">
									<a
										href={`${BACKEND_URL}${rj.dokumen_sk}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
										title="Buka / Unduh Dokumen SK Jabatan"
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
						<th class="p-3">Nama Jabatan</th>
						<th class="p-3">Unit Organisasi / Kerja</th>
						<th class="p-3">Jenis / Eselon</th>
						<th class="p-3">No. SK / Tanggal SK</th>
						<th class="p-3">TMT Jabatan</th>
						{#if pegawaiId}
							<th class="p-3 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
					{#each riwayat as rj, idx}
						<tr class="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors {idx === 0 ? 'bg-blue-50/15 dark:bg-blue-950/10' : ''}">
							<td class="p-3">
								<div class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
									<span>{rj.nama_jabatan}</span>
									{#if idx === 0}
										<span class="px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-md">Aktif</span>
									{/if}
								</div>
							</td>
							<td class="p-3 font-medium text-zinc-700 dark:text-zinc-300">{rj.unit_kerja}</td>
							<td class="p-3">
								<div class="flex flex-col gap-0.5 items-start">
									<Badge variant="blue">{rj.jenis_jabatan}</Badge>
									{#if rj.eselon && rj.eselon !== '-'}
										<span class="text-[10px] text-zinc-400 font-mono">Eselon {rj.eselon}</span>
									{/if}
								</div>
							</td>
							<td class="p-3">
								<p class="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{rj.sk}</p>
								<p class="text-[10px] text-zinc-400">Tgl: {rj.tgl_sk}</p>
								{#if rj.dokumen_sk}
									<a
										href={`${BACKEND_URL}${rj.dokumen_sk}`}
										target="_blank"
										rel="noreferrer"
										class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
										title="Buka / Unduh Dokumen SK Jabatan"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Dokumen SK</span>
									</a>
								{/if}
							</td>
							<td class="p-3 font-semibold text-blue-600 dark:text-blue-400">
								<p>{rj.tmt_sk}</p>
								{#if rj.tmt_pelantikan && rj.tmt_pelantikan !== '-'}
									<p class="text-[10px] text-zinc-400 font-normal">Lantik: {rj.tmt_pelantikan}</p>
								{/if}
							</td>
							{#if pegawaiId}
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											type="button"
											onclick={() => openEditModal(rj)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
											title="Edit data riwayat jabatan"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(rj)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
											title="Hapus riwayat jabatan"
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
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Riwayat Jabatan</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki catatan riwayat pengangkatan atau mutasi jabatan.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Riwayat Jabatan</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Jabatan -->
<RiwayatJabatanModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Riwayat Jabatan"
	message={`Apakah Anda yakin ingin menghapus riwayat jabatan ${itemToDelete?.nama_jabatan ? `"${itemToDelete.nama_jabatan}"` : ''}? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Riwayat"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
