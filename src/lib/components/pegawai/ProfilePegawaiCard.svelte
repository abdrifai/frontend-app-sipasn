<script>
	import { api } from '$lib/utils/api.js';
	import ProfilePegawaiHeader from './ProfilePegawaiHeader.svelte';
	import ProfilePegawaiTabs from './ProfilePegawaiTabs.svelte';

	let {
		pegawaiId = null,
		initialData = null,
		onClose = null
	} = $props();

	let fullData = $state(null);
	let loading = $state(false);
	let error = $state(null);

	// Ambil data detail lengkap saat pegawaiId berubah
	$effect(() => {
		if (pegawaiId) {
			loadDetail(pegawaiId);
		} else {
			fullData = null;
			error = null;
		}
	});

	async function loadDetail(id) {
		loading = true;
		error = null;
		try {
			const res = await api(`/pegawai/${id}`);
			fullData = res.data;
		} catch (err) {
			error = err.message || 'Gagal memuat detail data pegawai';
		} finally {
			loading = false;
		}
	}
</script>

{#if !pegawaiId && !initialData}
	<div class="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
		<p class="text-xs text-zinc-400">Pilih pegawai untuk melihat profil lengkap.</p>
	</div>
{:else}
	<div 
		id="detail-pegawai-section"
		class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-3"
	>
		<!-- Header Profile Component -->
		<ProfilePegawaiHeader 
			pegawai={fullData || initialData} 
			{pegawaiId} 
			{onClose} 
			showFullProfileLink={true}
			variant="embedded"
			onPhotoUpdated={() => loadDetail(pegawaiId)}
		/>

		<!-- Centralized Tabs & Riwayat Component -->
		<ProfilePegawaiTabs 
			pegawai={fullData || initialData} 
			{loading}
			{error}
			onRetry={() => loadDetail(pegawaiId)}
			variant="embedded"
		/>
	</div>
{/if}
