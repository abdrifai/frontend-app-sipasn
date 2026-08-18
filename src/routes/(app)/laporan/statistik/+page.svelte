<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { api } from '$lib/utils/api.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';

	let stats = $state(null);
	let loading = $state(true);
	let error = $state(null);
	let activeTab = $state('golongan');

	let selectedItem = $state(null);
	let selectedType = $state(null);
	let modalTitle = $derived.by(() => {
		if (!selectedItem) return '';
		if (selectedType === 'pendidikan') return `Tingkat Pendidikan ${selectedItem.label}`;
		if (selectedType === 'golongan') return `Golongan ${selectedItem.label}`;
		if (selectedType === 'jabatan') return `Jenis Jabatan ${selectedItem.label}`;
		return selectedItem.label;
	});
	let modalSubtitle = $derived(selectedItem ? `${selectedItem.count.toLocaleString('id-ID')} Pegawai Aktif` : '');
	let employeesList = $state([]);
	let loadingEmployees = $state(false);
	let empError = $state(null);
	let empPage = $state(1);
	let totalEmpPages = $state(1);
	let hasMoreEmp = $derived(empPage < totalEmpPages);

	async function fetchEmployees(itemId, type, page = 1) {
		if (page === 1) {
			employeesList = [];
			loadingEmployees = true;
		}
		empError = null;
		try {
			let url = `/pegawai/duk?page=${page}&limit=20`;
			if (type === 'pendidikan') url += `&tktPend_id=${itemId}`;
			if (type === 'golongan') url += `&gol_id=${itemId}`;
			if (type === 'jabatan') url += `&jnsJab_id=${itemId}`;
			
			const res = await api(url);
			if (page === 1) {
				employeesList = res.data.data;
			} else {
				employeesList = [...employeesList, ...res.data.data];
			}
			totalEmpPages = res.data.stats.totalPages;
			empPage = page;
		} catch(err) {
			empError = err.message;
		} finally {
			loadingEmployees = false;
		}
	}

	function openModal(item, type) {
		if (!item.id) return;
		selectedItem = item;
		selectedType = type;
		document.body.style.overflow = 'hidden';
		fetchEmployees(item.id, type, 1);
	}

	function closeModal() {
		selectedItem = null;
		selectedType = null;
		document.body.style.overflow = '';
	}

	async function loadStats() {
		loading = true;
		error = null;
		try {
			const res = await api('/pegawai/stats');
			stats = res.data;
		} catch (err) {
			error = err.message || 'Gagal memuat statistik';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStats();
	});

	const tabs = [
		{ id: 'golongan', label: 'Golongan Kepangkatan', icon: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z' },
		{ id: 'pendidikan', label: 'Tingkat Pendidikan', icon: 'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 10 3 12 0v-5' },
		{ id: 'jabatan', label: 'Jenis Jabatan', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' }
	];
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
				</span>
				<h1 class="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Statistik Kepegawaian</h1>
			</div>
			<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
				Agregasi demografi ASN Pemerintah Kabupaten Tojo Una-Una berdasarkan jenis kelamin, golongan, pendidikan, dan jenis jabatan
			</p>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="secondary" size="sm" onclick={loadStats} disabled={loading}>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="{loading ? 'animate-spin' : ''} mr-1"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
				Segarkan Data
			</Button>
		</div>
	</div>

	{#if loading && !stats}
		<LoadingState message="Memuat ringkasan statistik..." />
	{:else if error}
		<ErrorState message={error} onRetry={loadStats} />
	{:else if stats}
		<!-- Top Metrics Row: Total Pegawai & Gender Breakdown -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
			<!-- Total Pegawai Card -->
			<div class="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
				<div class="flex items-start justify-between">
					<div>
						<span class="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Total Populasi</span>
						<h3 class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 mt-1 tracking-tight">
							{stats.total.toLocaleString('id-ID')}
						</h3>
					</div>
					<div class="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					</div>
				</div>
				<div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
					<span>PNS Aktif Terdaftar</span>
					<span class="font-bold text-emerald-600 dark:text-emerald-400">100% Tercatat</span>
				</div>
			</div>

			<!-- Gender Breakdown Card -->
			<div class="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
				<div class="flex items-center justify-between mb-4">
					<div>
						<span class="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Jenis Kelamin</span>
						<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Komposisi Pria & Wanita</h3>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{#each stats.byGender as gender}
						{@const pct = (gender.count / (stats.total || 1) * 100).toFixed(1)}
						{@const isPria = gender.label === 'Pria'}
						<div class="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 flex flex-col justify-between">
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2.5">
									<div class="w-8 h-8 rounded-xl flex items-center justify-center {isPria ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}">
										{#if isPria}
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"/><path d="M15 9l5-5"/><path d="M15 4h5v5"/></svg>
										{:else}
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v7"/><path d="M9 19h6"/></svg>
										{/if}
									</div>
									<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{gender.label}</span>
								</div>
								<div class="text-right">
									<span class="text-xl font-black text-zinc-900 dark:text-zinc-50">{gender.count.toLocaleString('id-ID')}</span>
									<span class="text-[11px] font-semibold text-zinc-400 ml-1">({pct}%)</span>
								</div>
							</div>
							<div class="h-2 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
								<div
									class="h-full rounded-full {isPria ? 'bg-blue-500' : 'bg-rose-500'}"
									style="width: {pct}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Segmented Tab Navigation -->
		<div class="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-800">
			{#each tabs as tab}
				<button
					class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
						{activeTab === tab.id 
							? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' 
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}"
					onclick={() => activeTab = tab.id}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{tab.icon}"/></svg>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Table Content Area -->
		<div>
			<!-- Tabel: Golongan Kepangkatan -->
			{#if activeTab === 'golongan'}
				<div class="space-y-3" in:fade={{ duration: 150 }}>
					<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
						<table class="w-full text-left text-xs sm:text-sm">
							<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
								<tr>
									<th class="px-5 py-4 w-12 text-center">No</th>
									<th class="px-5 py-4">Golongan / Ruang</th>
									<th class="px-5 py-4">Pangkat</th>
									<th class="px-5 py-4 w-72">Jumlah Pegawai</th>
									<th class="px-5 py-4 text-center w-28">Persentase</th>
									<th class="px-5 py-4 text-center w-28">Aksi</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
								{#each stats.byGolongan as gol, idx}
									{@const maxGol = Math.max(...stats.byGolongan.map(g => g.count))}
									{@const isMax = gol.count === maxGol}
									{@const pct = stats.total > 0 ? (gol.count / stats.total * 100).toFixed(1) : '0'}
									{@const pangkatName = gol.label.includes('(') ? gol.label.split('(')[0].trim() : gol.label}
									{@const ruangName = gol.label.includes('(') ? gol.label.split('(')[1].replace(')', '') : ''}
									<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
										<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
											{idx + 1}
										</td>
										<td class="px-5 py-3.5 whitespace-nowrap">
											<span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-xs border border-indigo-200/60 dark:border-indigo-800">
												{ruangName || gol.id}
											</span>
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-2">
												<span class="font-bold text-zinc-900 dark:text-zinc-100">{pangkatName}</span>
												{#if isMax}
													<span class="px-1.5 py-0.5 rounded bg-indigo-600 text-[9px] font-black text-white uppercase">Terbanyak</span>
												{/if}
											</div>
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-3">
												<span class="text-sm font-black text-zinc-900 dark:text-zinc-50 tabular-nums w-12">
													{gol.count.toLocaleString('id-ID')}
												</span>
												<div class="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
													<div
														class="h-full rounded-full bg-indigo-600 transition-all duration-500"
														style="width: {maxGol > 0 ? (gol.count / maxGol * 100) : 0}%"
													></div>
												</div>
											</div>
										</td>
										<td class="px-5 py-3.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
											{pct}%
										</td>
										<td class="px-5 py-3.5 text-center whitespace-nowrap">
											<button
												type="button"
												onclick={() => openModal(gol, 'golongan')}
												class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
											>
												Daftar
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-zinc-50/90 dark:bg-zinc-800/80 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-900 dark:text-zinc-100">
								<tr>
									<td colspan="3" class="px-5 py-3.5 text-right uppercase tracking-wider">Total Keseluruhan:</td>
									<td class="px-5 py-3.5 font-black text-sm text-indigo-600 dark:text-indigo-400">
										{stats.total.toLocaleString('id-ID')} Pegawai
									</td>
									<td class="px-5 py-3.5 text-center font-black">100%</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>

			<!-- Tabel: Tingkat Pendidikan -->
			{:else if activeTab === 'pendidikan'}
				<div class="space-y-3" in:fade={{ duration: 150 }}>
					<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
						<table class="w-full text-left text-xs sm:text-sm">
							<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
								<tr>
									<th class="px-5 py-4 w-12 text-center">No</th>
									<th class="px-5 py-4">Jenjang / Tingkat Pendidikan</th>
									<th class="px-5 py-4 w-80">Jumlah Pegawai</th>
									<th class="px-5 py-4 text-center w-28">Persentase</th>
									<th class="px-5 py-4 text-center w-28">Aksi</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
								{#each stats.byEducation as edu, idx}
									{@const maxEdu = Math.max(...stats.byEducation.map(e => e.count))}
									{@const isMax = edu.count === maxEdu}
									{@const pct = stats.total > 0 ? (edu.count / stats.total * 100).toFixed(1) : '0'}
									<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
										<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
											{idx + 1}
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-2">
												<span class="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{edu.label}</span>
												{#if isMax}
													<span class="px-1.5 py-0.5 rounded bg-indigo-600 text-[9px] font-black text-white uppercase">Terbanyak</span>
												{/if}
											</div>
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-3">
												<span class="text-sm font-black text-zinc-900 dark:text-zinc-50 tabular-nums w-12">
													{edu.count.toLocaleString('id-ID')}
												</span>
												<div class="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
													<div
														class="h-full rounded-full bg-indigo-600 transition-all duration-500"
														style="width: {maxEdu > 0 ? (edu.count / maxEdu * 100) : 0}%"
													></div>
												</div>
											</div>
										</td>
										<td class="px-5 py-3.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
											{pct}%
										</td>
										<td class="px-5 py-3.5 text-center whitespace-nowrap">
											<button
												type="button"
												onclick={() => openModal(edu, 'pendidikan')}
												class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
											>
												Daftar
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-zinc-50/90 dark:bg-zinc-800/80 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-900 dark:text-zinc-100">
								<tr>
									<td colspan="2" class="px-5 py-3.5 text-right uppercase tracking-wider">Total Keseluruhan:</td>
									<td class="px-5 py-3.5 font-black text-sm text-indigo-600 dark:text-indigo-400">
										{stats.total.toLocaleString('id-ID')} Pegawai
									</td>
									<td class="px-5 py-3.5 text-center font-black">100%</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>

			<!-- Tabel: Jenis Jabatan -->
			{:else if activeTab === 'jabatan'}
				<div class="space-y-3" in:fade={{ duration: 150 }}>
					<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm relative">
						<table class="w-full text-left text-xs sm:text-sm">
							<thead class="bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
								<tr>
									<th class="px-5 py-4 w-12 text-center">No</th>
									<th class="px-5 py-4">Kategori / Jenis Jabatan</th>
									<th class="px-5 py-4 w-80">Jumlah Pegawai</th>
									<th class="px-5 py-4 text-center w-28">Persentase</th>
									<th class="px-5 py-4 text-center w-28">Aksi</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
								{#each stats.byJabatan as jab, idx}
									{@const maxJab = Math.max(...stats.byJabatan.map(j => j.count))}
									{@const isMax = jab.count === maxJab}
									{@const pct = stats.total > 0 ? (jab.count / stats.total * 100).toFixed(1) : '0'}
									<tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
										<td class="px-5 py-3.5 text-center font-mono text-xs text-zinc-400">
											{idx + 1}
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-2">
												<span class="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{jab.label}</span>
												{#if isMax}
													<span class="px-1.5 py-0.5 rounded bg-indigo-600 text-[9px] font-black text-white uppercase">Terbanyak</span>
												{/if}
											</div>
										</td>
										<td class="px-5 py-3.5">
											<div class="flex items-center gap-3">
												<span class="text-sm font-black text-zinc-900 dark:text-zinc-50 tabular-nums w-12">
													{jab.count.toLocaleString('id-ID')}
												</span>
												<div class="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
													<div
														class="h-full rounded-full bg-indigo-600 transition-all duration-500"
														style="width: {maxJab > 0 ? (jab.count / maxJab * 100) : 0}%"
													></div>
												</div>
											</div>
										</td>
										<td class="px-5 py-3.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
											{pct}%
										</td>
										<td class="px-5 py-3.5 text-center whitespace-nowrap">
											<button
												type="button"
												onclick={() => openModal(jab, 'jabatan')}
												class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
											>
												Daftar
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-zinc-50/90 dark:bg-zinc-800/80 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-900 dark:text-zinc-100">
								<tr>
									<td colspan="2" class="px-5 py-3.5 text-right uppercase tracking-wider">Total Keseluruhan:</td>
									<td class="px-5 py-3.5 font-black text-sm text-indigo-600 dark:text-indigo-400">
										{stats.total.toLocaleString('id-ID')} Pegawai
									</td>
									<td class="px-5 py-3.5 text-center font-black">100%</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Pegawai -->
{#if selectedItem}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" in:fade={{duration: 150}} out:fade={{duration: 100}}>
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onclick={closeModal}></div>
		<div class="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
			<!-- Modal Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
				<div>
					<h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">{modalTitle}</h2>
					<p class="text-xs font-medium text-zinc-500 mt-0.5">{modalSubtitle}</p>
				</div>
				<button aria-label="Tutup modal" onclick={closeModal} class="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Modal Body -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex-1 overflow-auto p-5" onscroll={(e) => {
				const target = e.currentTarget;
				if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50 && !loadingEmployees && hasMoreEmp) {
					fetchEmployees(selectedItem.id, selectedType, empPage + 1);
				}
			}}>
				{#if loadingEmployees && employeesList.length === 0}
					<div class="py-12"><LoadingState message="Memuat daftar pegawai..." /></div>
				{:else if empError}
					<ErrorState message={empError} onRetry={() => fetchEmployees(selectedItem.id, selectedType, 1)} />
				{:else}
					<div class="space-y-2.5">
						{#each employeesList as emp}
							<div class="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
								<div class="min-w-0 flex-1">
									<a href="/pegawai/{emp.id}" class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 block truncate">
										{emp.nama}
									</a>
									<p class="text-[11px] text-zinc-500 font-mono mt-0.5">{emp.nip}</p>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{emp.jabatan || '-'}</p>
									<p class="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{emp.pangkat_gol || emp.golongan || '-'}</p>
								</div>
							</div>
						{/each}
						{#if loadingEmployees}
							<div class="py-3 text-center text-xs text-zinc-400 animate-pulse">Memuat data berikutnya...</div>
						{/if}
						{#if employeesList.length === 0}
							<div class="py-12 text-center text-xs text-zinc-400">Tidak ada pegawai ditemukan.</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
