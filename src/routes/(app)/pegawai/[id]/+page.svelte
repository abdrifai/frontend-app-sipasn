<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { sidebarStore } from '$lib/stores/sidebarStore.js';
	import PegawaiSearchModal from '$lib/components/pegawai/PegawaiSearchModal.svelte';
	import ProfilePegawaiHeader from '$lib/components/pegawai/ProfilePegawaiHeader.svelte';
	import ProfilePegawaiTabs from '$lib/components/pegawai/ProfilePegawaiTabs.svelte';

	let { data } = $props();
	const p = $derived(data.pegawai);

	let showSearchModal = $state(false);

	onMount(() => {
		sidebarStore.collapse();
	});

	function handleOpenSearch() {
		showSearchModal = true;
	}

	function handleSelectPegawai(newP) {
		showSearchModal = false;
		if (newP?.id) {
			goto(`/pegawai/${newP.id}`, { invalidateAll: true });
		}
	}

	function handleGlobalKeyDown(e) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			showSearchModal = true;
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<div class="space-y-5 animate-in fade-in duration-300">
	<!-- Top Bar Action -->
	<div class="flex items-center justify-end">
		<!-- Tombol Cari Pegawai Lain -->
		<button
			type="button"
			onclick={handleOpenSearch}
			class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 shadow-xs transition-all cursor-pointer group"
			title="Cari pegawai lain (Ctrl+K)"
		>
			<div
				class="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
			</div>
			<span>Cari Pegawai Lain</span>
			<kbd class="hidden sm:inline-flex text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">⌘K</kbd>
		</button>
	</div>

	<!-- Header Profile Card Component -->
	<ProfilePegawaiHeader 
		pegawai={p} 
		onPhotoUpdated={() => invalidateAll()}
	/>

	<!-- Centralized Tabs & Riwayat Component -->
	<ProfilePegawaiTabs 
		pegawai={p} 
		onReload={() => invalidateAll()}
	/>
</div>

<!-- Modal Dialog Pencarian Pegawai -->
<PegawaiSearchModal
	open={showSearchModal}
	onSelect={handleSelectPegawai}
	onClose={() => {
		showSearchModal = false;
	}}
/>
