<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore.js';
	import Card from '$lib/components/layout/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ConfirmDeleteModal from '$lib/components/feedback/ConfirmDeleteModal.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import UnorTreeItem from '$lib/components/referensi/UnorTreeItem.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';

	// Data State
	let treeData = $state([]);
	let instansiOptions = $state([]);
	let jnsUnorOptions = $state([]);
	let jabatanOptions = $state([]);
	let eselonOptions = $state([]);
	let jenisJabatanOptions = $state([]);
	let jenjangJabatanOptions = $state([]);

	// Unor Induk Filter & Search State
	let unorIndukOptions = $state([]);
	let selectedUnorIndukId = $state('');
	let searchKeyword = $state('');
	let loadingInduk = $state(false);

	let loading = $state(true);
	let error = $state(null);
	let selectedInstansiKode = $state(7209);
	
	// Modal & Form State
	let showModal = $state(false);
	let isEditing = $state(false);
	let submitting = $state(false);
	let formError = $state(null);
	let fieldErrors = $state({});
	let currentLevel = $state('induk'); // 'induk', 'unor', 'sub', 'sub-sub'
	let isChangingJabatan = $state(false);

	// Delete Confirmation State
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let deleteLoading = $state(false);

	let form = $state({
		id: '',
		kode: '',
		nmUnor: '',
		jab_id: '',
		nm_jab: '',
		kategori_jab: 'STRUKTURAL',
		eselon_id: '',
		jns_jab_id: '',
		jenjang_jab_id: '',
		bup: 58,
		kelas_jabatan: '',
		kode_jabatan: '',
		instansi_id: '',
		instansi_kode: '',
		jnsUnor_id: '',
		jnsUnor_kode: '',
		peraturan: '',
		tglPeraturan: '',
		tahun: null,
		ket: '',
		isAktif: 1,
		unorinduk_id: '',
		unorinduk_kode: '',
		unor_id: '',
		unor_kode: '',
		subUnor_id: '',
		subUnor_kode: ''
	});

	async function loadTree() {
		loading = true;
		error = null;
		try {
			const res = await api(`/ref-unor/tree?kode=${selectedInstansiKode}`);
			treeData = res.data;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadUnorIndukOptions() {
		loadingInduk = true;
		try {
			const res = await api(`/ref-unor/induk?limit=1000&instansi_kode=${selectedInstansiKode}`);
			const list = res?.data || [];
			unorIndukOptions = list.map(item => ({
				id: item.id,
				value: item.id,
				label: item.nmUnor,
				kode: item.kode,
				item
			}));
		} catch (err) {
			console.error('Failed to load Unor Induk options:', err);
		} finally {
			loadingInduk = false;
		}
	}

	function handleInstansiChange() {
		selectedUnorIndukId = '';
		searchKeyword = '';
		loadTree();
		loadUnorIndukOptions();
	}

	async function handleUnorIndukFilter() {
		if (!selectedUnorIndukId) {
			loadTree();
			return;
		}

		loading = true;
		error = null;
		try {
			const targetOption = unorIndukOptions.find(o => o.value === selectedUnorIndukId);
			const targetName = targetOption?.label || 'Unit Organisasi Induk';

			const res = await api(`/ref-unor/tree?level=induk&parentId=${selectedUnorIndukId}`);
			
			treeData = [{
				id: selectedUnorIndukId,
				nmUnor: targetName,
				level: 'induk',
				hasChildren: (res.data || []).length > 0,
				children: res.data || [],
				expanded: true,
				is_pimpinan: true
			}];
		} catch (err) {
			error = err.message || 'Gagal memuat cabang Unor Induk';
		} finally {
			loading = false;
		}
	}

	function clearUnorIndukFilter() {
		selectedUnorIndukId = '';
		searchKeyword = '';
		loadTree();
	}

	function refreshTreeData() {
		if (selectedUnorIndukId) {
			handleUnorIndukFilter();
		} else {
			loadTree();
		}
	}

	let displayedTreeData = $derived.by(() => {
		if (!searchKeyword.trim()) return treeData;
		const kw = searchKeyword.toLowerCase().trim();

		const filterNodes = (items) => {
			const result = [];
			for (const item of items) {
				const name = (item.nmUnor || item.instansi || '').toLowerCase();
				const matches = name.includes(kw);
				const childMatches = item.children && item.children.length > 0 ? filterNodes(item.children) : [];
				if (matches || childMatches.length > 0) {
					result.push({
						...item,
						expanded: true,
						children: childMatches.length > 0 ? childMatches : item.children
					});
				}
			}
			return result;
		};

		return filterNodes(treeData);
	});

	async function loadChildren(parentId, level) {
		try {
			const res = await api(`/ref-unor/tree?level=${level}&parentId=${parentId}`);
			
			// Deep recursive update that returns a new array to ensure reactivity
			const updateItems = (items) => {
				return items.map(item => {
					if (item.id === parentId && item.level === level) {
						return { ...item, children: res.data };
					}
					if (item.children && item.children.length > 0) {
						return { ...item, children: updateItems(item.children) };
					}
					return item;
				});
			};
			
			treeData = updateItems(treeData);
		} catch (err) {
			console.error('Failed to load children:', err);
			toast.error('Gagal memuat cabang');
		}
	}

	async function loadInstansi() {
		try {
			const res = await api('/ref-instansi?limit=1000');
			instansiOptions = res.data;
		} catch (err) {
			console.error('Failed to load instansi:', err);
		}
	}

	async function loadJnsUnor(instansiId = '') {
		try {
			const query = instansiId ? `?instansi_id=${instansiId}` : '';
			const res = await api(`/ref-unor/jnsunor${query}`);
			// Map for Combobox / Select: { value: id, label: name }
			jnsUnorOptions = res.data.map(item => ({
				id: item.id,
				kode: item.kode,
				jnsunor: item.jnsunor,
				label: item.jnsunor,
				value: item.id
			}));
		} catch (err) {
			console.error('Failed to load jenis unor:', err);
		}
	}

	async function loadJabatan() {
		if (jabatanOptions.length > 0) return;
		try {
			const res = await api('/ref-jabatan?limit=5000');
			if (res?.data) {
				jabatanOptions = res.data.map(item => ({
					id: item.id,
					value: item.id,
					label: item.nm_jab || item.nama_jabatan,
					nama_jabatan_murni: item.nama_jabatan_murni || item.nama_jabatan,
					unit_terhubung: item.unit_terhubung,
					kategori: item.kategori,
					eselon_id: item.eselon_id,
					bup: item.bup
				}));
			}
		} catch (err) {
			console.error('Failed to load jabatan options:', err);
		}
	}

	function handleJabSelect(val, opt) {
		if (opt) {
			form.jab_id = opt.id || opt.value || val;
			form.nm_jab = opt.nama_jabatan_murni || (opt.label ? opt.label.split(' — (')[0] : form.nm_jab);
			if (opt.eselon_id) form.eselon_id = opt.eselon_id;
			if (opt.kategori) form.kategori_jab = opt.kategori;
			if (opt.bup) form.bup = opt.bup;
		} else {
			form.jab_id = '';
		}
	}

	async function loadJabatanMetadata() {
		try {
			const [esl, jns, jnj] = await Promise.all([
				api('/ref-unor/eselon'),
				api('/ref-jabatan/jenis?limit=100'),
				api('/ref-jabatan/jenjang?limit=100')
			]);
			eselonOptions = esl.data || [];
			jenisJabatanOptions = jns.data || [];
			jenjangJabatanOptions = (jnj.data || []).map(item => ({
				...item,
				id: String(item.id)
			}));
		} catch (err) {
			console.error('Failed to load jabatan metadata options:', err);
		}
	}

	onMount(() => {
		loadTree();
		loadInstansi();
		loadUnorIndukOptions();
		loadJnsUnor();
		loadJabatan();
		loadJabatanMetadata();
	});

	// Filter Jenjang Jabatan secara dinamis berdasarkan Jenis Jabatan (ref_jnsjab) yang dipilih
	let filteredJenjangJabatanOptions = $derived.by(() => {
		if (!form.jns_jab_id) return jenjangJabatanOptions;
		const matched = jenjangJabatanOptions.filter(opt => opt.jnsjab_id === form.jns_jab_id);
		return matched.length > 0 ? matched : jenjangJabatanOptions;
	});

	function resetForm() {
		isChangingJabatan = false;
		const defStruk = jenisJabatanOptions.find(j => (j.jnsjab || '').toUpperCase() === 'STRUKTURAL' || j.kode === '10');

		form = {
			id: '', kode: '', nmUnor: '',
			jab_id: '', nm_jab: '',
			kategori_jab: 'STRUKTURAL',
			eselon_id: '',
			jns_jab_id: defStruk ? defStruk.id : '',
			jenjang_jab_id: '',
			bup: 58,
			kelas_jabatan: '',
			kode_jabatan: '',
			instansi_id: '', instansi_kode: '',
			jnsUnor_id: '', jnsUnor_kode: '', peraturan: '', tglPeraturan: '', tahun: null, ket: '', isAktif: 1,
			unorinduk_id: '', unorinduk_kode: '',
			unor_id: '', unor_kode: '',
			subUnor_id: '', subUnor_kode: ''
		};
	}

	function handleNmUnorBlur() {
		if (!form.nmUnor) return;
		const cleanUnor = form.nmUnor.trim();
		if (!cleanUnor) return;

		// Jika nama jabatan kosong, berawalan KEPALA/Kepala, atau saat tambah baru:
		// Otomatis terisi "KEPALA " + nama unit organisasi
		if (!form.nm_jab || form.nm_jab.trim() === '' || form.nm_jab.toUpperCase().startsWith('KEPALA ') || !isEditing) {
			if (cleanUnor.toUpperCase().startsWith('KEPALA ')) {
				form.nm_jab = cleanUnor;
			} else {
				form.nm_jab = `KEPALA ${cleanUnor}`;
			}
		}
	}

	function handleTglPeraturanChange() {
		if (form.tglPeraturan) {
			form.tahun = new Date(form.tglPeraturan).getFullYear();
		}
	}

	function handleKategoriJabChange() {
		const available = filteredJenisJabatanOptions;
		const stillValid = available.some(opt => opt.id === form.jns_jab_id);
		if (!stillValid && available.length > 0) {
			form.jns_jab_id = available[0].id;
		}

		if (form.kategori_jab !== 'STRUKTURAL') {
			form.eselon_id = '';
			if (form.kategori_jab === 'PELAKSANA') {
				form.bup = 58;
			}
		} else {
			if (!form.eselon_id) {
				form.bup = 58;
			}
		}
	}

	function handleJnsJabChange() {
		const selected = jenisJabatanOptions.find(j => j.id === form.jns_jab_id);
		if (selected) {
			const name = (selected.jnsjab || '').toUpperCase();
			if (name.includes('STRUKTURAL') || name.includes('PIMPINAN TINGGI') || name.includes('JPT') || selected.kode_sapk === 1) {
				form.kategori_jab = 'STRUKTURAL';
			} else if ((name.includes('FUNGSIONAL') && !name.includes('UMUM')) || name.includes('JF') || selected.kode_sapk === 2) {
				form.kategori_jab = 'FUNGSIONAL';
				form.eselon_id = '';
			} else if (name.includes('PELAKSANA') || name.includes('UMUM') || name.includes('ADMINISTRASI') || name.includes('JA') || selected.kode_sapk === 4) {
				form.kategori_jab = 'PELAKSANA';
				form.eselon_id = '';
			}
		}
	}

	function handleEselonChange() {
		const selectedEselon = eselonOptions.find(e => e.id === form.eselon_id);
		if (selectedEselon) {
			const eselonName = (selectedEselon.eselon || '').toUpperCase();
			if (eselonName.startsWith('I.') || eselonName.startsWith('II.')) {
				form.bup = 60;
				const jptOpt = jenisJabatanOptions.find(j => {
					const name = (j.jnsjab || '').toUpperCase();
					return name.includes('PIMPINAN TINGGI') || name.includes('JPT');
				});
				if (jptOpt && form.kategori_jab === 'STRUKTURAL') {
					form.jns_jab_id = jptOpt.id;
				}
			} else {
				form.bup = 58;
				const strukOpt = jenisJabatanOptions.find(j => (j.jnsjab || '').toUpperCase() === 'STRUKTURAL');
				if (strukOpt && form.kategori_jab === 'STRUKTURAL') {
					form.jns_jab_id = strukOpt.id;
				}
			}
		}
	}

	function handleAddRoot() {
		isEditing = false;
		currentLevel = 'induk';
		resetForm();
		showModal = true;
	}

	function handleAddChild(parent) {
		isEditing = false;
		resetForm();
		
		if (parent.level === 'instansi') {
			currentLevel = 'induk';
			form.instansi_id = parent.id;
			form.instansi_kode = parent.kode.toString();
			loadJnsUnor(parent.id);
		} else if (parent.level === 'induk') {
			currentLevel = 'unor';
			form.unorinduk_id = parent.id;
			form.unorinduk_kode = parent.kode;
		} else if (parent.level === 'unor') {
			currentLevel = 'sub';
			form.unor_id = parent.id;
			form.unor_kode = parent.kode;
		} else if (parent.level === 'sub') {
			currentLevel = 'sub-sub';
			form.subUnor_id = parent.id;
			form.subUnor_kode = parent.kode;
		}
		
		showModal = true;
	}

	async function handleEdit(item) {
		isEditing = true;
		currentLevel = item.level;
		formError = null;
		fieldErrors = {};
		resetForm();

		try {
			let endpoint = '/ref-unor';
			if (item.level === 'induk') endpoint += `/induk/${item.id}`;
			else if (item.level === 'sub') endpoint += `/sub/${item.id}`;
			else if (item.level === 'sub-sub') endpoint += `/sub-sub/${item.id}`;
			else endpoint += `/${item.id}`;

			const res = await api(endpoint);
			if (res?.data) {
				form = { ...form, ...res.data };
			} else {
				form = { ...form, ...item };
			}
		} catch (err) {
			console.error('Failed to load item detail:', err);
			form = { ...form, ...item };
		}

		if (!form.nm_jab || form.nm_jab === '-' || form.nm_jab.trim() === '') {
			if (item?.nm_jab && item.nm_jab !== '-') {
				form.nm_jab = item.nm_jab;
			} else if (form.nmUnor) {
				const cleanUnor = form.nmUnor.trim();
				form.nm_jab = cleanUnor.toUpperCase().startsWith('KEPALA ') ? cleanUnor : `KEPALA ${cleanUnor}`;
			}
		}

		if (form.instansi_id) {
			await loadJnsUnor(form.instansi_id);
		}
		if (form.tglPeraturan) {
			form.tglPeraturan = new Date(form.tglPeraturan).toISOString().split('T')[0];
		}
		showModal = true;
	}

	function handleDelete(item) {
		itemToDelete = item;
		showDeleteConfirm = true;
	}

	async function handleSubmit() {
		submitting = true;
		formError = null;
		fieldErrors = {};
		try {
			let endpoint = '/ref-unor';
			let payload = {};

			const tahunVal = form.tglPeraturan 
				? new Date(form.tglPeraturan).getFullYear() 
				: (form.tahun ? parseInt(form.tahun) : null);

			const selectedJns = jnsUnorOptions.find(j => j.id === form.jnsUnor_id || j.value === form.jnsUnor_id);

			const commonPayload = {
				kode: form.kode || undefined,
				nmUnor: form.nmUnor,
				nm_jab: form.nm_jab || null,
				kategori_jab: form.kategori_jab || 'STRUKTURAL',
				jnsUnor_id: form.jnsUnor_id || null,
				jnsUnor_kode: selectedJns?.kode ? String(selectedJns.kode) : (form.jnsUnor_kode ? String(form.jnsUnor_kode) : null),
				eselon_id: form.eselon_id || null,
				jns_jab_id: form.jns_jab_id || null,
				jenjang_jab_id: form.jenjang_jab_id || null,
				bup: form.bup ? parseInt(form.bup, 10) : 58,
				kelas_jabatan: form.kelas_jabatan ? parseInt(form.kelas_jabatan, 10) : null,
				kode_jabatan: form.kode_jabatan || null,
				jab_id: form.jab_id || null,
				peraturan: form.peraturan || null,
				tglPeraturan: form.tglPeraturan || null,
				tahun: tahunVal,
				ket: form.ket || null,
				isAktif: form.isAktif !== undefined && form.isAktif !== '' ? parseInt(form.isAktif, 10) : 1
			};

			if (currentLevel === 'induk') {
				endpoint += '/induk';

				payload = {
					...commonPayload,
					instansi_id: form.instansi_id || null,
					instansi_kode: form.instansi_kode || null,
				};
				if (payload.instansi_id && !payload.instansi_kode) {
					const ins = instansiOptions.find(i => i.id === payload.instansi_id);
					if (ins) payload.instansi_kode = ins.kode.toString();
				}
			} else if (currentLevel === 'unor') {
				payload = {
					...commonPayload,
					unorinduk_id: form.unorinduk_id,
					unorinduk_kode: form.unorinduk_kode,
				};
			} else if (currentLevel === 'sub') {
				endpoint += '/sub';
				payload = {
					...commonPayload,
					unor_id: form.unor_id,
					unor_kode: form.unor_kode,
				};
			} else if (currentLevel === 'sub-sub') {
				endpoint += '/sub-sub';
				payload = {
					...commonPayload,
					subUnor_id: form.subUnor_id,
					subUnor_kode: form.subUnor_kode,
				};
			}

			const id = form.id;

			if (isEditing) {
				await api(`${endpoint}/${id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Berhasil diperbarui');
			} else {
				await api(endpoint, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Berhasil ditambahkan');
			}
			showModal = false;
			refreshTreeData();
		} catch (err) {
			if (err.statusCode === 422) {
				if (Array.isArray(err.errors)) {
					fieldErrors = err.errors.reduce((acc, curr) => {
						acc[curr.field] = curr.message;
						return acc;
					}, {});
				} else {
					fieldErrors = err.errors || {};
				}
				formError = err.message || 'Validasi gagal, periksa isian form.';
			} else {
				formError = err.message || 'Terjadi kesalahan saat menyimpan data.';
			}
			toast.error(formError);
		} finally {
			submitting = false;
		}
	}

	async function executeDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			let endpoint = '/ref-unor';
			if (itemToDelete.level === 'induk') endpoint += '/induk';
			else if (itemToDelete.level === 'sub') endpoint += '/sub';
			else if (itemToDelete.level === 'sub-sub') endpoint += '/sub-sub';

			await api(`${endpoint}/${itemToDelete.id}`, { method: 'DELETE' });
			toast.success('Berhasil dihapus');
			showDeleteConfirm = false;
			refreshTreeData();
		} catch (err) {
			toast.error('Gagal menghapus: ' + err.message);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap gap-2.5 items-end justify-between">
		<div class="flex flex-wrap gap-2.5 items-end flex-1">
			<Combobox 
				label="Pilih Instansi"
				placeholder="Cari instansi pemerintah..."
				options={instansiOptions}
				bind:value={selectedInstansiKode}
				onchange={handleInstansiChange}
				class="min-w-[240px] sm:min-w-[280px]"
			/>

			<Combobox 
				label="Pilih / Cari Unor Induk"
				placeholder="Semua Unor Induk (Filter)..."
				options={unorIndukOptions}
				bind:value={selectedUnorIndukId}
				onchange={handleUnorIndukFilter}
				class="min-w-[280px] sm:min-w-[340px]"
			/>

			<div class="relative flex-1 sm:flex-initial min-w-[200px]">
				<label for="search-unor" class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Cari Nama Unit</label>
				<div class="relative">
					<input
						id="search-unor"
						type="text"
						placeholder="Cari kata kunci unit..."
						bind:value={searchKeyword}
						class="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
					/>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</div>
			</div>

			<div class="flex gap-2">
				{#if selectedUnorIndukId || searchKeyword}
					<Button variant="ghost" onclick={clearUnorIndukFilter} title="Reset Filter Unor Induk & Pencarian">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
						<span>Reset</span>
					</Button>
				{/if}
				<Button variant="secondary" onclick={loadTree} title="Segarkan Data Struktur">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
					<span>Segarkan</span>
				</Button>
			</div>
		</div>
	</div>

	<Card>
		<div class="mb-4 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-4">
			<div class="w-6"></div>
			<div class="flex-1">
				Struktur Organisasi
				{#if selectedUnorIndukId}
					<span class="ml-2 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold normal-case">
						Terfilter Unor Induk
					</span>
				{/if}
			</div>
			<div class="hidden md:block">Aksi</div>
		</div>

		{#if loading}
			<LoadingState message="Membangun pohon organisasi..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadTree} />
		{:else if displayedTreeData.length === 0}
			<EmptyState message="Tidak ada unit organisasi yang sesuai dengan filter/pencarian." />
		{:else}
			<div class="space-y-1">
				{#each displayedTreeData as item}
					<UnorTreeItem 
						{item} 
						onEdit={handleEdit} 
						onDelete={handleDelete} 
						onAddChild={handleAddChild} 
						{loadChildren}
					/>
				{/each}
			</div>
		{/if}
	</Card>
	</div>

{#if showModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-3xl lg:max-w-4xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
				<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50">
					{#if isEditing}Ubah{:else}Tambah{/if} 
					{#if currentLevel === 'induk'}Unit Organisasi Induk
					{:else if currentLevel === 'unor'}Unit Organisasi
					{:else if currentLevel === 'sub'}Sub Unit Organisasi
					{:else if currentLevel === 'sub-sub'}Sub Unit Organisasi Sub
					{:else}{currentLevel.toUpperCase()}{/if}
				</h2>
				<button onclick={() => showModal = false} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<div class="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
				{#if formError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
						{formError}
					</div>
				{/if}

				{#if isEditing}
					<div class="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
						<div class="flex items-center gap-2">
							<span class="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">ID Unit:</span>
							<span class="font-mono font-semibold text-zinc-800 dark:text-zinc-200 select-all">{form.id || '-'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">ID Jabatan (`jab_id`):</span>
							{#if form.jab_id && form.jab_id !== 'null'}
								<span class="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 select-all flex items-center gap-1.5">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									{form.jab_id}
								</span>
							{:else}
								<span class="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1.5">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
									Kosong (NULL)
								</span>
							{/if}
						</div>
					</div>
				{/if}

				{#if currentLevel === 'induk'}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1">
							<label for="instansi" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Instansi</label>
							<select
								id="instansi"
								bind:value={form.instansi_id}
								onchange={() => loadJnsUnor(form.instansi_id)}
								class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								<option value="">Pilih Instansi</option>
								{#each instansiOptions as opt}
									<option value={opt.id}>{opt.kode} - {opt.instansi}</option>
								{/each}
							</select>
							{#if fieldErrors.instansi_id}
								<p class="text-xs text-rose-500">{fieldErrors.instansi_id}</p>
							{/if}
						</div>

						<div class="space-y-1">
							<label for="jnsUnor" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Jenis Unor (ref_jnsunor)</label>
							<select
								id="jnsUnor"
								bind:value={form.jnsUnor_id}
								onchange={(e) => {
									const selected = jnsUnorOptions.find(o => o.id === form.jnsUnor_id);
									if (selected) form.jnsUnor_kode = selected.kode.toString();
								}}
								class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
							>
								<option value="">Pilih Jenis Unor</option>
								{#each jnsUnorOptions as opt}
									<option value={opt.id}>{opt.jnsunor}</option>
								{/each}
							</select>
							{#if fieldErrors.jnsUnor_id}
								<p class="text-xs text-rose-500">{fieldErrors.jnsUnor_id}</p>
							{/if}
						</div>
					</div>
				{:else}
					<div class="space-y-1">
						<label for="jnsUnor" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Jenis Unor (ref_jnsunor)</label>
						<select
							id="jnsUnor"
							bind:value={form.jnsUnor_id}
							onchange={(e) => {
								const selected = jnsUnorOptions.find(o => o.id === form.jnsUnor_id);
								if (selected) form.jnsUnor_kode = selected.kode.toString();
							}}
							class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
						>
							<option value="">Pilih Jenis Unor</option>
							{#each jnsUnorOptions as opt}
								<option value={opt.id}>{opt.jnsunor}</option>
							{/each}
						</select>
						{#if fieldErrors.jnsUnor_id}
							<p class="text-xs text-rose-500">{fieldErrors.jnsUnor_id}</p>
						{/if}
					</div>
				{/if}

				<div class="space-y-1">
					<Input
						label={currentLevel === 'induk' ? 'Nama Unit Organisasi Induk' : (currentLevel === 'sub' ? 'Nama Sub Unit Organisasi' : (currentLevel === 'sub-sub' ? 'Nama Sub Unit Organisasi Sub' : 'Nama Unit Organisasi'))}
						bind:value={form.nmUnor}
						placeholder={currentLevel === 'induk' ? 'Nama Lengkap Unit Organisasi Induk' : 'Nama Lengkap Unit Organisasi'}
						error={fieldErrors.nmUnor}
						onblur={handleNmUnorBlur}
						required
					/>
				</div>

				{#if currentLevel !== 'instansi'}
					<!-- Section Header: Master Jabatan Pimpinan -->
					<div class="pt-3 pb-1 border-t border-zinc-200/80 dark:border-zinc-800">
						<div class="flex items-center gap-2 mb-3">
							<div class="w-2 h-2 rounded-full bg-indigo-500"></div>
							<h3 class="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
								Informasi Jabatan (Master Jabatan)
							</h3>
						</div>

						<div class="space-y-4">
							{#if isEditing}
								{#if form.jab_id && form.jab_id !== 'null' && !isChangingJabatan}
									<div class="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl space-y-2">
										<div class="flex items-center justify-between">
											<span class="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
												<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
												Nama Jabatan (dari Master ref_jabatan)
											</span>
											<button
												type="button"
												onclick={() => isChangingJabatan = true}
												class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
											>
												Ubah / Cari Jabatan Lain
											</button>
										</div>
										<div class="p-3 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-xl">
											<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{form.nm_jab || '-'}</span>
										</div>
									</div>
								{:else}
									<div class="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl space-y-3">
										{#if isChangingJabatan}
											<div class="flex justify-end">
												<button
													type="button"
													onclick={() => isChangingJabatan = false}
													class="text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline cursor-pointer"
												>
													Batal Ubah Jabatan
												</button>
											</div>
										{/if}
										<Combobox
											label="Cari & Hubungkan Master Jabatan (ref_jabatan)"
											placeholder="Ketik kata kunci untuk mencari dari master ref_jabatan..."
											options={jabatanOptions}
											bind:value={form.jab_id}
											onchange={handleJabSelect}
										/>
										{#if form.jab_id && form.jab_id !== 'null'}
											<div class="flex items-center justify-between text-xs pt-1">
												<span class="text-indigo-700 dark:text-indigo-300 font-medium">Terhubung ke <code>ref_jabatan.id</code>:</span>
												<span class="font-mono font-bold text-indigo-900 dark:text-indigo-100">{form.jab_id}</span>
											</div>
										{:else}
											<p class="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
												💡 <code>jab_id</code> saat ini <b>Kosong (NULL)</b>. Anda dapat memilih dari pencarian <code>ref_jabatan</code> di atas atau ketik nama baru di bawah.
											</p>
										{/if}

										<Input
											label="Nama Jabatan"
											bind:value={form.nm_jab}
											placeholder="Contoh: KEPALA SUBBAGIAN PROGRAM, KEUANGAN DAN ASET"
											error={fieldErrors.nm_jab}
											required
										/>
									</div>
								{/if}
							{:else}
								<Input
									label="Nama Jabatan"
									bind:value={form.nm_jab}
									placeholder="Contoh: KEPALA SUBBAGIAN PROGRAM, KEUANGAN DAN ASET"
									error={fieldErrors.nm_jab}
									required
								/>
							{/if}

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div class="flex flex-col gap-1.5">
									<label for="eselon" class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										Level Eselon
									</label>
									<select
										id="eselon"
										bind:value={form.eselon_id}
										onchange={handleEselonChange}
										class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-900 dark:text-zinc-100"
									>
										<option value="">Non Eselon</option>
										{#each eselonOptions as opt}
											<option value={opt.id}>{opt.eselon}</option>
										{/each}
									</select>
									{#if fieldErrors.eselon_id}
										<p class="text-xs text-rose-500 font-semibold">{fieldErrors.eselon_id}</p>
									{/if}
								</div>

								<Input
									label="Batas Usia Pensiun (BUP)"
									type="number"
									bind:value={form.bup}
									placeholder="58 atau 60"
									error={fieldErrors.bup}
								/>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div class="flex flex-col gap-1.5">
									<label for="jns_jab" class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										Jenis Jabatan
									</label>
									<select
										id="jns_jab"
										bind:value={form.jns_jab_id}
										class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-900 dark:text-zinc-100"
									>
										<option value="">Pilih Jenis Jabatan</option>
										{#each jenisJabatanOptions as opt}
											<option value={opt.id}>{opt.jnsjab}</option>
										{/each}
									</select>
								</div>

								<div class="flex flex-col gap-1.5">
									<label for="jenjang_jab" class="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										Jenjang Jabatan
									</label>
									<select
										id="jenjang_jab"
										bind:value={form.jenjang_jab_id}
										class="w-full bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-900 dark:text-zinc-100"
									>
										<option value="">Pilih Jenjang Jabatan</option>
										{#each filteredJenjangJabatanOptions as opt}
											<option value={opt.id}>{opt.jenjangjab}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Input
									label="Kelas Jabatan"
									type="number"
									bind:value={form.kelas_jabatan}
									placeholder="1 - 17 (Opsional)"
									error={fieldErrors.kelas_jabatan}
								/>
								<Input
									label="Kode Jabatan / BKN"
									bind:value={form.kode_jabatan}
									placeholder="Kode BKN jika ada..."
									error={fieldErrors.kode_jabatan}
								/>
							</div>
						</div>
					</div>

					<!-- Section: Peraturan & Status -->
					<div class="pt-3 pb-1 border-t border-zinc-200/80 dark:border-zinc-800">
						<div class="flex items-center gap-2 mb-3">
							<div class="w-2 h-2 rounded-full bg-amber-500"></div>
							<h3 class="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
								Dasar Hukum & Status
							</h3>
						</div>
						<div class="space-y-4">
							<div class="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4">
								<div class="sm:col-span-3">
									<Input
										label="Nomor Peraturan"
										bind:value={form.peraturan}
										placeholder="Contoh: Perbup No. 1 Tahun 2024"
										error={fieldErrors.peraturan}
									/>
								</div>
								<div class="sm:col-span-2">
									<Input
										label="Tanggal Peraturan"
										type="date"
										bind:value={form.tglPeraturan}
										onchange={handleTglPeraturanChange}
										error={fieldErrors.tglPeraturan}
									/>
								</div>
							</div>

							<div class="space-y-1">
								<label for="ket" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Keterangan</label>
								<textarea
									id="ket"
									bind:value={form.ket}
									placeholder="Keterangan tambahan..."
									rows="2"
									class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
								></textarea>
								{#if fieldErrors.ket}
									<p class="text-xs text-rose-500">{fieldErrors.ket}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<label class="text-xs font-bold uppercase tracking-wider text-zinc-400">Status Aktif</label>
								<div class="flex gap-4">
									<label class="flex items-center gap-2 cursor-pointer group">
										<input type="radio" bind:group={form.isAktif} value={1} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
										<span class="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-500 transition-colors">Aktif</span>
									</label>
									<label class="flex items-center gap-2 cursor-pointer group">
										<input type="radio" bind:group={form.isAktif} value={0} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
										<span class="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-500 transition-colors">Tidak Aktif</span>
									</label>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showModal = false} disabled={submitting}>Batal</Button>
				<Button variant="primary" onclick={handleSubmit} loading={submitting}>
					{isEditing ? 'Simpan Perubahan' : 'Tambah Baru'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<ConfirmDeleteModal 
	bind:show={showDeleteConfirm}
	title="Hapus Data?"
	message="Anda akan menghapus unit organisasi ini beserta hierarki di bawahnya jika ada."
	loading={deleteLoading}
	onConfirm={executeDelete}
/>
