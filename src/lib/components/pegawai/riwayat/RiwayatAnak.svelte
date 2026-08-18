<script>
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RiwayatAnakModal from './RiwayatAnakModal.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toastStore } from '$lib/stores/toastStore.js';

	const toast = toastStore;

	let { 
		riwayat = [],
		pegawaiId = null,
		riwayatPasangan = [],
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

	function openEditModal(ranak) {
		selectedItem = ranak;
		showModal = true;
	}

	function openDeleteModal(ranak) {
		itemToDelete = ranak;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!itemToDelete?.id || !pegawaiId) return;

		deleting = true;
		try {
			await api(`/pegawai/${pegawaiId}/riwayat-anak/${itemToDelete.id}`, {
				method: 'DELETE'
			});
			toast.success('Data anak berhasil dihapus');
			showDeleteModal = false;
			itemToDelete = null;
			onSuccess();
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data anak');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Tab Header with Action Button -->
	<div class="flex items-center justify-between gap-3 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-indigo-500"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Data Riwayat Anak Pegawai
			</h4>
			{#if riwayat?.length}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
					{riwayat.length} Anak
				</span>
			{/if}
		</div>

		{#if pegawaiId}
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
				title="Tambah data anak baru"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				<span>Tambah Data Anak</span>
			</button>
		{/if}
	</div>

	<!-- Riwayat Grid Cards -->
	{#if riwayat?.length}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
			{#each riwayat as ranak}
				<div class="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all flex flex-col justify-between">
					
					<div class="space-y-2.5">
						<!-- Header Card: Status Anak, JKL Badge, PNS + Actions -->
						<div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
							<div class="flex flex-wrap items-center gap-1.5">
								<Badge variant={ranak.status_anak === 'Kandung' || ranak.sAnak === 'Kandung' ? 'indigo' : 'amber'}>
									Anak {ranak.status_anak || ranak.sAnak || 'Kandung'}
								</Badge>
								<Badge variant={String(ranak.jkl_id) === '1' || ranak.jenis_kelamin === 'Laki-Laki' ? 'blue' : 'pink'}>
									{ranak.jenis_kelamin || (String(ranak.jkl_id) === '1' ? 'Laki-Laki' : 'Perempuan')}
								</Badge>
								{#if ranak.is_pns || ranak.pns === 'PNS'}
									<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
										PNS
									</span>
								{/if}
							</div>

							{#if pegawaiId}
								<div class="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onclick={() => openEditModal(ranak)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
										title="Edit data anak"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
									</button>
									<button
										type="button"
										onclick={() => openDeleteModal(ranak)}
										class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
										title="Hapus data anak"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
									</button>
								</div>
							{/if}
						</div>

						<!-- Body Card: Nama & NIK -->
						<div>
							<h5 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ranak.nama}</h5>
							{#if ranak.nik && ranak.nik !== '-'}
								<p class="text-xs text-zinc-500 font-mono mt-0.5">
									NIK: <span class="text-zinc-700 dark:text-zinc-300 font-medium">{ranak.nik}</span>
								</p>
							{/if}
						</div>

						<!-- Body Card: TTL & Nama Orang Tua -->
						<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1.5 text-xs">
							<div>
								<span class="text-[10px] uppercase font-bold text-zinc-400">Tempat, Tanggal Lahir</span>
								<p class="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{ranak.ttl || '-'}</p>
							</div>

							{#if ranak.nama_ortu && ranak.nama_ortu !== '-'}
								<div class="pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
									<span class="text-[10px] uppercase font-bold text-zinc-400">Nama Ibu / Ayah (Pasangan)</span>
									<p class="font-medium text-indigo-700 dark:text-indigo-300 mt-0.5">{ranak.nama_ortu}</p>
								</div>
							{/if}
						</div>

						<!-- Body Card: Kontak & Alamat -->
						{#if (ranak.no_hp && ranak.no_hp !== '-') || (ranak.alamat && ranak.alamat !== '-')}
							<div class="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 pt-0.5">
								{#if ranak.no_hp && ranak.no_hp !== '-'}
									<p class="flex items-center gap-1.5">
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
										<span>Kontak: <span class="text-zinc-800 dark:text-zinc-200 font-medium">{ranak.no_hp}</span></span>
									</p>
								{/if}

								{#if ranak.alamat && ranak.alamat !== '-'}
									<p class="flex items-start gap-1.5 text-[11px]">
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
										<span class="leading-relaxed line-clamp-2">{ranak.alamat}</span>
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Dokumen Akta Kelahiran Link Button if exists -->
					{#if ranak.dokumen_sk || ranak.dokumen_anak}
						<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
							<span class="text-[10px] uppercase font-bold text-zinc-400">Akta Kelahiran</span>
							<a
								href={`${API_BASE}${ranak.dokumen_sk || ranak.dokumen_anak}`}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v6"/><path d="m13 16-3 3-3-3"/></svg>
								<span>Lihat Akta (PDF)</span>
							</a>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 mx-auto mb-2.5">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.5 1.2.8 2 .8s1.5-.3 2-.8"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>
			</div>
			<h5 class="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Data Anak</h5>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
				Belum ada riwayat data anak (kandung, tiri, atau angkat) yang tercatat untuk pegawai ini.
			</p>
			{#if pegawaiId}
				<div class="mt-4">
					<Button
						variant="primary"
						onclick={openCreateModal}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
						<span>Tambah Data Anak Sekarang</span>
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Form Tambah / Edit Anak -->
<RiwayatAnakModal
	open={showModal}
	{pegawaiId}
	item={selectedItem}
	{riwayatPasangan}
	onClose={() => showModal = false}
	{onSuccess}
/>

<!-- Modal Konfirmasi Hapus Data Anak -->
<ConfirmModal
	open={showDeleteModal}
	title="Hapus Data Anak"
	message={`Apakah Anda yakin ingin menghapus data anak "${itemToDelete?.nama || ''}"? Seluruh berkas digital akta kelahiran terkait juga akan dihapus dari server.`}
	confirmLabel="Hapus Data"
	confirmVariant="danger"
	loading={deleting}
	onClose={() => { if (!deleting) showDeleteModal = false; }}
	onConfirm={handleDelete}
/>
