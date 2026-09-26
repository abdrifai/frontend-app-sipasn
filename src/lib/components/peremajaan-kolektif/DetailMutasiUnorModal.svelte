<script>
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';

	let {
		isOpen = false,
		mutasiId = '',
		onclose = () => {},
		onrestored = () => {}
	} = $props();

	let loading = $state(false);
	let mutasiDetail = $state(null);
	let error = $state('');

	// Restore state
	let showRestoreConfirm = $state(false);
	let restoring = $state(false);

	$effect(() => {
		if (isOpen && mutasiId) {
			loadDetail();
		} else {
			mutasiDetail = null;
			error = '';
		}
	});

	async function loadDetail() {
		loading = true;
		error = '';
		try {
			const res = await api(`/peremajaan-kolektif/mutasi-unor/${mutasiId}`);
			mutasiDetail = res.data;
		} catch (err) {
			error = err.message || 'Gagal memuat rincian mutasi unit organisasi';
		} finally {
			loading = false;
		}
	}

	async function executeRestore() {
		restoring = true;
		try {
			const res = await api(`/peremajaan-kolektif/mutasi-unor/${mutasiId}/restore`, {
				method: 'POST'
			});
			toast.success(res.message || 'Seluruh pegawai berhasil dikembalikan ke unit kerja asal');
			showRestoreConfirm = false;
			await loadDetail();
			onrestored();
		} catch (err) {
			toast.error(err.message || 'Gagal mengembalikan pegawai ke unit asal');
		} finally {
			restoring = false;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleString('id-ID', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-100">
			
			<!-- Modal Header -->
			<div class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
					</div>
					<div>
						<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
							Rincian Riwayat Pemindahan Unit Kerja
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Daftar pegawai dan snapshot unit organisasi sebelum dan sesudah dipindahkan.
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onclose}
					class="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
				{#if loading}
					<div class="py-12">
						<LoadingState message="Memuat rincian riwayat pemindahan unit organisasi..." />
					</div>
				{:else if error}
					<div class="p-6 text-center text-rose-600 dark:text-rose-400 text-xs">
						<p class="font-bold mb-1">Gagal memuat data</p>
						<p>{error}</p>
					</div>
				{:else if mutasiDetail}
					<!-- Summary Card -->
					<div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-700/80 pb-3">
							<div class="space-y-1">
								<span class="text-2xs font-bold text-zinc-400 uppercase tracking-widest">Waktu Pemindahan</span>
								<div class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
									{formatDate(mutasiDetail.tgl_mutasi)}
								</div>
								{#if mutasiDetail.user_created}
									<p class="text-2xs text-zinc-500 dark:text-zinc-400">
										Dipindahkan oleh: <strong class="text-zinc-700 dark:text-zinc-200">{mutasiDetail.user_created.nama || mutasiDetail.user_created.username}</strong>
									</p>
								{/if}
							</div>

							<div>
								{#if mutasiDetail.status === 'RESTORED'}
									<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-2xs uppercase tracking-wider border border-zinc-300 dark:border-zinc-700">
										<span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
										Sudah Dikembalikan (Restored)
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-2xs uppercase tracking-wider">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
										Diterapkan (Aktif)
									</span>
								{/if}
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1">
								<div class="flex items-center gap-1.5">
									<span class="text-2xs font-bold text-zinc-400 uppercase tracking-widest">Unit Organisasi Asal (Lama)</span>
									{#if mutasiDetail.is_asal_unor_aktif === false}
										<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
											Non-Aktif
										</span>
									{:else if mutasiDetail.is_asal_unor_aktif === true}
										<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
											Aktif
										</span>
									{/if}
								</div>
								<div class="font-semibold text-zinc-800 dark:text-zinc-200">
									{mutasiDetail.nama_asal_unor}
								</div>
							</div>

							<div class="space-y-1">
								<span class="text-2xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Unit Organisasi Tujuan (Baru)</span>
								<div class="font-semibold text-emerald-700 dark:text-emerald-300">
									{mutasiDetail.nama_tujuan_unor}
								</div>
							</div>
						</div>

						{#if mutasiDetail.keterangan}
							<div class="space-y-1 pt-1 border-t border-zinc-200/80 dark:border-zinc-700/80">
								<span class="text-2xs font-bold text-zinc-400 uppercase tracking-widest">Catatan / Alasan</span>
								<div class="text-zinc-600 dark:text-zinc-300">
									{mutasiDetail.keterangan}
								</div>
							</div>
						{/if}

						{#if mutasiDetail.status === 'RESTORED' && mutasiDetail.restored_at}
							<div class="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-2xs text-amber-800 dark:text-amber-300">
								Riwayat ini telah dikembalikan (di-restore) ke unit asal pada: <strong>{formatDate(mutasiDetail.restored_at)}</strong>
								{#if mutasiDetail.user_restored}
									<span> oleh <strong>{mutasiDetail.user_restored.nama || mutasiDetail.user_restored.username}</strong></span>
								{/if}.
							</div>
						{/if}
					</div>

					<!-- Table Pegawai List -->
					<div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
						<div class="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
							<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
								Daftar Pegawai yang Dipindahkan ({mutasiDetail.pegawai_list?.length || 0} Orang)
							</h3>
						</div>

						<div class="max-h-64 overflow-y-auto divide-y divide-zinc-200/80 dark:divide-zinc-800">
							<table class="w-full text-left text-xs">
								<thead class="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
									<tr>
										<th class="w-12 px-4 py-2.5 text-center">No</th>
										<th class="px-4 py-2.5">Nama & NIP Pegawai</th>
										<th class="px-4 py-2.5">Jabatan (Asal &rarr; Baru)</th>
										<th class="px-4 py-2.5">Unit Organisasi Asal</th>
										<th class="px-4 py-2.5">Unit Organisasi Tujuan</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-200/80 dark:divide-zinc-800">
									{#each mutasiDetail.pegawai_list || [] as item, i}
										<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
											<td class="px-4 py-2.5 text-center font-bold text-zinc-400">
												{i + 1}
											</td>
											<td class="px-4 py-2.5">
												<div class="font-bold text-zinc-900 dark:text-zinc-100">
													{item.nama || '-'}
												</div>
												<div class="text-[11px] font-mono text-zinc-400">
													{item.nip}
												</div>
											</td>
											<td class="px-4 py-2.5">
												<div class="font-semibold text-zinc-800 dark:text-zinc-200">
													{item.new_jabatan?.nama_jabatan || item.old_jabatan?.nama_jabatan || '-'}
												</div>
												{#if item.old_jabatan && item.new_jabatan && item.old_jabatan.id !== item.new_jabatan.id}
													<div class="text-2xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
														<span class="text-zinc-400 line-through truncate max-w-[130px]">{item.old_jabatan.nama_jabatan}</span>
														<span>&rarr;</span>
														<span class="font-bold">{item.new_jabatan.nama_jabatan}</span>
													</div>
												{:else}
													<span class="text-2xs text-zinc-400">
														{item.old_jabatan?.kategori || item.new_jabatan?.kategori || 'Jabatan Tetap'}
													</span>
												{/if}
											</td>
											<td class="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
												{mutasiDetail.nama_asal_unor}
											</td>
											<td class="px-4 py-2.5 text-emerald-700 dark:text-emerald-300 font-semibold">
												{mutasiDetail.nama_tujuan_unor}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 shrink-0">
				<div>
					{#if mutasiDetail && mutasiDetail.status === 'APPLIED'}
						{#if mutasiDetail.is_asal_unor_aktif === false}
							<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-medium" title="Unit kerja asal berstatus non-aktif">
								<svg class="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
								<span>Unit Asal Non-Aktif (Restore Dinonaktifkan)</span>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => (showRestoreConfirm = true)}
								class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
								<span>Kembalikan ke Unit Asal (Restore)</span>
							</button>
						{/if}
					{/if}
				</div>

				<Button variant="ghost" onclick={onclose}>
					Tutup
				</Button>
			</div>

		</div>
	</div>
{/if}

<!-- Dialog Konfirmasi Restore -->
<ConfirmDeleteModal
	bind:show={showRestoreConfirm}
	verifyText=""
	title="Restore Pemindahan Pegawai?"
	message={`Apakah Anda yakin ingin mengembalikan seluruh ${mutasiDetail?.pegawai_list?.length || 0} pegawai dalam riwayat ini ke Unit Organisasi semula (${mutasiDetail?.nama_asal_unor})?`}
	loading={restoring}
	onConfirm={executeRestore}
/>
