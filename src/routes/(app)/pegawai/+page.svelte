<script>
	import { goto } from '$app/navigation';
	import PegawaiSearchModal from '$lib/components/pegawai/PegawaiSearchModal.svelte';

	let showSearchModal = $state(false);

	function handleOpenSearch() {
		showSearchModal = true;
	}

	function handleSelectPegawai(p) {
		showSearchModal = false;
		if (p?.id) {
			goto(`/pegawai/${p.id}`, { invalidateAll: true });
		}
	}

	function handleGlobalKeyDown(e) {
		// Shortcut Ctrl+K atau Cmd+K untuk membuka modal pencarian
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			showSearchModal = true;
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<div class="space-y-6 animate-in fade-in duration-300">
	<!-- Page Header -->
	<div>
		<div class="flex items-center gap-2.5">
			<span class="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
				<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</span>
			<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Data Pegawai Negeri Sipil</h1>
		</div>
		<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
			Pencarian dan manajemen profil ASN Pemerintah Kabupaten Tojo Una-Una
		</p>
	</div>

	<!-- Petunjuk Awal Pencarian Pegawai -->
	<div
		onclick={handleOpenSearch}
		class="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-10 sm:p-20 text-center shadow-xs flex flex-col items-center justify-center gap-4 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-300 cursor-pointer group"
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && handleOpenSearch()}
	>
		<div
			class="w-18 h-18 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300 shadow-inner"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="32"
				height="32"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
		</div>

		<div class="max-w-md space-y-2">
			<h2
				class="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
			>
				Cari Data Pegawai
			</h2>
			<p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
				Klik di sini atau tekan <kbd
					class="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-bold border border-zinc-200 dark:border-zinc-700 shadow-2xs"
					>Ctrl+K</kbd
				> untuk mencari dan membuka profil data ASN berdasarkan NIP atau Nama.
			</p>
		</div>
	</div>
</div>

<!-- Modal Dialog Pencarian Pegawai -->
<PegawaiSearchModal
	open={showSearchModal}
	onSelect={handleSelectPegawai}
	onClose={() => {
		showSearchModal = false;
	}}
/>
