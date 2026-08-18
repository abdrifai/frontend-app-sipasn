<script>
	import RiwayatIdentitasModal from './RiwayatIdentitasModal.svelte';

	let {
		orang = {},
		fullData = {},
		pegawaiId = null,
		copiedField = null,
		copyToClipboard = () => {},
		onSuccess = () => {}
	} = $props();

	let showModal = $state(false);
	let modalItem = $state(null);

	function openEditModal() {
		modalItem = fullData;
		showModal = true;
	}

	function handleSuccess(newPegawai) {
		onSuccess?.(newPegawai);
	}
</script>

<div class="space-y-4">
	<!-- Top Bar Header & Action Buttons -->
	<div class="flex items-center justify-between flex-wrap gap-2.5 pb-1">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-indigo-500"></div>
			<h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
				Data Pokok Identitas Pegawai
			</h4>
			{#if fullData?.kedudukan_pns && fullData.kedudukan_pns !== '-'}
				<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
					{fullData.kedudukan_pns}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={openEditModal}
				class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
				title="Edit data identitas pegawai saat ini"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
				<span>Edit Identitas</span>
			</button>
		</div>
	</div>

	<!-- Cards Grid Info -->
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
		<!-- NIK -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">NIK</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{orang?.nik || '-'}</p>
				{#if orang?.nik && orang.nik !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(orang.nik, 'nik')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin NIK"
						aria-label="Salin NIK"
					>
						{#if copiedField === 'nik'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- No. KK -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. Kartu Keluarga (KK)</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{orang?.kk || '-'}</p>
				{#if orang?.kk && orang.kk !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(orang.kk, 'kk')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin No. KK"
						aria-label="Salin No. KK"
					>
						{#if copiedField === 'kk'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Tempat, Tanggal Lahir -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 sm:col-span-2">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tempat, Tanggal Lahir</p>
			<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
				{orang?.t4Lhr || '-'}{orang?.tglLhr_formatted ? `, ${orang.tglLhr_formatted}` : ''}
			</p>
		</div>

		<!-- Jenis Kelamin -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Jenis Kelamin</p>
			<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{orang?.jkl_nama || '-'}</p>
		</div>

		<!-- Agama -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Agama</p>
			<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{orang?.agama_nama || '-'}</p>
		</div>

		<!-- Status Perkawinan -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status Perkawinan</p>
			<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{orang?.kawin_nama || '-'}</p>
		</div>

		<!-- Golongan Darah -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Golongan Darah</p>
			<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{orang?.golDarah || '-'}</p>
		</div>

		<!-- NPWP -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">NPWP</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{orang?.npwp || '-'}</p>
				{#if orang?.npwp && orang.npwp !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(orang.npwp, 'npwp')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin NPWP"
						aria-label="Salin NPWP"
					>
						{#if copiedField === 'npwp'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- No. KARPEG -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. KARPEG</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{fullData?.karpeg || '-'}</p>
				{#if fullData?.karpeg && fullData.karpeg !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(fullData.karpeg, 'karpeg')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin No. KARPEG"
						aria-label="Salin No. KARPEG"
					>
						{#if copiedField === 'karpeg'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- No. Taspen -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. Taspen</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{fullData?.taspen || '-'}</p>
				{#if fullData?.taspen && fullData.taspen !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(fullData.taspen, 'taspen')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin No. Taspen"
						aria-label="Salin No. Taspen"
					>
						{#if copiedField === 'taspen'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- No. BPJS -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">No. BPJS / Askes</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{fullData?.bpjs || '-'}</p>
				{#if fullData?.bpjs && fullData.bpjs !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(fullData.bpjs, 'bpjs')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin No. BPJS"
						aria-label="Salin No. BPJS"
					>
						{#if copiedField === 'bpjs'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Nomor HP -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 sm:col-span-2">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nomor HP / WhatsApp</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{orang?.no_hp || '-'}</p>
				{#if orang?.no_hp && orang.no_hp !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(orang.no_hp, 'no_hp')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5"
						title="Salin No. HP"
						aria-label="Salin No. HP"
					>
						{#if copiedField === 'no_hp'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Email -->
		<div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 sm:col-span-2">
			<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email</p>
			<div class="flex items-center justify-between mt-0.5">
				<p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mr-1">{orang?.email || '-'}</p>
				{#if orang?.email && orang.email !== '-'}
					<button 
						type="button"
						onclick={() => copyToClipboard(orang.email, 'email')}
						class="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5 shrink-0"
						title="Salin Email"
						aria-label="Salin Email"
					>
						{#if copiedField === 'email'}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Alamat Lengkap -->
	<div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
		<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Alamat Domisili Lengkap</p>
		<p class="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">{orang?.alamat || '-'}</p>
	</div>
</div>

<!-- Modal Edit / Tambah Identitas Pegawai -->
<RiwayatIdentitasModal
	open={showModal}
	item={modalItem}
	orang={modalItem ? orang : null}
	pegawaiId={modalItem ? (pegawaiId || fullData?.id) : null}
	onClose={() => showModal = false}
	onSuccess={handleSuccess}
/>
