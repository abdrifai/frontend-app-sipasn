<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatPendidikanModal from './RiwayatPendidikanModal.svelte';
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
			await api(`/pegawai/${pegawaiId}/riwayat-pendidikan/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toastStore.success('Riwayat pendidikan berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toastStore.error(err.message || 'Gagal menghapus riwayat pendidikan');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="w-2 h-2 rounded-full bg-purple-500 shrink-0"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Riwayat Pendidikan Formal
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
					{riwayat.length} Data
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				title="Tambah riwayat pendidikan baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Riwayat Pendidikan</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Data List -->
	{#if riwayat?.length}
		<!-- Mobile Card View (Tampilan Khusus Layar Kecil / Smartphone) -->
		<div class="block sm:hidden space-y-3">
			{#each riwayat as rp, idx}
				<div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-purple-200 dark:hover:border-purple-900/60 transition-all {idx === 0 ? 'ring-1 ring-purple-500/20 bg-purple-50/10 dark:bg-purple-950/10' : ''}">
					<!-- Top Row: Badges & Actions -->
					<div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
						<div class="flex items-center gap-1.5 flex-wrap min-w-0">
							<span class="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-xs border border-purple-200/50 dark:border-purple-800/50">
								{rp.tingkat}
							</span>
							{#if (rp.gd && rp.gd !== '-') || (rp.gb && rp.gb !== '-') || (rp.gelar_depan && rp.gelar_depan !== '-') || (rp.gelar_belakang && rp.gelar_belakang !== '-')}
								<span class="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700">
									{[rp.gd || rp.gelar_depan, rp.gb || rp.gelar_belakang].filter(g => g && g !== '-').join(' / ')}
								</span>
							{/if}
							{#if idx === 0}
								<span class="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-md">Terakhir</span>
							{/if}
						</div>

						{#if pegawaiId}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={() => openEditModal(rp)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
									title="Edit data riwayat pendidikan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
								</button>
								<button
									type="button"
									onclick={() => openDeleteModal(rp)}
									class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
									title="Hapus riwayat pendidikan"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
								</button>
							</div>
						{/if}
					</div>

					<!-- Body: Nama Sekolah & Jurusan -->
					<div class="space-y-1 text-xs">
						<p class="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words">
							{rp.sekolah || '-'}
						</p>
						<p class="text-xs font-medium text-zinc-700 dark:text-zinc-300 break-words">
							{rp.jurusan || '-'}
						</p>
						<div class="pt-1 text-[11px] text-zinc-500 flex items-center gap-2">
							<span>Tahun Lulus: <strong class="text-zinc-800 dark:text-zinc-200 font-semibold">{rp.tahun_lulus || '-'}</strong></span>
						</div>
					</div>

					<!-- Bottom Grid: Ijazah & Documents -->
					<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2 text-xs">
						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1">
							<p class="text-[10px] uppercase font-bold text-zinc-400">Nomor & Tanggal Ijazah</p>
							<p class="font-mono font-medium text-zinc-800 dark:text-zinc-200 text-[11px] break-words break-all">{rp.no_ijazah || '-'}</p>
							<p class="text-[10px] text-zinc-400 font-mono">Tgl: {rp.tgl_ijazah || '-'}</p>
						</div>

						{#if rp.dokumen_ijazah || rp.dokumen_transkrip}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
								{#if rp.dokumen_ijazah}
									<a
										href={`${BACKEND_URL}${rp.dokumen_ijazah}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors w-full"
										title="Buka / Unduh Dokumen Ijazah"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
										<span>Dokumen Ijazah</span>
									</a>
								{/if}
								{#if rp.dokumen_transkrip}
									<a
										href={`${BACKEND_URL}${rp.dokumen_transkrip}`}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors w-full"
										title="Buka / Unduh Dokumen Transkrip Nilai"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
										<span>Transkrip Nilai</span>
									</a>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop Table View (Tampilan Layar Sedang & Besar) -->
		<div class="hidden sm:block overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
					<tr>
						<th class="p-3">Tingkat</th>
						<th class="p-3">Nama Lembaga / Sekolah</th>
						<th class="p-3">Jurusan / Prodi</th>
						<th class="p-3">Tahun Lulus</th>
						<th class="p-3">No. Ijazah / Tgl</th>
						<th class="p-3">Gelar</th>
						{#if pegawaiId}
							<th class="p-3 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
					{#each riwayat as rp, idx}
						<tr class="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors {idx === 0 ? 'bg-purple-50/15 dark:bg-purple-950/10' : ''}">
							<td class="p-3">
								<span class="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[11px] border border-purple-200/50 dark:border-purple-800/50">
									{rp.tingkat}
								</span>
							</td>
							<td class="p-3 font-bold text-zinc-900 dark:text-zinc-100 break-words">
								{rp.sekolah}
							</td>
							<td class="p-3 text-zinc-700 dark:text-zinc-300 font-medium break-words">
								{rp.jurusan}
							</td>
							<td class="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
								{rp.tahun_lulus}
							</td>
							<td class="p-3">
								<p class="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200 break-words break-all">{rp.no_ijazah}</p>
								<p class="text-[10px] text-zinc-400">Tgl: {rp.tgl_ijazah}</p>
								<div class="mt-1 flex flex-wrap items-center gap-1">
									{#if rp.dokumen_ijazah}
										<a
											href={`${BACKEND_URL}${rp.dokumen_ijazah}`}
											target="_blank"
											rel="noreferrer"
											class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
											title="Buka / Unduh Dokumen Ijazah"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
											<span>Ijazah</span>
										</a>
									{/if}
									{#if rp.dokumen_transkrip}
										<a
											href={`${BACKEND_URL}${rp.dokumen_transkrip}`}
											target="_blank"
											rel="noreferrer"
											class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
											title="Buka / Unduh Dokumen Transkrip Nilai"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
											<span>Transkrip</span>
										</a>
									{/if}
								</div>
							</td>
							<td class="p-3 text-zinc-600 dark:text-zinc-300">
								{#if (rp.gd && rp.gd !== '-') || (rp.gb && rp.gb !== '-') || (rp.gelar_depan && rp.gelar_depan !== '-') || (rp.gelar_belakang && rp.gelar_belakang !== '-')}
									<span class="font-medium text-zinc-800 dark:text-zinc-200">
										{[rp.gd || rp.gelar_depan, rp.gb || rp.gelar_belakang].filter(g => g && g !== '-').join(' / ')}
									</span>
								{:else}
									<span class="text-zinc-400">-</span>
								{/if}
							</td>
							{#if pegawaiId}
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											type="button"
											onclick={() => openEditModal(rp)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
											title="Edit data riwayat pendidikan"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(rp)}
											class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
											title="Hapus riwayat pendidikan"
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
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
			</div>
			<p class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Belum Ada Riwayat Pendidikan</p>
			<p class="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">Pegawai ini belum memiliki catatan riwayat pendidikan formal yang terdata.</p>
			{#if pegawaiId}
				<button
					type="button"
					onclick={openCreateModal}
					class="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span>Tambah Riwayat Pendidikan</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Pendidikan -->
<RiwayatPendidikanModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	onClose={() => { showModal = false; selectedItem = null; }}
	onSuccess={onSuccess}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Riwayat Pendidikan"
	message={`Apakah Anda yakin ingin menghapus riwayat pendidikan ${itemToDelete?.tingkat ? `"${itemToDelete.tingkat} - ${itemToDelete.sekolah}"` : ''}? Tindakan ini tidak dapat dibatalkan.`}
	confirmLabel="Hapus Riwayat"
	variant="danger"
	loading={deleting}
	onClose={() => { showDeleteModal = false; itemToDelete = null; }}
	onConfirm={handleDelete}
/>
