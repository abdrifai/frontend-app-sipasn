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
	import UnorTreePickerItem from '$lib/components/referensi/UnorTreePickerItem.svelte';
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

	// Tree Selection & Preservation State
	let selectedId = $state(null);
	let expandedKeys = $state(new Set());
	let activeParentItem = $state(null);
	
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

	// Move / Transfer Unit State (Tree Picker)
	let showMoveModal = $state(false);
	let itemToMove = $state(null);
	let moveSubmitting = $state(false);
	let moveTargetType = $state('unor'); // 'unor' | 'instansi'
	let moveTargetParentId = $state('');
	let moveTargetInstansiId = $state('');
	let moveTreeData = $state([]);
	let loadingMoveTree = $state(false);
	let moveExpandedKeys = $state(new Set());
	let selectedTargetNode = $state(null);
	let moveSearchKeyword = $state('');
	let moveError = $state(null);

	// Reorder Modal State
	let showReorderModal = $state(false);
	let reorderParent = $state(null);
	let reorderItems = $state([]);
	let loadingReorder = $state(false);
	let reorderSubmitting = $state(false);
	let reorderError = $state(null);

	// Status Confirmation State
	let showStatusConfirm = $state(false);
	let pendingStatus = $state(null);

	function triggerStatusConfirm() {
		pendingStatus = form.isAktif === 1 ? 0 : 1;
		showStatusConfirm = true;
	}

	function confirmStatusChange() {
		if (pendingStatus !== null) {
			form.isAktif = pendingStatus;
			toast.info(`Status unit diset menjadi ${pendingStatus === 1 ? 'AKTIF' : 'NON AKTIF'}. Klik Simpan untuk memperbarui.`);
		}
		showStatusConfirm = false;
		pendingStatus = null;
	}

	let form = $state({
		id: '',
		kode: '',
		nmUnor: '',
		no_urut: '',
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

	function updateNodeInTree(items, id, updatedFields) {
		return items.map(node => {
			if (String(node.id) === String(id)) {
				return { ...node, ...updatedFields };
			}
			if (node.children && node.children.length > 0) {
				return { ...node, children: updateNodeInTree(node.children, id, updatedFields) };
			}
			return node;
		});
	}

	function removeNodeFromTree(items, id) {
		return items
			.filter(node => String(node.id) !== String(id))
			.map(node => {
				if (node.children && node.children.length > 0) {
					const newChildren = removeNodeFromTree(node.children, id);
					return {
						...node,
						children: newChildren,
						hasChildren: newChildren.length > 0
					};
				}
				return node;
			});
	}

	async function loadChildren(parentId, level) {
		try {
			const res = await api(`/ref-unor/tree?level=${level}&parentId=${parentId}`);
			const newChildren = res.data || [];
			
			// Deep recursive update that returns a new array to ensure reactivity,
			// while preserving existing loaded sub-children if present
			const updateItems = (items) => {
				return items.map(item => {
					if (String(item.id) === String(parentId) && item.level === level) {
						const mergedChildren = newChildren.map(nc => {
							const existing = (item.children || []).find(ec => String(ec.id) === String(nc.id) && ec.level === nc.level);
							if (existing && existing.children && existing.children.length > 0) {
								return { ...nc, children: existing.children, hasChildren: existing.hasChildren };
							}
							return nc;
						});
						return { ...item, hasChildren: mergedChildren.length > 0, children: mergedChildren };
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
				api('/ref-jabatan/jenis?limit=100&is_aktif=1'),
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

	// ID tetap Jabatan Administrasi (JA) dari tabel ref_jnsjab
	const JA_ID = '4a71c9b4-e57d-439d-8ccd-e8bf3ec83de5';

	function resetForm() {
		isChangingJabatan = false;
		// Default ke Jabatan Administrasi (JA) berdasarkan ID, fallback ke pencarian nama
		const defAdm = jenisJabatanOptions.find(j => j.id === JA_ID)
			|| jenisJabatanOptions.find(j => (j.jnsjab || '').toUpperCase().includes('ADMINISTRASI'))
			|| jenisJabatanOptions.filter(j => j.is_aktif === 1)[0];

		form = {
			id: '', kode: '', nmUnor: '', no_urut: '',
			jab_id: '', nm_jab: '',
			kategori_jab: 'PELAKSANA',
			eselon_id: '',
			jns_jab_id: defAdm ? defAdm.id : '',
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
		activeParentItem = null;
		currentLevel = 'induk';
		resetForm();
		showModal = true;
	}

	function handleAddChild(parent) {
		isEditing = false;
		activeParentItem = parent;
		selectedId = parent.id;
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
		selectedId = item.id;
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

		form.isAktif = (form.isAktif === 1 || form.isAktif === '1' || form.isAktif === true) ? 1 : 0;
		form.no_urut = form.no_urut !== undefined && form.no_urut !== null ? form.no_urut : (item.no_urut || '');

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
				no_urut: form.no_urut !== '' && form.no_urut !== null && form.no_urut !== undefined ? parseInt(form.no_urut, 10) : undefined,
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
				const res = await api(`${endpoint}/${id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				toast.success('Berhasil diperbarui');

				const selectedEselon = eselonOptions.find(e => e.id === form.eselon_id);
				const selectedJenjang = jenjangJabatanOptions.find(j => String(j.id) === String(form.jenjang_jab_id));
				const selectedJnsJab = jenisJabatanOptions.find(j => j.id === form.jns_jab_id);

				// In-place update in treeData without resetting tree
				treeData = updateNodeInTree(treeData, id, {
					nmUnor: form.nmUnor,
					no_urut: form.no_urut ? parseInt(form.no_urut, 10) : undefined,
					nm_jab: form.nm_jab,
					isAktif: form.isAktif,
					kategori_jab: form.kategori_jab,
					eselon_id: form.eselon_id,
					eselon: selectedEselon?.eselon || null,
					jnsUnor_id: form.jnsUnor_id,
					jns_jab_id: form.jns_jab_id,
					jns_jab: selectedJnsJab?.jnsjab || null,
					jenjang_jab_id: form.jenjang_jab_id,
					jenjang_jab: selectedJenjang?.jenjangjab || null,
					bup: form.bup,
					ket: form.ket,
					...(res?.data || {})
				});
				selectedId = id;
			} else {
				const res = await api(endpoint, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success('Berhasil ditambahkan');

				const newRecord = res?.data;

				if (activeParentItem) {
					// Mark parent as expanded
					const parentKey = `${activeParentItem.level}-${activeParentItem.id}`;
					expandedKeys.add(parentKey);
					expandedKeys = new Set(expandedKeys);

					// Refresh only this parent's branch
					await loadChildren(activeParentItem.id, activeParentItem.level);
					if (newRecord?.id) {
						selectedId = newRecord.id;
					}
				} else {
					// Root node added
					if (selectedUnorIndukId) {
						await handleUnorIndukFilter();
					} else {
						await loadTree();
					}
					if (newRecord?.id) {
						selectedId = newRecord.id;
					}
				}
			}
			showModal = false;
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

	let predictedNewLevel = $derived.by(() => {
		if (!selectedTargetNode) return '-';
		if (selectedTargetNode.level === 'instansi') return 'induk (Unit Organisasi Induk)';
		if (selectedTargetNode.level === 'induk') return 'unor (Unit Organisasi)';
		if (selectedTargetNode.level === 'unor') return 'sub (Sub Unit Organisasi)';
		if (selectedTargetNode.level === 'sub') return 'sub-sub (Sub Unit Organisasi Sub)';
		return '-';
	});

	let displayedMoveTreeData = $derived.by(() => {
		if (!moveSearchKeyword.trim()) return moveTreeData;
		const kw = moveSearchKeyword.toLowerCase().trim();

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

		return filterNodes(moveTreeData);
	});

	async function loadMoveTreeData(excludeId) {
		loadingMoveTree = true;
		moveTreeData = [];
		moveExpandedKeys = new Set();
		try {
			const kode = selectedInstansiKode || 7209;
			const res = await api(`/ref-unor/tree?kode=${kode}&exclude_id=${excludeId}`);
			const roots = res.data || [];
			
			if (roots.length > 0) {
				const root = roots[0];
				const rootKey = `${root.level}-${root.id}`;
				moveExpandedKeys.add(rootKey);
				moveExpandedKeys = new Set(moveExpandedKeys);

				const childRes = await api(`/ref-unor/tree?level=${root.level}&parentId=${root.id}&exclude_id=${excludeId}`);
				root.children = childRes.data || [];
				root.hasChildren = (root.children.length > 0);
				moveTreeData = [root];
			} else {
				moveTreeData = roots;
			}
		} catch (err) {
			console.error('Failed to load move tree:', err);
			toast.error('Gagal memuat pohon unit tujuan');
		} finally {
			loadingMoveTree = false;
		}
	}

	async function loadMoveChildren(parentId, level) {
		if (!itemToMove) return;
		try {
			const res = await api(`/ref-unor/tree?level=${level}&parentId=${parentId}&exclude_id=${itemToMove.id}`);
			const newChildren = res.data || [];

			const updateItems = (items) => {
				return items.map(item => {
					if (String(item.id) === String(parentId) && item.level === level) {
						return { ...item, hasChildren: newChildren.length > 0, children: newChildren };
					}
					if (item.children && item.children.length > 0) {
						return { ...item, children: updateItems(item.children) };
					}
					return item;
				});
			};

			moveTreeData = updateItems(moveTreeData);
		} catch (err) {
			console.error('Failed to load branch:', err);
			toast.error('Gagal memuat cabang');
		}
	}

	function handleSelectTargetNode(node) {
		selectedTargetNode = node;
		if (node.level === 'instansi') {
			moveTargetType = 'instansi';
			moveTargetInstansiId = node.id;
			moveTargetParentId = '';
		} else {
			moveTargetType = 'unor';
			moveTargetParentId = node.id;
			moveTargetInstansiId = node.instansi_id || '';
		}
	}

	async function handleOpenMove(item) {
		itemToMove = item;
		moveTargetType = 'unor';
		moveTargetParentId = '';
		moveTargetInstansiId = item.instansi_id || '';
		selectedTargetNode = null;
		moveSearchKeyword = '';
		moveError = null;
		showMoveModal = true;
		await loadMoveTreeData(item.id);
	}

	async function handleExecuteMove() {
		if (!itemToMove) return;

		if (!selectedTargetNode) {
			moveError = 'Silakan klik dan pilih salah satu unit/instansi tujuan pada pohon organisasi di atas.';
			return;
		}

		moveSubmitting = true;
		moveError = null;

		try {
			const payload = {
				id: itemToMove.id,
				target_parent_id: selectedTargetNode.level === 'instansi' ? null : selectedTargetNode.id,
				target_type: selectedTargetNode.level === 'instansi' ? 'instansi' : 'unor',
				target_instansi_id: selectedTargetNode.level === 'instansi' ? selectedTargetNode.id : (selectedTargetNode.instansi_id || null)
			};

			await api('/ref-unor/move', {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			toast.success(`Unit "${itemToMove.nmUnor}" berhasil dipindahkan ke bawah "${selectedTargetNode.nmUnor || selectedTargetNode.instansi}".`);
			showMoveModal = false;
			itemToMove = null;
			selectedTargetNode = null;

			// Refresh main tree
			if (selectedUnorIndukId) {
				await handleUnorIndukFilter();
			} else {
				await loadTree();
			}
		} catch (err) {
			moveError = err.message || 'Gagal memindahkan unit organisasi.';
			toast.error(moveError);
		} finally {
			moveSubmitting = false;
		}
	}

	// --- REORDER HANDLERS ---

	async function handleOpenReorder(parent = null) {
		reorderParent = parent;
		reorderItems = [];
		reorderError = null;
		loadingReorder = true;
		showReorderModal = true;

		try {
			let items = [];
			if (!parent || parent.level === 'instansi') {
				const res = await api(`/ref-unor/induk?limit=1000&instansi_kode=${parent?.kode || selectedInstansiKode}`);
				items = res?.data || [];
			} else if (parent.level === 'induk') {
				const res = await api(`/ref-unor?parent_id=${parent.id}&limit=1000`);
				items = res?.data || [];
			} else if (parent.level === 'unor') {
				const res = await api(`/ref-unor/sub?unor_id=${parent.id}&limit=1000`);
				items = res?.data || [];
			} else if (parent.level === 'sub') {
				const res = await api(`/ref-unor/sub-sub?subUnor_id=${parent.id}&limit=1000`);
				items = res?.data || [];
			}

			reorderItems = items.map((item, idx) => ({
				...item,
				no_urut: item.no_urut !== undefined && item.no_urut !== null ? item.no_urut : (idx + 1)
			})).sort((a, b) => (a.no_urut - b.no_urut) || (a.nmUnor || '').localeCompare(b.nmUnor || ''));
		} catch (err) {
			reorderError = err.message || 'Gagal memuat daftar unit organisasi';
		} finally {
			loadingReorder = false;
		}
	}

	function moveReorderItemUp(index) {
		if (index <= 0) return;
		const newArr = [...reorderItems];
		const temp = newArr[index];
		newArr[index] = newArr[index - 1];
		newArr[index - 1] = temp;
		reorderItems = newArr.map((it, idx) => ({ ...it, no_urut: idx + 1 }));
	}

	function moveReorderItemDown(index) {
		if (index >= reorderItems.length - 1) return;
		const newArr = [...reorderItems];
		const temp = newArr[index];
		newArr[index] = newArr[index + 1];
		newArr[index + 1] = temp;
		reorderItems = newArr.map((it, idx) => ({ ...it, no_urut: idx + 1 }));
	}

	async function handleSaveReorder() {
		if (reorderItems.length === 0) return;
		reorderSubmitting = true;
		reorderError = null;

		try {
			const payload = {
				items: reorderItems.map((item, idx) => ({
					id: item.id,
					no_urut: idx + 1
				}))
			};

			await api('/ref-unor/reorder', {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			toast.success('Urutan unit organisasi berhasil diperbarui.');
			showReorderModal = false;

			// Refresh branch or root tree
			if (reorderParent && reorderParent.level !== 'instansi') {
				await loadChildren(reorderParent.id, reorderParent.level);
			} else if (selectedUnorIndukId) {
				await handleUnorIndukFilter();
			} else {
				await loadTree();
			}
		} catch (err) {
			reorderError = err.message || 'Gagal menyimpan urutan unit organisasi.';
			toast.error(reorderError);
		} finally {
			reorderSubmitting = false;
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

			// In-place remove from treeData
			treeData = removeNodeFromTree(treeData, itemToDelete.id);
			selectedId = null;
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

			{#if selectedUnorIndukId || searchKeyword}
				<div class="flex gap-2">
					<Button variant="ghost" onclick={clearUnorIndukFilter} title="Reset Filter Unor Induk & Pencarian">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
						<span>Reset</span>
					</Button>
				</div>
			{/if}
		</div>
	</div>

	<Card>
		<div class="mb-4 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-4">
			<div class="flex items-center gap-2">
				<div class="w-6"></div>
				<div>
					Struktur Organisasi
					{#if selectedUnorIndukId}
						<span class="ml-2 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold normal-case">
							Terfilter Unor Induk
						</span>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => handleOpenReorder(selectedUnorIndukId ? { id: selectedUnorIndukId, level: 'induk', nmUnor: 'Unor Induk Terpilih' } : null)}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold normal-case tracking-normal bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm"
					title="Atur Urutan Unit Organisasi"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m3 16 4 4 4-4"/>
						<path d="M7 20V4"/>
						<path d="m21 8-4-4-4 4"/>
						<path d="M17 4v16"/>
					</svg>
					<span>Atur Urutan</span>
				</button>
				<div class="hidden md:block pr-2">Aksi</div>
			</div>
		</div>

		{#if loading}
			<LoadingState message="Membangun pohon organisasi..." />
		{:else if error}
			<ErrorState message={error} onRetry={loadTree} />
		{:else if displayedTreeData.length === 0}
			<EmptyState message="Tidak ada unit organisasi yang sesuai dengan filter/pencarian." />
		{:else}
			<div class="space-y-1">
				{#each displayedTreeData as item (item.id)}
					<UnorTreeItem 
						{item} 
						onEdit={handleEdit} 
						onDelete={handleDelete} 
						onAddChild={handleAddChild} 
						onMove={handleOpenMove}
						onReorder={handleOpenReorder}
						{loadChildren}
						{selectedId}
						onSelect={(selectedItem) => { selectedId = selectedItem.id; }}
						bind:expandedKeys
					/>
				{/each}
			</div>
		{/if}
	</Card>
</div>

{#if showModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-3xl lg:max-w-4xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
				<!-- Title & Inline Toggle Status -->
				<div class="flex flex-wrap items-center gap-3">
					<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50">
						{#if isEditing}Ubah{:else}Tambah{/if} 
						{#if currentLevel === 'induk'}Unit Organisasi Induk
						{:else if currentLevel === 'unor'}Unit Organisasi
						{:else if currentLevel === 'sub'}Sub Unit Organisasi
						{:else if currentLevel === 'sub-sub'}Sub Unit Organisasi Sub
						{:else}{currentLevel.toUpperCase()}{/if}
					</h2>

					<!-- Toggle Switch Status (Aktif / Non Aktif) -->
					<div class="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200 {form.isAktif === 1 ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'}">
						<button
							type="button"
							role="switch"
							aria-checked={form.isAktif === 1}
							onclick={triggerStatusConfirm}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {form.isAktif === 1 ? 'bg-emerald-500' : 'bg-rose-400'}"
						>
							<span
								class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out {form.isAktif === 1 ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>
						<span class="text-xs font-black tracking-wider uppercase {form.isAktif === 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">
							{form.isAktif === 1 ? 'Aktif' : 'Non Aktif'}
						</span>
					</div>
				</div>

				<button onclick={() => showModal = false} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors">
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

				<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<div class="sm:col-span-3">
						<Input
							label={currentLevel === 'induk' ? 'Nama Unit Organisasi Induk' : (currentLevel === 'sub' ? 'Nama Sub Unit Organisasi' : (currentLevel === 'sub-sub' ? 'Nama Sub Unit Organisasi Sub' : 'Nama Unit Organisasi'))}
							bind:value={form.nmUnor}
							placeholder={currentLevel === 'induk' ? 'Nama Lengkap Unit Organisasi Induk' : 'Nama Lengkap Unit Organisasi'}
							error={fieldErrors.nmUnor}
							onblur={handleNmUnorBlur}
							required
						/>
					</div>
					<div class="sm:col-span-1">
						<Input
							label="Nomor Urut"
							type="number"
							min="1"
							bind:value={form.no_urut}
							placeholder="1, 2, 3..."
							error={fieldErrors.no_urut}
						/>
					</div>
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
										{#each jenisJabatanOptions.filter(opt => opt.is_aktif === 1) as opt}
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
								<label for="ket" class="text-xs font-bold uppercase tracking-wider text-zinc-400">Tentang Peraturan / Keterangan</label>
								<textarea
									id="ket"
									bind:value={form.ket}
									placeholder="Penjelasan tentang peraturan atau keterangan tambahan..."
									rows="2"
									class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
								></textarea>
								{#if fieldErrors.ket}
									<p class="text-xs text-rose-500">{fieldErrors.ket}</p>
								{/if}
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

<!-- Modal Konfirmasi Perubahan Status -->
{#if showStatusConfirm}
	<div class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center">
			<div class="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center {pendingStatus === 1 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}">
				{#if pendingStatus === 1}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				{/if}
			</div>

			<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
				Konfirmasi Perubahan Status
			</h3>

			<p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
				Apakah Anda yakin ingin mengalihkan status unit organisasi ini menjadi 
				<b class={pendingStatus === 1 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400 font-black'}>
					{pendingStatus === 1 ? 'AKTIF' : 'NON AKTIF'}
				</b>?
			</p>

			<div class="pt-2 flex items-center justify-center gap-3">
				<Button variant="secondary" onclick={() => { showStatusConfirm = false; pendingStatus = null; }}>
					Batal
				</Button>
				<Button variant={pendingStatus === 1 ? 'primary' : 'danger'} onclick={confirmStatusChange}>
					Ya, Ubah Status
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Atur Urutan Unit (Reorder Modal) -->
{#if showReorderModal}
	<div class="fixed inset-0 z-[75] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="m3 16 4 4 4-4"/>
							<path d="M7 20V4"/>
							<path d="m21 8-4-4-4 4"/>
							<path d="M17 4v16"/>
						</svg>
					</div>
					<div>
						<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
							Atur Urutan Unit Organisasi
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							{#if reorderParent}
								Di bawah: <b class="text-zinc-800 dark:text-zinc-200">{reorderParent.nmUnor || reorderParent.instansi}</b>
							{:else}
								Tingkat: <b class="text-zinc-800 dark:text-zinc-200">Unit Organisasi Induk (Pemerintah Kab. Tojo Una-Una)</b>
							{/if}
						</p>
					</div>
				</div>

				<button onclick={() => showReorderModal = false} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
				{#if reorderError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
						{reorderError}
					</div>
				{/if}

				<div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-2 text-xs">
					<span class="text-indigo-900 dark:text-indigo-200 font-medium">
						💡 Gunakan tombol panah <b>Naik (▲)</b> dan <b>Turun (▼)</b> untuk menyusun posisi nomor urut. Nomor urut otomatis berurutan dari 1 sampai akhir.
					</span>
				</div>

				{#if loadingReorder}
					<div class="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
						<span class="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></span>
						<span>Memuat daftar unit...</span>
					</div>
				{:else if reorderItems.length === 0}
					<div class="py-12 text-center text-xs text-zinc-400">
						Tidak ada unit organisasi pada tingkat ini.
					</div>
				{:else}
					<div class="space-y-2">
						{#each reorderItems as item, index (item.id)}
							<div class="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 transition-all">
								<!-- Number Badge & Name -->
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/60">
										{index + 1}
									</div>
									<div class="min-w-0 flex-1">
										<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 block truncate">
											{item.nmUnor || item.instansi}
										</span>
										{#if item.nm_jab && item.nm_jab !== '-'}
											<span class="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
												{item.nm_jab}
											</span>
										{/if}
									</div>
								</div>

								<!-- Move Buttons -->
								<div class="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onclick={() => moveReorderItemUp(index)}
										disabled={index === 0}
										class="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
										title="Pindahkan Ke Atas"
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
									</button>
									<button
										type="button"
										onclick={() => moveReorderItemDown(index)}
										disabled={index === reorderItems.length - 1}
										class="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
										title="Pindahkan Ke Bawah"
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => showReorderModal = false} disabled={reorderSubmitting}>
					Batal
				</Button>
				<Button 
					variant="primary" 
					onclick={handleSaveReorder} 
					loading={reorderSubmitting}
					disabled={reorderItems.length === 0}
				>
					Simpan Urutan
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Pindahkan Unit Organisasi -->
{#if showMoveModal && itemToMove}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M8 3 4 7l4 4"/>
							<path d="M4 7h16"/>
							<path d="m16 21 4-4-4-4"/>
							<path d="M20 17H4"/>
						</svg>
					</div>
					<div>
						<h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
							Pindahkan Unit Organisasi
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">
							Ubah posisi atau atasan hierarki unit dalam struktur organisasi
						</p>
					</div>
				</div>

				<button onclick={() => { showMoveModal = false; itemToMove = null; }} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
				{#if moveError}
					<div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
						{moveError}
					</div>
				{/if}

				<!-- Info Unit yang Akan Dipindahkan -->
				<div class="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-2">
					<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Unit Yang Dipindahkan:</span>
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2.5 min-w-0">
							<div class="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></div>
							<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
								{itemToMove.nmUnor}
							</span>
						</div>
						<span class="px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
							Level Saat Ini: {itemToMove.level}
						</span>
					</div>
					{#if itemToMove.nm_jab && itemToMove.nm_jab !== '-'}
						<p class="text-xs text-zinc-500 dark:text-zinc-400 pl-5 truncate">
							Jabatan: {itemToMove.nm_jab}
						</p>
					{/if}
				</div>

				<!-- Target Picker (Interactive Hierarchical Tree View) -->
				<div class="space-y-2.5">
					<div class="flex items-center justify-between flex-wrap gap-2">
						<label for="search-target-tree" class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
							Pilih Atasan / Unit Organisasi Tujuan <span class="text-rose-500">*</span>
						</label>
						<span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1.5">
							<span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
							Pemerintah Kab. Tojo Una-Una
						</span>
					</div>

					<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
						Klik nama unit atau instansi pada struktur di bawah untuk memilih atasan baru:
					</p>

					<!-- Search Bar in Tree Picker -->
					<div class="relative">
						<input
							id="search-target-tree"
							type="text"
							placeholder="Cari unit tujuan (misal: Kecamatan Ampana Kota)..."
							bind:value={moveSearchKeyword}
							class="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
						/>
						<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>

					<!-- Scrollable Tree Container -->
					<div class="max-h-72 overflow-y-auto custom-scrollbar p-2.5 bg-zinc-50/60 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
						{#if loadingMoveTree}
							<div class="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
								<span class="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
								<span>Membangun pohon hierarki tujuan...</span>
							</div>
						{:else if displayedMoveTreeData.length === 0}
							<div class="py-8 text-center text-xs text-zinc-400">
								Tidak ada unit organisasi yang cocok dengan pencarian.
							</div>
						{:else}
							{#each displayedMoveTreeData as item (item.id)}
								<UnorTreePickerItem
									{item}
									selectedTargetId={selectedTargetNode?.id}
									onSelectTarget={handleSelectTargetNode}
									loadChildren={loadMoveChildren}
									bind:expandedKeys={moveExpandedKeys}
								/>
							{/each}
						{/if}
					</div>

					{#if selectedTargetNode}
						<div class="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs flex items-center justify-between gap-3">
							<div class="min-w-0">
								<span class="font-bold text-indigo-900 dark:text-indigo-200 block truncate">
									Atasan Tujuan Terpilih: <b>{selectedTargetNode.nmUnor || selectedTargetNode.instansi}</b>
								</span>
								<span class="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
									Tingkat: {selectedTargetNode.level.toUpperCase()}
								</span>
							</div>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shrink-0">
								SIAP PINDAH
							</span>
						</div>
					{/if}
				</div>

				<!-- Live Preview Perubahan Hierarki -->
				<div class="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-2">
					<span class="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
						<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>
						Ringkasan Perubahan:
					</span>
					<div class="text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
						<p>
							• Unit <b>{itemToMove.nmUnor}</b> akan dipindahkan ke bawah: 
							<b class="text-indigo-600 dark:text-indigo-400">
								{selectedTargetNode ? (selectedTargetNode.nmUnor || selectedTargetNode.instansi) : '(Klik salah satu unit pada pohon di atas)'}
							</b>
						</p>
						<p>
							• Tingkat level akan disesuaikan menjadi: 
							<span class="font-bold text-emerald-600 dark:text-emerald-400">{predictedNewLevel}</span>
						</p>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
				<Button variant="ghost" onclick={() => { showMoveModal = false; itemToMove = null; }} disabled={moveSubmitting}>
					Batal
				</Button>
				<Button 
					variant="primary" 
					onclick={handleExecuteMove} 
					loading={moveSubmitting}
					disabled={!selectedTargetNode}
				>
					Konfirmasi Pindahkan Unit
				</Button>
			</div>
		</div>
	</div>
{/if}


