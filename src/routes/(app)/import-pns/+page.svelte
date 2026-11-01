<script>
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore';
	import { onMount } from 'svelte';

	// Active Tab State: 'pegawai', 'rekap', or 'rekap-jenis'
	let activeTab = $state('pegawai');

	// Data states (List Pegawai)
	let pnsList = $state([]);
	let summary = $state({ totalRecords: 0, recentBatches: [] });
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let selectedBatch = $state('');
	let selectedStatus = $state('');
	let selectedJenisJabatan = $state('');
	let page = $state(1);
	let limit = $state(10);
	let totalPages = $state(1);
	let totalRecords = $state(0);

	// Rekap Jabatan states
	let rekapList = $state([]);
	let rekapLoading = $state(false);
	let rekapError = $state(null);
	let rekapSearch = $state('');
	let selectedRekapJenis = $state('');
	let rekapPage = $state(1);
	let rekapLimit = $state(15);
	let rekapTotalPages = $state(1);
	let rekapTotalRecords = $state(0);
	let rekapMode = $state('gabungan'); // 'gabungan' (default: Guru, Perawat digabung) atau 'detail'
	let rekapSummary = $state(null);

	// Rekap Jenis Jabatan states
	let rekapJenisList = $state([]);
	let rekapJenisSummary = $state(null);
	let rekapJenisLoading = $state(false);
	let rekapJenisError = $state(null);
	let rekapJenisSearch = $state('');
	let rekapJenisPage = $state(1);
	let rekapJenisLimit = $state(15);
	let rekapJenisTotalPages = $state(1);
	let rekapJenisTotalRecords = $state(0);
	let rekapJenisOverall = $state(0);

	// Statistik states (6 Rekap Data Statistik)
	let statData = $state(null);
	let statLoading = $state(false);
	let statError = $state(null);
	let activeStatTab = $state('gender'); // 'gender', 'golongan', 'pendidikan', 'eselon_formasi', 'eselon_gender', 'eselon_pendidikan'
	let syncLoading = $state(false);

	async function handleSyncEselon() {
		syncLoading = true;
		try {
			const res = await api('/import-pns/sync-eselon', { method: 'POST' });
			toast.success(res.message || 'Sinkronisasi eselon jabatan selesai');
			await Promise.all([loadData(), loadRekap(), loadRekapJenis(), loadStatistik()]);
		} catch (err) {
			toast.error(err.message || 'Gagal menyelaraskan eselon');
		} finally {
			syncLoading = false;
		}
	}

	// State untuk Inline Expansion Rincian Pegawai Eselon
	let expandedEselons = $state({});
	let eselonPegawaiData = $state({});

	async function toggleExpandEselon(eselonName) {
		const isCurrentlyOpen = !!expandedEselons[eselonName];
		expandedEselons = {
			...expandedEselons,
			[eselonName]: !isCurrentlyOpen
		};

		// Jika membuka dan data belum di-fetch atau kosong, panggil API drilldown
		if (!isCurrentlyOpen && (!eselonPegawaiData[eselonName] || eselonPegawaiData[eselonName].list.length === 0)) {
			eselonPegawaiData = {
				...eselonPegawaiData,
				[eselonName]: { loading: true, list: [], error: null }
			};

			try {
				const queryParams = new URLSearchParams({
					stat_type: 'eselon',
					eselon: eselonName,
					batch_id: selectedBatch || '',
					page: '1',
					limit: '250'
				});
				const res = await api(`/import-pns/statistik/drilldown?${queryParams.toString()}`);
				eselonPegawaiData = {
					...eselonPegawaiData,
					[eselonName]: {
						loading: false,
						list: res.data || [],
						total: res.meta?.total || 0,
						error: null
					}
				};
			} catch (err) {
				eselonPegawaiData = {
					...eselonPegawaiData,
					[eselonName]: {
						loading: false,
						list: [],
						total: 0,
						error: err.message || 'Gagal memuat rincian pegawai'
					}
				};
			}
		}
	}

	function exportSingleEselonCsv(eselonName, list) {
		if (!list || list.length === 0) return;
		let csvContent = 'No,NIP,Nama,Gelar Depan,Gelar Belakang,Jabatan,Eselon,Unit Organisasi,Golongan,Jenis Kelamin,Pendidikan\n';
		list.forEach((item, index) => {
			const cleanNip = (item.nip_baru || '').replace(/^'+/, '');
			csvContent += `${index + 1},'${cleanNip}',"${item.nama || ''}","${item.gelar_depan || ''}","${item.gelar_belakang || ''}","${item.jabatan_nama || ''}","${item.eselon_nama || eselonName}","${item.unor_nama || ''}","${item.gol_akhir_nama || ''}","${item.jenis_kelamin || ''}","${item.tingkat_pendidikan_nama || ''}"\n`;
		});

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `rincian_pegawai_eselon_${eselonName}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function exportDrilldownCsv() {
		if (!drilldownList || drilldownList.length === 0) return;
		let csvContent = 'No,NIP,Nama,Gelar Depan,Gelar Belakang,Jabatan,Eselon,Unit Organisasi,Golongan,Jenis Kelamin,Pendidikan\n';
		drilldownList.forEach((item, index) => {
			const cleanNip = (item.nip_baru || '').replace(/^'+/, '');
			csvContent += `${index + 1},'${cleanNip}',"${item.nama || ''}","${item.gelar_depan || ''}","${item.gelar_belakang || ''}","${item.jabatan_nama || ''}","${item.eselon_nama || ''}","${item.unor_nama || ''}","${item.gol_akhir_nama || ''}","${item.jenis_kelamin || ''}","${item.tingkat_pendidikan_nama || ''}"\n`;
		});

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		const safeTitle = (drilldownTitle || 'rincian_pegawai').toLowerCase().replace(/[^a-z0-9]/g, '_');
		link.setAttribute('download', `${safeTitle}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	// Drilldown modal states
	let showDrilldownModal = $state(false);
	let drilldownTitle = $state('');
	let drilldownParams = $state(null);
	let drilldownList = $state([]);
	let drilldownLoading = $state(false);
	let drilldownPage = $state(1);
	let drilldownLimit = $state(10);
	let drilldownTotalPages = $state(1);
	let drilldownTotalRecords = $state(0);
	let drilldownSearch = $state('');

	// Upload states
	let dragOver = $state(false);
	let selectedFile = $state(null);
	let uploadLoading = $state(false);
	let uploadProgress = $state(0);
	let uploadResult = $state(null);

	// Detail modal state
	let showDetailModal = $state(false);
	let activeDetail = $state(null);

	// Delete state
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state(null);
	let isBatchDelete = $state(false);
	let deleteLoading = $state(false);

	async function loadData() {
		loading = true;
		error = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				limit: String(limit),
				search: search.trim(),
				batch_id: selectedBatch,
				status_cpns_pns: selectedStatus,
				jenis_jabatan_nama: selectedJenisJabatan
			});

			const [resList, resSummary] = await Promise.all([
				api(`/import-pns?${queryParams.toString()}`),
				api('/import-pns/summary')
			]);

			pnsList = resList.data;
			totalPages = resList.meta.totalPages || 1;
			totalRecords = resList.meta.total || 0;
			summary = resSummary.data || { totalRecords: 0, recentBatches: [] };
		} catch (err) {
			error = err.message || 'Gagal memuat data import PNS';
		} finally {
			loading = false;
		}
	}

	async function loadRekap() {
		rekapLoading = true;
		rekapError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(rekapPage),
				limit: String(rekapLimit),
				search: rekapSearch.trim(),
				batch_id: selectedBatch,
				jenis_jabatan_nama: 'Jabatan Fungsional',
				mode: rekapMode
			});

			const res = await api(`/import-pns/rekap-jabatan?${queryParams.toString()}`);
			rekapList = res.data || [];
			rekapTotalPages = res.meta?.totalPages || 1;
			rekapTotalRecords = res.meta?.total || 0;
			rekapSummary = res.summary || null;
		} catch (err) {
			rekapError = err.message || 'Gagal memuat rekapitulasi per jabatan';
		} finally {
			rekapLoading = false;
		}
	}

	function setRekapMode(mode) {
		rekapMode = mode;
		rekapPage = 1;
		loadRekap();
	}

	function exportRekapCsv() {
		if (!rekapList || rekapList.length === 0) return;
		let csvContent = 'No,Nama Formasi / Kelompok,Jenis Jabatan,Laki-Laki (Ahli),Laki-Laki (Terampil),Total Laki-Laki,Perempuan (Ahli),Perempuan (Terampil),Total Perempuan,Total Ahli,Total Terampil,Total Pegawai\n';
		rekapList.forEach((row, idx) => {
			const no = (rekapPage - 1) * rekapLimit + idx + 1;
			const nama = `"${(row.jabatan_nama || '').replace(/"/g, '""')}"`;
			const jenis = `"${(row.jenis_jabatan_nama || '').replace(/"/g, '""')}"`;
			const lAhli = row.laki_laki?.ahli ?? 0;
			const lTerampil = row.laki_laki?.terampil ?? 0;
			const lTotal = row.laki_laki?.total ?? 0;
			const pAhli = row.perempuan?.ahli ?? 0;
			const pTerampil = row.perempuan?.terampil ?? 0;
			const pTotal = row.perempuan?.total ?? 0;
			const totAhli = row.total_ahli ?? 0;
			const totTerampil = row.total_terampil ?? 0;
			const totPeg = row.total_pegawai ?? 0;
			csvContent += `${no},${nama},${jenis},${lAhli},${lTerampil},${lTotal},${pAhli},${pTerampil},${pTotal},${totAhli},${totTerampil},${totPeg}\n`;
		});
		if (rekapSummary) {
			const lAhli = rekapSummary.laki_laki?.ahli ?? 0;
			const lTerampil = rekapSummary.laki_laki?.terampil ?? 0;
			const lTotal = rekapSummary.laki_laki?.total ?? 0;
			const pAhli = rekapSummary.perempuan?.ahli ?? 0;
			const pTerampil = rekapSummary.perempuan?.terampil ?? 0;
			const pTotal = rekapSummary.perempuan?.total ?? 0;
			const totAhli = rekapSummary.total_ahli ?? 0;
			const totTerampil = rekapSummary.total_terampil ?? 0;
			const totPeg = rekapSummary.total_pegawai ?? 0;
			csvContent += `,"TOTAL KESELURUHAN",,${lAhli},${lTerampil},${lTotal},${pAhli},${pTerampil},${pTotal},${totAhli},${totTerampil},${totPeg}\n`;
		}
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `rekap_formasi_jf_${rekapMode}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function exportRekapJenisCsv() {
		if (!rekapJenisList || rekapJenisList.length === 0) return;
		let csvContent = 'No,Jenis Jabatan,Laki-Laki (PNS),Laki-Laki (CPNS),Total Laki-Laki,Perempuan (PNS),Perempuan (CPNS),Total Perempuan,Total PNS,Total CPNS,Total Pegawai,Proporsi (%)\n';
		rekapJenisList.forEach((row, idx) => {
			const no = (rekapJenisPage - 1) * rekapJenisLimit + idx + 1;
			const jenis = `"${(row.jenis_jabatan_nama || '').replace(/"/g, '""')}"`;
			const lPns = row.laki_laki?.pns ?? 0;
			const lCpns = row.laki_laki?.cpns ?? 0;
			const lTotal = row.laki_laki?.total ?? 0;
			const pPns = row.perempuan?.pns ?? 0;
			const pCpns = row.perempuan?.cpns ?? 0;
			const pTotal = row.perempuan?.total ?? 0;
			const totPns = row.jumlah_pns ?? 0;
			const totCpns = row.jumlah_cpns ?? 0;
			const totPeg = row.total_pegawai ?? 0;
			const persen = `${row.persentase}%`;
			csvContent += `${no},${jenis},${lPns},${lCpns},${lTotal},${pPns},${pCpns},${pTotal},${totPns},${totCpns},${totPeg},${persen}\n`;
		});
		if (rekapJenisSummary) {
			const lPns = rekapJenisSummary.laki_laki?.pns ?? 0;
			const lCpns = rekapJenisSummary.laki_laki?.cpns ?? 0;
			const lTotal = rekapJenisSummary.laki_laki?.total ?? 0;
			const pPns = rekapJenisSummary.perempuan?.pns ?? 0;
			const pCpns = rekapJenisSummary.perempuan?.cpns ?? 0;
			const pTotal = rekapJenisSummary.perempuan?.total ?? 0;
			const totPns = rekapJenisSummary.jumlah_pns ?? 0;
			const totCpns = rekapJenisSummary.jumlah_cpns ?? 0;
			const totPeg = rekapJenisSummary.total_pegawai ?? 0;
			csvContent += `,"TOTAL KESELURUHAN",${lPns},${lCpns},${lTotal},${pPns},${pCpns},${pTotal},${totPns},${totCpns},${totPeg},100%\n`;
		}
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'rekap_per_jenis_jabatan_gender.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	async function loadRekapJenis() {
		rekapJenisLoading = true;
		rekapJenisError = null;
		try {
			const queryParams = new URLSearchParams({
				page: String(rekapJenisPage),
				limit: String(rekapJenisLimit),
				search: rekapJenisSearch.trim(),
				batch_id: selectedBatch
			});

			const res = await api(`/import-pns/rekap-jenis-jabatan?${queryParams.toString()}`);
			rekapJenisList = res.data || [];
			rekapJenisSummary = res.summary || null;
			rekapJenisTotalPages = res.meta.totalPages || 1;
			rekapJenisTotalRecords = res.meta.total || 0;
			rekapJenisOverall = res.meta.totalRecordsOverall || 0;
		} catch (err) {
			rekapJenisError = err.message || 'Gagal memuat rekapitulasi jenis jabatan';
		} finally {
			rekapJenisLoading = false;
		}
	}

	async function loadStatistik() {
		statLoading = true;
		statError = null;
		try {
			const queryParams = new URLSearchParams();
			if (selectedBatch) queryParams.append('batch_id', selectedBatch);
			const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
			const res = await api(`/import-pns/statistik${queryString}`);
			statData = res.data;
		} catch (err) {
			statError = err.message || 'Gagal memuat data statistik';
		} finally {
			statLoading = false;
		}
	}

	function openDrilldown(params, title) {
		drilldownTitle = title;
		drilldownParams = params;
		drilldownPage = 1;
		drilldownSearch = '';
		showDrilldownModal = true;
		loadDrilldownData();
	}

	async function loadDrilldownData() {
		if (!drilldownParams) return;
		drilldownLoading = true;
		try {
			const queryParams = new URLSearchParams({
				...drilldownParams,
				batch_id: selectedBatch || '',
				search: drilldownSearch.trim(),
				page: String(drilldownPage),
				limit: String(drilldownLimit),
			});
			const res = await api(`/import-pns/statistik/drilldown?${queryParams.toString()}`);
			drilldownList = res.data || [];
			drilldownTotalPages = res.meta?.totalPages || 1;
			drilldownTotalRecords = res.meta?.total || 0;
		} catch (err) {
			toast.error(err.message || 'Gagal memuat daftar pegawai');
		} finally {
			drilldownLoading = false;
		}
	}

	let drilldownSearchTimeout;
	function handleDrilldownSearch() {
		clearTimeout(drilldownSearchTimeout);
		drilldownSearchTimeout = setTimeout(() => {
			drilldownPage = 1;
			loadDrilldownData();
		}, 300);
	}

	function printStatistik() {
		window.print();
	}

	function exportActiveStatCsv() {
		if (!statData) return;
		let csvContent = '';
		let filename = 'statistik_pns.csv';

		if (activeStatTab === 'gender') {
			filename = 'statistik_jenis_kelamin.csv';
			csvContent = 'No,Jenis Kelamin,Kode,Jumlah,Persentase (%)\n';
			statData.rekap_gender.items.forEach((item) => {
				csvContent += `${item.no},"${item.jenis_kelamin}","${item.kode}",${item.jumlah},${item.persentase}%\n`;
			});
			csvContent += `,"Total",,${statData.rekap_gender.total},100%\n`;
		} else if (activeStatTab === 'golongan') {
			filename = 'statistik_golongan_gender.csv';
			csvContent = 'No,Golongan,Pangkat,Laki-Laki,Perempuan,Total\n';
			statData.rekap_golongan_gender.items.forEach((item) => {
				csvContent += `${item.no},"${item.golongan}","${item.pangkat}",${item.laki_laki},${item.perempuan},${item.total}\n`;
			});
			csvContent += `,"Total",,${statData.rekap_golongan_gender.summary.total_laki},${statData.rekap_golongan_gender.summary.total_perempuan},${statData.rekap_golongan_gender.summary.total_keseluruhan}\n`;
		} else if (activeStatTab === 'pendidikan') {
			filename = 'statistik_pendidikan_gender.csv';
			csvContent = 'No,Tingkat Pendidikan,Laki-Laki,Perempuan,Total\n';
			statData.rekap_pendidikan_gender.items.forEach((item) => {
				csvContent += `${item.no},"${item.tingkat_pendidikan}",${item.laki_laki},${item.perempuan},${item.total}\n`;
			});
			csvContent += `,"Total",${statData.rekap_pendidikan_gender.summary.total_laki},${statData.rekap_pendidikan_gender.summary.total_perempuan},${statData.rekap_pendidikan_gender.summary.total_keseluruhan}\n`;
		} else if (activeStatTab === 'eselon_formasi') {
			filename = 'rekap_jabatan_struktural_eselon.csv';
			csvContent = 'No,Eselon,Formasi SOTK,Terisi (Import PNS),Kosong,Persentase Terisi (%)\n';
			statData.rekap_jabatan_struktural.items.forEach((item) => {
				csvContent += `${item.no},"${item.eselon}",${item.formasi},${item.terisi},${item.kosong},${item.persen_terisi}%\n`;
			});
			csvContent += `,"Total",${statData.rekap_jabatan_struktural.summary.total_formasi},${statData.rekap_jabatan_struktural.summary.total_terisi},${statData.rekap_jabatan_struktural.summary.total_kosong},${statData.rekap_jabatan_struktural.summary.persen_terisi}%\n`;
		} else if (activeStatTab === 'eselon_gender') {
			filename = 'rekap_pejabat_struktural_gender.csv';
			csvContent = 'No,Eselon,Laki-Laki,Perempuan,Total\n';
			statData.rekap_struktural_gender.items.forEach((item) => {
				csvContent += `${item.no},"${item.eselon}",${item.laki_laki},${item.perempuan},${item.total}\n`;
			});
			csvContent += `,"Total",${statData.rekap_struktural_gender.summary.total_laki},${statData.rekap_struktural_gender.summary.total_perempuan},${statData.rekap_struktural_gender.summary.total_keseluruhan}\n`;
		} else if (activeStatTab === 'eselon_pendidikan') {
			filename = 'pendidikan_pejabat_struktural.csv';
			const headers = ['No', 'Eselon', ...statData.rekap_struktural_pendidikan.columns.map((c) => `"${c.label}"`), 'Total'];
			csvContent = headers.join(',') + '\n';
			statData.rekap_struktural_pendidikan.items.forEach((item) => {
				const row = [item.no, `"${item.eselon}"`];
				statData.rekap_struktural_pendidikan.columns.forEach((col) => {
					row.push(item.counts[col.id] || 0);
				});
				row.push(item.total);
				csvContent += row.join(',') + '\n';
			});
			const totalRow = ['', '"Total"'];
			statData.rekap_struktural_pendidikan.columns.forEach((col) => {
				totalRow.push(statData.rekap_struktural_pendidikan.summary.counts[col.id] || 0);
			});
			totalRow.push(statData.rekap_struktural_pendidikan.summary.total_keseluruhan);
			csvContent += totalRow.join(',') + '\n';
		}

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	onMount(() => {
		loadData();
		loadRekap();
		loadRekapJenis();
		loadStatistik();
	});

	let searchTimeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			page = 1;
			loadData();
		}, 300);
	}

	let rekapSearchTimeout;
	function handleRekapSearchInput() {
		clearTimeout(rekapSearchTimeout);
		rekapSearchTimeout = setTimeout(() => {
			rekapPage = 1;
			loadRekap();
		}, 300);
	}

	let rekapJenisSearchTimeout;
	function handleRekapJenisSearchInput() {
		clearTimeout(rekapJenisSearchTimeout);
		rekapJenisSearchTimeout = setTimeout(() => {
			rekapJenisPage = 1;
			loadRekapJenis();
		}, 300);
	}

	function handleFilterChange() {
		page = 1;
		rekapPage = 1;
		rekapJenisPage = 1;
		loadData();
		loadRekap();
		loadRekapJenis();
		loadStatistik();
	}

	function handleFileSelect(e) {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (!file.name.toLowerCase().endsWith('.csv')) {
				toast.error('Format file harus .csv');
				return;
			}
			selectedFile = file;
			uploadResult = null;
		}
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (!file.name.toLowerCase().endsWith('.csv')) {
				toast.error('Format file harus .csv');
				return;
			}
			selectedFile = file;
			uploadResult = null;
		}
	}

	async function handleUpload() {
		if (!selectedFile) {
			toast.error('Pilih file CSV terlebih dahulu');
			return;
		}

		uploadLoading = true;
		uploadProgress = 20;

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);

			const progressTimer = setInterval(() => {
				if (uploadProgress < 90) uploadProgress += 15;
			}, 300);

			const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
			const res = await fetch(`${BASE_URL}/import-pns/upload`, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			clearInterval(progressTimer);
			uploadProgress = 100;

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Gagal mengupload CSV');
			}

			uploadResult = data.data;
			toast.success(`Berhasil mengimport ${data.data.insertedCount} data PNS (data lama telah digantikan)!`);
			selectedFile = null;
			selectedBatch = '';
			page = 1;
			rekapPage = 1;
			rekapJenisPage = 1;
			await Promise.all([loadData(), loadRekap(), loadRekapJenis(), loadStatistik()]);
		} catch (err) {
			toast.error(err.message || 'Terjadi kesalahan saat import data');
		} finally {
			uploadLoading = false;
		}
	}

	function downloadTemplate() {
		const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
		window.open(`${BASE_URL}/import-pns/template`, '_blank');
	}

	function openDetail(item) {
		activeDetail = item;
		showDetailModal = true;
	}

	function confirmDeleteSingle(item) {
		itemToDelete = item;
		isBatchDelete = false;
		showDeleteConfirm = true;
	}

	function confirmDeleteBatch(batch) {
		itemToDelete = batch;
		isBatchDelete = true;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		deleteLoading = true;
		try {
			if (isBatchDelete) {
				await api(`/import-pns/batch/${itemToDelete.batchId}`, { method: 'DELETE' });
				toast.success(`Batch import file ${itemToDelete.fileName || ''} berhasil dihapus`);
			} else {
				await api(`/import-pns/${itemToDelete.id}`, { method: 'DELETE' });
				toast.success(`Data PNS ${itemToDelete.nama || ''} berhasil dihapus`);
			}
			showDeleteConfirm = false;
			itemToDelete = null;
			await Promise.all([loadData(), loadRekap(), loadRekapJenis(), loadStatistik()]);
		} catch (err) {
			toast.error(err.message || 'Gagal menghapus data');
		} finally {
			deleteLoading = false;
		}
	}

	function filterByJabatan(namaJabatan) {
		selectedJenisJabatan = 'Jabatan Fungsional';
		search = namaJabatan;
		activeTab = 'pegawai';
		page = 1;
		loadData();
	}

	function filterByJenisJabatan(namaJenisJabatan) {
		selectedJenisJabatan = namaJenisJabatan === 'Tanpa Jenis Jabatan' ? 'null' : (namaJenisJabatan || '');
		search = '';
		activeTab = 'pegawai';
		page = 1;
		loadData();
	}

	function filterRekapByJenis(namaJenisJabatan) {
		selectedRekapJenis = namaJenisJabatan === 'Tanpa Jenis Jabatan' ? '' : namaJenisJabatan;
		activeTab = 'rekap';
		rekapPage = 1;
		loadRekap();
	}

	function formatStatusText(val) {
		if (!val) return 'PNS';
		const s = String(val).toUpperCase();
		if (s === 'P' || s === 'PNS') return 'PNS';
		if (s === 'C' || s === 'CPNS') return 'CPNS';
		return val;
	}

	function formatDate(str) {
		if (!str) return '-';
		try {
			const d = new Date(str);
			if (isNaN(d.getTime())) return str;
			return new Intl.DateTimeFormat('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(d);
		} catch {
			return str;
		}
	}
</script>

<svelte:head>
	<title>Import & Rekap Data PNS | SIPASN</title>
</svelte:head>

<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
	<!-- Top Banner / Header -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/60">
					Master Data
				</span>
				<span class="text-xs font-semibold text-zinc-400">Pengaturan & Master</span>
			</div>
			<h2 class="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Import & Rekap Data PNS</h2>
			<p class="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide text-sm">
				Unggah file CSV, kelola data master PNS, dan pantau rekapitulasi pegawai per formasi & jenis jabatan secara terpadu.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={downloadTemplate}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-bold transition-all shadow-sm border border-zinc-200/80 dark:border-zinc-700"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600 dark:text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
				Unduh Format CSV
			</button>
			<Button
				variant="secondary"
				onclick={() => { loadData(); loadRekap(); loadRekapJenis(); }}
				class="px-4 py-2.5 rounded-2xl shadow-sm"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={(loading || rekapLoading || rekapJenisLoading) ? 'animate-spin' : ''}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
				Segarkan
			</Button>
		</div>
	</div>

	<!-- Stats & Summary Row -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<!-- Card 1: Total Terimport -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Pegawai</span>
				<div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">{summary.totalRecords.toLocaleString('id-ID')}</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Data PNS yang tersimpan di tabel import</p>
			</div>
		</div>

		<!-- Card 2: Total Formasi Jabatan -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-emerald-100 dark:border-emerald-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Formasi</span>
				<div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-7"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{rekapTotalRecords.toLocaleString('id-ID')}
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Variasi jabatan yang terdata dari CSV</p>
			</div>
		</div>

		<!-- Card 3: Total Jenis Jabatan -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-blue-100 dark:border-blue-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Jenis Jabatan</span>
				<div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{rekapJenisTotalRecords} Jenis
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Fungsional, Pelaksana, Struktural</p>
			</div>
		</div>

		<!-- Card 4: Riwayat Batch -->
		<div class="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-zinc-900 dark:to-zinc-900 border border-amber-100 dark:border-amber-900/40 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Sesi</span>
				<div class="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				</div>
			</div>
			<div class="mt-4">
				<h3 class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
					{summary.recentBatches ? summary.recentBatches.length : 0} Batch
				</h3>
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Daftar sesi import aktif di sistem</p>
			</div>
		</div>
	</div>

	<!-- Upload CSV Section -->
	<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
			<div>
				<h3 class="text-lg font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
					<span class="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
					Upload File CSV Baru
				</h3>
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Mendukung otomatis pemisah koma (,) atau pipa (|). Data lama akan otomatis digantikan oleh data hasil import baru.</p>
			</div>
			{#if summary.recentBatches && summary.recentBatches.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-zinc-500">Filter Batch:</span>
					<select
						bind:value={selectedBatch}
						onchange={handleFilterChange}
						class="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Batch ({summary.totalRecords} Data)</option>
						{#each summary.recentBatches as b}
							<option value={b.batchId}>
								{b.fileName || 'CSV'} ({b.count} data - {formatDate(b.createdAt)})
							</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<!-- Dropzone Container -->
		<div
			class="relative rounded-3xl border-2 border-dashed p-8 transition-all duration-300 text-center {dragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-600'}"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => { dragOver = false; }}
			ondrop={handleDrop}
			role="region"
			aria-label="Area drag and drop file CSV"
		>
			<input
				type="file"
				accept=".csv,text/csv"
				id="csv-file-input"
				class="hidden"
				onchange={handleFileSelect}
			/>

			{#if !selectedFile}
				<div class="flex flex-col items-center justify-center space-y-3">
					<div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60 shadow-inner">
						<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
					</div>
					<div>
						<label for="csv-file-input" class="cursor-pointer font-bold text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-4">
							Pilih file CSV
						</label>
						<span class="text-sm font-medium text-zinc-500 dark:text-zinc-400"> atau seret dan letakkan file di sini</span>
					</div>
					<p class="text-xs text-zinc-400 font-medium">Header otomatis disesuaikan dengan 71 kolom data PNS.</p>
				</div>
			{:else}
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-left">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
						</div>
						<div>
							<p class="text-sm font-bold text-zinc-900 dark:text-zinc-50">{selectedFile.name}</p>
							<p class="text-xs font-medium text-zinc-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => { selectedFile = null; }}
							disabled={uploadLoading}
							class="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
						>
							Batal
						</button>
						<Button
							variant="primary"
							loading={uploadLoading}
							onclick={handleUpload}
							class="px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
							Mulai Import Data
						</Button>
					</div>
				</div>
			{/if}

			{#if uploadLoading}
				<div class="mt-4 space-y-2">
					<div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
						<div
							class="bg-indigo-600 h-full rounded-full transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
					<p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
						Memproses dan menyimpan data PNS ke database ({uploadProgress}%)...
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- TAB NAVIGATION -->
	<div class="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-700">
		<button
			type="button"
			onclick={() => { activeTab = 'pegawai'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'pegawai' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			Daftar Data Pegawai ({totalRecords.toLocaleString('id-ID')})
		</button>
		<button
			type="button"
			onclick={() => { activeTab = 'rekap'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'rekap' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
			Rekap per Formasi JF ({rekapTotalRecords.toLocaleString('id-ID')})
		</button>
		<button
			type="button"
			onclick={() => { activeTab = 'rekap-jenis'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'rekap-jenis' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
			Rekap per Jenis Jabatan ({rekapJenisTotalRecords})
		</button>
		<button
			type="button"
			onclick={() => { activeTab = 'statistik'; }}
			class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'statistik' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
			Data Statistik PNS (6 Rekap)
		</button>
	</div>

	<!-- TAB 1: DAFTAR DATA PEGAWAI -->
	{#if activeTab === 'pegawai'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Toolbar Filter & Search -->
			<div class="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari NIP, Nama, UNOR, NIK, atau Jabatan..."
						bind:value={search}
						oninput={handleSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<select
						bind:value={selectedStatus}
						onchange={handleFilterChange}
						class="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Status CPNS/PNS</option>
						<option value="PNS">PNS (P)</option>
						<option value="CPNS">CPNS (C)</option>
					</select>

					<select
						bind:value={selectedJenisJabatan}
						onchange={handleFilterChange}
						class="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Semua Jenis Jabatan</option>
						<option value="Jabatan Struktural">Jabatan Struktural</option>
						<option value="Jabatan Fungsional">Jabatan Fungsional</option>
						<option value="Jabatan Pelaksana">Jabatan Pelaksana</option>
					</select>

					{#if selectedJenisJabatan}
						<span class="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold animate-in fade-in">
							<span>Jenis: {selectedJenisJabatan === 'null' ? 'Tanpa Jenis' : selectedJenisJabatan}</span>
							<button
								type="button"
								onclick={() => { selectedJenisJabatan = ''; page = 1; loadData(); }}
								class="hover:text-red-500 font-bold ml-1 text-sm leading-none"
								title="Hapus filter jenis jabatan"
							>
								×
							</button>
						</span>
					{/if}

					{#if selectedBatch}
						<button
							type="button"
							onclick={() => {
								const b = summary.recentBatches.find(x => x.batchId === selectedBatch);
								if (b) confirmDeleteBatch(b);
							}}
							class="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
							Hapus Batch Terpilih
						</button>
					{/if}
				</div>
			</div>

			<!-- Data Table -->
			{#if loading}
				<div class="py-20">
					<LoadingState message="Memuat daftar data import PNS..." />
				</div>
			{:else if error}
				<div class="py-12">
					<ErrorState message={error} onRetry={loadData} />
				</div>
			{:else if pnsList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📊"
						message={search || selectedBatch || selectedStatus ? 'Tidak ada data PNS yang sesuai dengan kriteria filter.' : 'Belum ada data PNS yang diimport. Silakan upload file CSV di atas.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-100 dark:border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data Pegawai</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Golongan / Jabatan</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden md:table-cell">Unit Organisasi (UNOR)</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden lg:table-cell">Status / TMT</th>
								<th class="px-4 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/40">
							{#each pnsList as item}
								<tr class="group hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40 transition-colors">
									<!-- Col 1: Nama & NIP -->
									<td class="px-4 py-4">
										<div class="space-y-1">
											<p class="font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
												{item.gelar_depan ? item.gelar_depan + ' ' : ''}{item.nama || '-'}{item.gelar_belakang ? ', ' + item.gelar_belakang : ''}
											</p>
											<div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
												<span class="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
													NIP: {item.nip_baru || '-'}
												</span>
												{#if item.nik}
													<span class="text-zinc-400 text-[11px]">NIK: {item.nik}</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Col 2: Golongan & Jabatan -->
									<td class="px-4 py-4">
										<div class="space-y-1">
											<p class="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
												{item.jabatan_nama || item.jenis_jabatan_nama || '-'}
											</p>
											<div class="flex items-center gap-1.5">
												<Badge variant="indigo">
													Gol: {item.gol_akhir_nama || item.gol_akhir_id || '-'}
												</Badge>
												{#if item.eselon_nama}
													<span class="text-[10px] font-bold text-zinc-400">{item.eselon_nama}</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Col 3: UNOR -->
									<td class="px-4 py-4 hidden md:table-cell">
										<div class="space-y-0.5 max-w-xs">
											<p class="font-bold text-zinc-700 dark:text-zinc-300 text-xs line-clamp-1" title={item.unor_nama}>
												{item.unor_nama || '-'}
											</p>
											<p class="text-[11px] text-zinc-400 line-clamp-1" title={item.instansi_induk_nama}>
												{item.instansi_induk_nama || '-'}
											</p>
										</div>
									</td>

									<!-- Col 4: Status -->
									<td class="px-4 py-4 hidden lg:table-cell">
										<div class="space-y-1">
											<Badge variant={formatStatusText(item.status_cpns_pns) === 'PNS' ? 'emerald' : 'amber'}>
												{formatStatusText(item.status_cpns_pns)}
											</Badge>
											<p class="text-[10px] text-zinc-400 font-medium">
												TMT: {item.tmt_pns || item.tmt_cpns || item.tmt_golongan || '-'}
											</p>
										</div>
									</td>

									<!-- Col 5: Actions -->
									<td class="px-4 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												type="button"
												onclick={() => openDetail(item)}
												class="p-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-indigo-400 text-zinc-600 transition-all font-bold text-xs"
												title="Lihat 71 Atribut Lengkap"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
											</button>
											<button
												type="button"
												onclick={() => confirmDeleteSingle(item)}
												class="p-2 rounded-xl bg-zinc-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-red-400 text-zinc-600 transition-all font-bold text-xs"
												title="Hapus Data"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan baris {(page - 1) * limit + 1} - {Math.min(page * limit, totalRecords)} dari total {totalRecords.toLocaleString('id-ID')} data
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={page <= 1}
							onclick={() => { page -= 1; loadData(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{page} / {totalPages}
						</span>
						<Button
							variant="secondary"
							disabled={page >= totalPages}
							onclick={() => { page += 1; loadData(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- TAB 2: REKAPITULASI PER JABATAN -->
	{#if activeTab === 'rekap'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Rekap Header & Mode Switch Toolbar -->
			<div class="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
				<!-- Mode Switcher: Formasi Gabungan vs Rincian Detail -->
				<div class="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700 self-start">
					<button
						type="button"
						onclick={() => setRekapMode('gabungan')}
						class="px-4 py-2 rounded-xl text-xs font-bold transition-all {rekapMode === 'gabungan' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
					>
						👥 Formasi JF Gabungan (Guru, Perawat, dll.)
					</button>
					<button
						type="button"
						onclick={() => setRekapMode('detail')}
						class="px-4 py-2 rounded-xl text-xs font-bold transition-all {rekapMode === 'detail' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
					>
						📑 Rincian per Jenjang SK
					</button>
				</div>

				<!-- Search Input -->
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder={rekapMode === 'gabungan' ? "Cari formasi JF (contoh: Guru, Perawat, Bidan, Dokter, Auditor)..." : "Cari nama formasi JF lengkap (contoh: Guru Ahli Muda, Perawat Penyelia)..."}
						bind:value={rekapSearch}
						oninput={handleRekapSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<!-- Right Actions: Khusus JF Badge, Export CSV, Total Badge -->
				<div class="flex flex-wrap items-center gap-2">
					<span class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold whitespace-nowrap">
						<span class="w-2 h-2 rounded-full bg-indigo-600"></span>
						Khusus Jabatan Fungsional (JF)
					</span>

					<!-- Export CSV Button -->
					<button
						type="button"
						onclick={exportRekapCsv}
						disabled={rekapList.length === 0}
						title="Export Rekapitulasi Formasi JF ke CSV"
						class="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition disabled:opacity-50"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span>CSV</span>
					</button>

					<span class="text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3.5 py-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-700 whitespace-nowrap">
						Total {rekapTotalRecords} {rekapMode === 'gabungan' ? 'Formasi JF' : 'Formasi JF Rinci'}
					</span>
				</div>
			</div>

			<!-- Info banner -->
			<div class="px-4 py-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
				<p class="text-indigo-950 dark:text-indigo-200 font-medium">
					💡 <b>Rekapitulasi per Formasi JF:</b> Menampilkan formasi khusus Jabatan Fungsional (JF) dengan total <b>{rekapSummary ? rekapSummary.total_pegawai.toLocaleString('id-ID') : 0} Pegawai</b> (PNS: <b>{rekapSummary ? rekapSummary.jumlah_pns.toLocaleString('id-ID') : 0}</b>, CPNS: <b>{rekapSummary ? rekapSummary.jumlah_cpns.toLocaleString('id-ID') : 0}</b>). Rincian disajikan per gender <b>Laki-Laki (Ahli & Terampil)</b> dan <b>Perempuan (Ahli & Terampil)</b>.
				</p>
				<span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
					Mode: {rekapMode === 'gabungan' ? 'Formasi JF Gabungan' : 'Rincian per Jenjang'}
				</span>
			</div>

			<!-- Rekap Table -->
			{#if rekapLoading}
				<div class="py-20">
					<LoadingState message="Menghitung rekapitulasi data formasi jabatan..." />
				</div>
			{:else if rekapError}
				<div class="py-12">
					<ErrorState message={rekapError} onRetry={loadRekap} />
				</div>
			{:else if rekapList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📑"
						message={rekapSearch ? 'Tidak ada jabatan yang sesuai dengan pencarian.' : 'Belum ada data jabatan yang dapat direkap.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
					<table class="w-full text-left text-xs sm:text-sm border-collapse">
						<thead>
							<!-- BARIS 1: Header Kategori Utama -->
							<tr class="bg-zinc-50/90 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider">
								<th rowspan="2" class="py-3 px-3 w-12 text-center align-middle border-r border-zinc-200 dark:border-zinc-800">No</th>
								<th rowspan="2" class="py-3 px-4 align-middle border-r border-zinc-200 dark:border-zinc-800 min-w-48">
									Nama Formasi JF
								</th>
								<th rowspan="2" class="py-3 px-3 align-middle border-r border-zinc-200 dark:border-zinc-800 text-center w-28">
									Jenis Jabatan
								</th>

								<!-- Laki-Laki (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/80 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-black">
									<div class="flex items-center justify-center gap-1.5">
										<span class="w-2 h-2 rounded-full bg-blue-600"></span>
										<span>Laki-Laki (♂)</span>
									</div>
								</th>

								<!-- Perempuan (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-black">
									<div class="flex items-center justify-center gap-1.5">
										<span class="w-2 h-2 rounded-full bg-rose-600"></span>
										<span>Perempuan (♀)</span>
									</div>
								</th>

								<!-- Total Keseluruhan (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 font-black">
									Total Pegawai
								</th>

								<!-- Aksi -->
								<th rowspan="2" class="py-3 px-3 align-middle text-right w-24">Aksi</th>
							</tr>

							<!-- BARIS 2: Sub-kolom Ahli, Terampil, Total -->
							<tr class="bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
								<!-- Laki-Laki -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-950/10 text-zinc-600 dark:text-zinc-300">Ahli</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-950/10 text-zinc-600 dark:text-zinc-300">Terampil</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-100/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black">Jml L</th>

								<!-- Perempuan -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/30 dark:bg-rose-950/10 text-zinc-600 dark:text-zinc-300">Ahli</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/30 dark:bg-rose-950/10 text-zinc-600 dark:text-zinc-300">Terampil</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-100/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-black">Jml P</th>

								<!-- Total Keseluruhan -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-300">Ahli</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400">Terampil</th>
								<th class="py-2 px-3 text-right w-20 border-r border-zinc-200 dark:border-zinc-800 bg-indigo-100/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-black">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapList as row, index}
								<tr class="group hover:bg-indigo-50/20 dark:hover:bg-zinc-800/30 transition-colors">
									<!-- No -->
									<td class="py-3 px-3 text-xs font-mono font-bold text-zinc-400 text-center border-r border-zinc-100 dark:border-zinc-800/60">
										{(rekapPage - 1) * rekapLimit + index + 1}
									</td>

									<!-- Nama Jabatan / Kelompok -->
									<td class="py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/60">
										<div class="flex flex-col">
											<span class="font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">
												{row.jabatan_nama}
											</span>
											{#if rekapMode === 'jabatan' && row.kelompok_profesi && row.kelompok_profesi !== 'Lainnya' && row.kelompok_profesi !== row.jabatan_nama}
												<span class="text-[10px] text-zinc-400 font-medium">
													Profesi: {row.kelompok_profesi}
												</span>
											{/if}
										</div>
									</td>

									<!-- Jenjang / Jenis Jabatan -->
									<td class="py-3 px-3 text-center border-r border-zinc-100 dark:border-zinc-800/60">
										{#if row.jenjang === 'AHLI'}
											<span class="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
												AHLI
											</span>
										{:else if row.jenjang === 'TERAMPIL'}
											<span class="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
												TERAMPIL
											</span>
										{:else}
											<Badge variant="neutral">
												{row.jenis_jabatan_nama || 'Umum'}
											</Badge>
										{/if}
									</td>

									<!-- LAKI-LAKI: Ahli -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.ahli ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'L' }, `${row.jabatan_nama} (Laki-Laki Ahli)`)}
												class="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
												title="Klik untuk melihat daftar pegawai Laki-Laki Ahli"
											>
												{row.laki_laki.ahli.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- LAKI-LAKI: Terampil -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.terampil ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'L' }, `${row.jabatan_nama} (Laki-Laki Terampil)`)}
												class="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
												title="Klik untuk melihat daftar pegawai Laki-Laki Terampil"
											>
												{row.laki_laki.terampil.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- LAKI-LAKI: Total L -->
									<td class="py-3 px-2.5 text-right font-black text-blue-700 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-950/10 border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.total ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'L' }, `${row.jabatan_nama} (Laki-Laki)`)}
												class="hover:underline cursor-pointer"
												title="Klik untuk melihat seluruh pegawai Laki-Laki"
											>
												{row.laki_laki.total.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- PEREMPUAN: Ahli -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.ahli ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'P' }, `${row.jabatan_nama} (Perempuan Ahli)`)}
												class="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
												title="Klik untuk melihat daftar pegawai Perempuan Ahli"
											>
												{row.perempuan.ahli.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- PEREMPUAN: Terampil -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.terampil ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'P' }, `${row.jabatan_nama} (Perempuan Terampil)`)}
												class="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
												title="Klik untuk melihat daftar pegawai Perempuan Terampil"
											>
												{row.perempuan.terampil.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- PEREMPUAN: Total P -->
									<td class="py-3 px-2.5 text-right font-black text-rose-700 dark:text-rose-300 bg-rose-50/20 dark:bg-rose-950/10 border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.total ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama, gender: 'P' }, `${row.jabatan_nama} (Perempuan)`)}
												class="hover:underline cursor-pointer"
												title="Klik untuk melihat seluruh pegawai Perempuan"
											>
												{row.perempuan.total.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- TOTAL PEGAWAI: Ahli -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60 font-medium text-indigo-700 dark:text-indigo-400">
										{(row.total_ahli ?? 0) > 0 ? row.total_ahli.toLocaleString('id-ID') : '-'}
									</td>

									<!-- TOTAL PEGAWAI: Terampil -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60 font-medium text-amber-700 dark:text-amber-400">
										{(row.total_terampil ?? 0) > 0 ? row.total_terampil.toLocaleString('id-ID') : '-'}
									</td>

									<!-- TOTAL PEGAWAI: Total Semua -->
									<td class="py-3 px-3 text-right bg-indigo-50/30 dark:bg-indigo-950/20 border-r border-zinc-100 dark:border-zinc-800/60 font-black">
										<button
											type="button"
											onclick={() => openDrilldown({ stat_type: 'jabatan', jabatan_nama: row.jabatan_nama }, `Seluruh Pegawai: ${row.jabatan_nama}`)}
											class="text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
											title="Klik untuk membuka pratinjau daftar seluruh pegawai formasi ini"
										>
											{row.total_pegawai.toLocaleString('id-ID')}
										</button>
									</td>

									<!-- Aksi: Lihat Pegawai di Tab 1 -->
									<td class="py-3 px-3 text-right">
										<button
											type="button"
											onclick={() => filterByJabatan(row.jabatan_nama)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-indigo-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-indigo-600 text-zinc-700 dark:text-zinc-300 transition-all font-bold text-xs shadow-xs"
											title="Lihat pegawai formasi JF ini di Tab Daftar Pegawai"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
											Lihat
										</button>
									</td>
								</tr>
							{/each}
						</tbody>

						<!-- FOOTER TABEL: TOTAL KESELURUHAN -->
						{#if rekapSummary}
							<tfoot class="bg-zinc-100/80 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-300 dark:border-zinc-700 text-xs">
								<tr>
									<td colspan="3" class="py-3 px-4 text-center uppercase tracking-wider text-xs border-r border-zinc-200 dark:border-zinc-700">
										<div class="flex flex-col items-center justify-center">
											<span>TOTAL KESELURUHAN</span>
											<span class="text-[10px] font-normal text-zinc-500 normal-case">
												(PNS: <b class="text-emerald-600 dark:text-emerald-400 font-bold">{rekapSummary.jumlah_pns.toLocaleString('id-ID')}</b>, CPNS: <b class="text-amber-600 dark:text-amber-400 font-bold">{rekapSummary.jumlah_cpns.toLocaleString('id-ID')}</b>)
											</span>
										</div>
									</td>
									<!-- Laki-Laki -->
									<td class="py-3.5 px-2.5 text-right text-blue-600 dark:text-blue-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.laki_laki.ahli.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-blue-600 dark:text-blue-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.laki_laki.terampil.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right font-black text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/40 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.laki_laki.total.toLocaleString('id-ID')}
									</td>

									<!-- Perempuan -->
									<td class="py-3.5 px-2.5 text-right text-rose-600 dark:text-rose-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.perempuan.ahli.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-rose-600 dark:text-rose-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.perempuan.terampil.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right font-black text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/40 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.perempuan.total.toLocaleString('id-ID')}
									</td>

									<!-- Total Pegawai -->
									<td class="py-3.5 px-2.5 text-right text-indigo-700 dark:text-indigo-300 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.total_ahli.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-amber-700 dark:text-amber-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapSummary.total_terampil.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-3 text-right text-indigo-800 dark:text-indigo-200 bg-indigo-100/60 dark:bg-indigo-950/50 border-r border-zinc-200 dark:border-zinc-700 text-sm">
										{rekapSummary.total_pegawai.toLocaleString('id-ID')}
									</td>

									<td class="py-3.5 px-3 text-center"></td>
								</tr>
							</tfoot>
						{/if}
					</table>
				</div>

				<!-- Pagination Footer Rekap -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan formasi jabatan {(rekapPage - 1) * rekapLimit + 1} - {Math.min(rekapPage * rekapLimit, rekapTotalRecords)} dari total {rekapTotalRecords.toLocaleString('id-ID')} {rekapMode === 'gabungan' ? 'formasi jabatan' : 'formasi rinci'}
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={rekapPage <= 1}
							onclick={() => { rekapPage -= 1; loadRekap(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{rekapPage} / {rekapTotalPages}
						</span>
						<Button
							variant="secondary"
							disabled={rekapPage >= rekapTotalPages}
							onclick={() => { rekapPage += 1; loadRekap(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- TAB 3: REKAPITULASI PER JENIS JABATAN -->
	{#if activeTab === 'rekap-jenis'}
		<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden space-y-6">
			<!-- Rekap Jenis Header & Visual Distribution Cards -->
			<div class="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari jenis jabatan..."
						bind:value={rekapJenisSearch}
						oninput={handleRekapJenisSearchInput}
						class="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
					/>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={exportRekapJenisCsv}
						class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition-all shadow-xs"
						title="Unduh Rekapitulasi Jenis Jabatan (CSV)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
						<span>Ekspor CSV</span>
					</button>

					<span class="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 rounded-2xl">
						Total {summary.totalRecords.toLocaleString('id-ID')} Pegawai Terdata
					</span>
				</div>
			</div>

			<!-- Visual Distribution Cards -->
			{#if rekapJenisList.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each rekapJenisList as item}
						<div
							role="button"
							tabindex="0"
							onkeydown={(e) => { if (e.key === 'Enter') filterRekapByJenis(item.jenis_jabatan_nama); }}
							onclick={() => filterRekapByJenis(item.jenis_jabatan_nama)}
							class="p-5 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-3 hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/10 dark:hover:border-indigo-500 transition-all cursor-pointer group"
						>
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{item.jenis_jabatan_nama}</h4>
								<span class="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
									{item.persentase}%
								</span>
							</div>
							
							<!-- Progress bar -->
							<div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
								<div class="bg-indigo-600 h-full rounded-full" style="width: {item.persentase}%"></div>
							</div>

							<!-- Pemisahan Gender (Laki-Laki vs Perempuan) -->
							<div class="grid grid-cols-2 gap-2 pt-1 text-xs">
								<div class="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-900/40 space-y-0.5">
									<div class="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
										<span class="flex items-center gap-1">
											<span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Laki-Laki (♂)
										</span>
										<span class="font-black text-xs text-blue-800 dark:text-blue-200">{(item.laki_laki?.total ?? 0).toLocaleString('id-ID')}</span>
									</div>
									<div class="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5 border-t border-blue-100 dark:border-blue-900/40 font-medium">
										<span>PNS: <b class="text-blue-700 dark:text-blue-300 font-bold">{item.laki_laki?.pns ?? 0}</b></span>
										<span>CPNS: <b class="text-amber-600 dark:text-amber-400 font-bold">{item.laki_laki?.cpns ?? 0}</b></span>
									</div>
								</div>

								<div class="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100/80 dark:border-rose-900/40 space-y-0.5">
									<div class="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300">
										<span class="flex items-center gap-1">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Perempuan (♀)
										</span>
										<span class="font-black text-xs text-rose-800 dark:text-rose-200">{(item.perempuan?.total ?? 0).toLocaleString('id-ID')}</span>
									</div>
									<div class="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5 border-t border-rose-100 dark:border-rose-900/40 font-medium">
										<span>PNS: <b class="text-rose-700 dark:text-rose-300 font-bold">{item.perempuan?.pns ?? 0}</b></span>
										<span>CPNS: <b class="text-amber-600 dark:text-amber-400 font-bold">{item.perempuan?.cpns ?? 0}</b></span>
									</div>
								</div>
							</div>

							<div class="flex items-center justify-between text-xs text-zinc-500 font-medium pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
								<span>Total PNS: <b class="text-emerald-600 dark:text-emerald-400 font-bold">{item.jumlah_pns.toLocaleString('id-ID')}</b></span>
								<span>Total CPNS: <b class="text-amber-600 dark:text-amber-400 font-bold">{item.jumlah_cpns.toLocaleString('id-ID')}</b></span>
								<span>Total: <b class="text-zinc-900 dark:text-zinc-100 font-black">{item.total_pegawai.toLocaleString('id-ID')}</b></span>
							</div>

							<!-- Action Buttons on Card -->
							<div class="flex items-center gap-2 pt-1">
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); filterByJenisJabatan(item.jenis_jabatan_nama); }}
									class="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center transition-all shadow-xs"
								>
									Lihat Pegawai ({item.total_pegawai})
								</button>
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); filterRekapByJenis(item.jenis_jabatan_nama); }}
									class="py-1.5 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition-all"
									title="Lihat Formasi Jabatan"
								>
									Formasi
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Rekap Jenis Table -->
			{#if rekapJenisLoading}
				<div class="py-20">
					<LoadingState message="Menghitung rekapitulasi data per jenis jabatan..." />
				</div>
			{:else if rekapJenisError}
				<div class="py-12">
					<ErrorState message={rekapJenisError} onRetry={loadRekapJenis} />
				</div>
			{:else if rekapJenisList.length === 0}
				<div class="py-20">
					<EmptyState
						icon="📊"
						message={rekapJenisSearch ? 'Tidak ada jenis jabatan yang cocok dengan pencarian.' : 'Belum ada data jenis jabatan yang dapat direkap.'}
					/>
				</div>
			{:else}
				<div class="overflow-x-auto -mx-6 sm:mx-0 rounded-2xl border border-zinc-200 dark:border-zinc-800">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<!-- BARIS 1: Header Utama Bersarang -->
							<tr class="bg-zinc-50/90 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider">
								<th rowspan="2" class="py-3 px-3 w-12 text-center align-middle border-r border-zinc-200 dark:border-zinc-800">No</th>
								<th rowspan="2" class="py-3 px-4 align-middle border-r border-zinc-200 dark:border-zinc-800 min-w-44">
									Jenis Jabatan
								</th>

								<!-- Laki-Laki (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/80 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-black">
									<div class="flex items-center justify-center gap-1.5">
										<span class="w-2 h-2 rounded-full bg-blue-600"></span>
										<span>Laki-Laki (♂)</span>
									</div>
								</th>

								<!-- Perempuan (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-black">
									<div class="flex items-center justify-center gap-1.5">
										<span class="w-2 h-2 rounded-full bg-rose-600"></span>
										<span>Perempuan (♀)</span>
									</div>
								</th>

								<!-- Total Keseluruhan (Header Bersarang) -->
								<th colspan="3" class="py-2 px-3 text-center border-b border-r border-zinc-200 dark:border-zinc-800 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 font-black">
									Total Pegawai
								</th>

								<th rowspan="2" class="py-3 px-3 text-center align-middle border-r border-zinc-200 dark:border-zinc-800 w-20">
									Proporsi
								</th>

								<th rowspan="2" class="py-3 px-4 align-middle text-right w-44">
									Aksi
								</th>
							</tr>

							<!-- BARIS 2: Sub-kolom PNS, CPNS, Total -->
							<tr class="bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
								<!-- Laki-Laki -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-950/10 text-zinc-600 dark:text-zinc-300">PNS</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-950/10 text-zinc-600 dark:text-zinc-300">CPNS</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-blue-100/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black">Jml L</th>

								<!-- Perempuan -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/30 dark:bg-rose-950/10 text-zinc-600 dark:text-zinc-300">PNS</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-50/30 dark:bg-rose-950/10 text-zinc-600 dark:text-zinc-300">CPNS</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-rose-100/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-black">Jml P</th>

								<!-- Total Keseluruhan -->
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-300">PNS</th>
								<th class="py-2 px-2.5 text-right w-16 border-r border-zinc-200 dark:border-zinc-800 bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400">CPNS</th>
								<th class="py-2 px-3 text-right w-20 border-r border-zinc-200 dark:border-zinc-800 bg-indigo-100/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-black">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{#each rekapJenisList as row, index}
								<tr class="group hover:bg-indigo-50/20 dark:hover:bg-zinc-800/30 transition-colors">
									<!-- No -->
									<td class="py-3 px-3 text-xs font-mono font-bold text-zinc-400 text-center border-r border-zinc-100 dark:border-zinc-800/60">
										{(rekapJenisPage - 1) * rekapJenisLimit + index + 1}
									</td>

									<!-- Nama Jenis Jabatan -->
									<td class="py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/60">
										<p class="font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">
											{row.jenis_jabatan_nama}
										</p>
									</td>

									<!-- LAKI-LAKI: PNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.pns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'L', status_cpns_pns: 'PNS' }, `${row.jenis_jabatan_nama} (Laki-Laki PNS)`)}
												class="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
												title="Klik untuk melihat pegawai Laki-Laki PNS"
											>
												{row.laki_laki.pns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- LAKI-LAKI: CPNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.cpns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'L', status_cpns_pns: 'CPNS' }, `${row.jenis_jabatan_nama} (Laki-Laki CPNS)`)}
												class="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
												title="Klik untuk melihat pegawai Laki-Laki CPNS"
											>
												{row.laki_laki.cpns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- LAKI-LAKI: Total L -->
									<td class="py-3 px-2.5 text-right font-black text-blue-700 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-950/10 border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.laki_laki?.total ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'L' }, `${row.jenis_jabatan_nama} (Semua Laki-Laki)`)}
												class="hover:underline cursor-pointer"
												title="Klik untuk melihat seluruh pegawai Laki-Laki"
											>
												{row.laki_laki.total.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- PEREMPUAN: PNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.pns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'P', status_cpns_pns: 'PNS' }, `${row.jenis_jabatan_nama} (Perempuan PNS)`)}
												class="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
												title="Klik untuk melihat pegawai Perempuan PNS"
											>
												{row.perempuan.pns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- PEREMPUAN: CPNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.cpns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'P', status_cpns_pns: 'CPNS' }, `${row.jenis_jabatan_nama} (Perempuan CPNS)`)}
												class="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
												title="Klik untuk melihat pegawai Perempuan CPNS"
											>
												{row.perempuan.cpns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- PEREMPUAN: Total P -->
									<td class="py-3 px-2.5 text-right font-black text-rose-700 dark:text-rose-300 bg-rose-50/20 dark:bg-rose-950/10 border-r border-zinc-100 dark:border-zinc-800/60">
										{#if (row.perempuan?.total ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, gender: 'P' }, `${row.jenis_jabatan_nama} (Semua Perempuan)`)}
												class="hover:underline cursor-pointer"
												title="Klik untuk melihat seluruh pegawai Perempuan"
											>
												{row.perempuan.total.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- TOTAL: PNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60 font-medium text-emerald-700 dark:text-emerald-400">
										{#if (row.jumlah_pns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, status_cpns_pns: 'PNS' }, `${row.jenis_jabatan_nama} (Total PNS)`)}
												class="hover:underline cursor-pointer font-bold"
											>
												{row.jumlah_pns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">0</span>
										{/if}
									</td>

									<!-- TOTAL: CPNS -->
									<td class="py-3 px-2.5 text-right border-r border-zinc-100 dark:border-zinc-800/60 font-medium text-amber-700 dark:text-amber-400">
										{#if (row.jumlah_cpns ?? 0) > 0}
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama, status_cpns_pns: 'CPNS' }, `${row.jenis_jabatan_nama} (Total CPNS)`)}
												class="hover:underline cursor-pointer font-bold"
											>
												{row.jumlah_cpns.toLocaleString('id-ID')}
											</button>
										{:else}
											<span class="text-zinc-300 dark:text-zinc-600">-</span>
										{/if}
									</td>

									<!-- TOTAL: Total Pegawai -->
									<td class="py-3 px-3 text-right font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/10 border-r border-zinc-100 dark:border-zinc-800/60">
										<button
											type="button"
											onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama }, `Daftar Pegawai (${row.jenis_jabatan_nama})`)}
											class="hover:underline cursor-pointer font-black text-indigo-700 dark:text-indigo-300"
											title="Klik untuk membuka pratinjau daftar pegawai"
										>
											{row.total_pegawai.toLocaleString('id-ID')}
										</button>
									</td>

									<!-- Proporsi -->
									<td class="py-3 px-3 text-center border-r border-zinc-100 dark:border-zinc-800/60">
										<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">{row.persentase}%</span>
									</td>

									<!-- Aksi -->
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												type="button"
												onclick={() => filterRekapByJenis(row.jenis_jabatan_nama)}
												class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 transition-all font-bold text-xs shadow-xs"
												title="Lihat Formasi Jabatan untuk Kategori Ini"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
												Formasi
											</button>
											<button
												type="button"
												onclick={() => filterByJenisJabatan(row.jenis_jabatan_nama)}
												class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold text-xs shadow-xs"
												title="Buka daftar data pegawai {row.jenis_jabatan_nama}"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
												Pegawai
											</button>
											<button
												type="button"
												onclick={() => openDrilldown({ stat_type: 'jenis_jabatan', jenis_jabatan_nama: row.jenis_jabatan_nama }, `Daftar Pegawai (${row.jenis_jabatan_nama})`)}
												class="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all shadow-xs"
												title="Buka Rincian Modal Pop-up"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>

						<!-- FOOTER TABEL: TOTAL KESELURUHAN -->
						{#if rekapJenisSummary}
							<tfoot class="bg-zinc-100/80 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-300 dark:border-zinc-700 text-xs">
								<tr>
									<td colspan="2" class="py-3 px-4 text-center uppercase tracking-wider text-xs border-r border-zinc-200 dark:border-zinc-700">
										<div class="flex flex-col items-center justify-center">
											<span>TOTAL KESELURUHAN</span>
											<span class="text-[10px] font-normal text-zinc-500 normal-case">
												(PNS: <b class="text-emerald-600 dark:text-emerald-400 font-bold">{rekapJenisSummary.jumlah_pns.toLocaleString('id-ID')}</b>, CPNS: <b class="text-amber-600 dark:text-amber-400 font-bold">{rekapJenisSummary.jumlah_cpns.toLocaleString('id-ID')}</b>)
											</span>
										</div>
									</td>

									<!-- Laki-Laki -->
									<td class="py-3.5 px-2.5 text-right text-blue-600 dark:text-blue-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.laki_laki.pns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-amber-600 dark:text-amber-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.laki_laki.cpns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right font-black text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/40 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.laki_laki.total.toLocaleString('id-ID')}
									</td>

									<!-- Perempuan -->
									<td class="py-3.5 px-2.5 text-right text-rose-600 dark:text-rose-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.perempuan.pns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-amber-600 dark:text-amber-400 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.perempuan.cpns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right font-black text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/40 border-r border-zinc-200 dark:border-zinc-700">
										{rekapJenisSummary.perempuan.total.toLocaleString('id-ID')}
									</td>

									<!-- Total Keseluruhan -->
									<td class="py-3.5 px-2.5 text-right text-emerald-700 dark:text-emerald-400 border-r border-zinc-200 dark:border-zinc-700 font-bold">
										{rekapJenisSummary.jumlah_pns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-2.5 text-right text-amber-700 dark:text-amber-400 border-r border-zinc-200 dark:border-zinc-700 font-bold">
										{rekapJenisSummary.jumlah_cpns.toLocaleString('id-ID')}
									</td>
									<td class="py-3.5 px-3 text-right text-indigo-800 dark:text-indigo-200 bg-indigo-100/60 dark:bg-indigo-950/50 border-r border-zinc-200 dark:border-zinc-700 text-sm font-black">
										{rekapJenisSummary.total_pegawai.toLocaleString('id-ID')}
									</td>

									<!-- Proporsi -->
									<td class="py-3.5 px-3 text-center border-r border-zinc-200 dark:border-zinc-700 font-bold">
										100%
									</td>

									<!-- Aksi -->
									<td class="py-3.5 px-4 text-center"></td>
								</tr>
							</tfoot>
						{/if}
					</table>
				</div>

				<!-- Pagination Footer Rekap Jenis -->
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold text-zinc-500">
						Menampilkan jenis jabatan {(rekapJenisPage - 1) * rekapJenisLimit + 1} - {Math.min(rekapJenisPage * rekapJenisLimit, rekapJenisTotalRecords)} dari total {rekapJenisTotalRecords} kategori
					</p>

					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							disabled={rekapJenisPage <= 1}
							onclick={() => { rekapJenisPage -= 1; loadRekapJenis(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Sebelumnya
						</Button>
						<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
							{rekapJenisPage} / {rekapJenisTotalPages}
						</span>
						<Button
							variant="secondary"
							disabled={rekapJenisPage >= rekapJenisTotalPages}
							onclick={() => { rekapJenisPage += 1; loadRekapJenis(); }}
							class="px-3 py-1.5 text-xs rounded-xl"
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- TAB 4: DATA STATISTIK KEPEGAWAIAN HASIL IMPORT -->
	{#if activeTab === 'statistik'}
		<div class="space-y-6">
			<!-- KPI SUMMARY CARDS -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
				<!-- Total Pegawai Import -->
				<div class="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-5 text-white shadow-sm flex flex-col justify-between">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold uppercase tracking-wider text-indigo-100">Total ASN Import</span>
						<span class="p-1.5 bg-white/20 rounded-xl text-xs">📋</span>
					</div>
					<div class="mt-3 flex items-baseline justify-between">
						<span class="text-3xl font-black">{(statData?.total_records ?? totalRecords).toLocaleString('id-ID')}</span>
						<span class="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">100%</span>
					</div>
					<span class="text-[11px] text-indigo-100/90 mt-2 truncate">
						{selectedBatch ? 'Batch Terpilih' : 'Seluruh Data Import Aktif'}
					</span>
				</div>

				<!-- Laki-Laki -->
				<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Laki-Laki</span>
						<span class="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold">♂</span>
					</div>
					<div class="mt-3 flex items-baseline justify-between">
						<span class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
							{(statData?.rekap_gender?.summary?.total_laki ?? 0).toLocaleString('id-ID')}
						</span>
						<span class="text-xs font-bold text-blue-600 dark:text-blue-400">
							{statData?.rekap_gender?.summary?.persen_laki ?? 0}%
						</span>
					</div>
					<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
						<div
							class="bg-blue-600 h-full rounded-full transition-all duration-500"
							style="width: {statData?.rekap_gender?.summary?.persen_laki ?? 0}%"
						></div>
					</div>
				</div>

				<!-- Perempuan -->
				<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Perempuan</span>
						<span class="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">♀</span>
					</div>
					<div class="mt-3 flex items-baseline justify-between">
						<span class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
							{(statData?.rekap_gender?.summary?.total_perempuan ?? 0).toLocaleString('id-ID')}
						</span>
						<span class="text-xs font-bold text-rose-600 dark:text-rose-400">
							{statData?.rekap_gender?.summary?.persen_perempuan ?? 0}%
						</span>
					</div>
					<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
						<div
							class="bg-rose-500 h-full rounded-full transition-all duration-500"
							style="width: {statData?.rekap_gender?.summary?.persen_perempuan ?? 0}%"
						></div>
					</div>
				</div>

				<!-- Pejabat Struktural (Eselon) -->
				<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pejabat Struktural</span>
						<span class="p-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold">🏛️</span>
					</div>
					<div class="mt-3 flex items-baseline justify-between">
						<span class="text-3xl font-black text-zinc-900 dark:text-zinc-50">
							{(statData?.rekap_jabatan_struktural?.summary?.total_terisi ?? 0).toLocaleString('id-ID')}
						</span>
						<span class="text-xs font-bold text-zinc-500 dark:text-zinc-400">
							/ {(statData?.rekap_jabatan_struktural?.summary?.total_formasi ?? 0)} Formasi
						</span>
					</div>
					<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
						<div
							class="bg-amber-500 h-full rounded-full transition-all duration-500"
							style="width: {statData?.rekap_jabatan_struktural?.summary?.persen_terisi ?? 0}%"
						></div>
					</div>
				</div>
			</div>

			<!-- SUB-NAVIGATION: 6 REKAP STATISTIK -->
			<div class="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6">
				<!-- Sub-tab Pills Toolbar -->
				<div class="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5 print:hidden">
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => { activeStatTab = 'gender'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'gender' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							🚻 1. Jenis Kelamin
						</button>
						<button
							type="button"
							onclick={() => { activeStatTab = 'golongan'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'golongan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							🎖️ 2. Golongan & Gender
						</button>
						<button
							type="button"
							onclick={() => { activeStatTab = 'pendidikan'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'pendidikan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							🎓 3. Pendidikan & Gender
						</button>
						<button
							type="button"
							onclick={() => { activeStatTab = 'eselon_formasi'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'eselon_formasi' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							🏛️ 4. Jabatan Struktural (Eselon)
						</button>
						<button
							type="button"
							onclick={() => { activeStatTab = 'eselon_gender'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'eselon_gender' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							👥 5. Pejabat Struktural & Gender
						</button>
						<button
							type="button"
							onclick={() => { activeStatTab = 'eselon_pendidikan'; }}
							class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all {activeStatTab === 'eselon_pendidikan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'}"
						>
							📚 6. Pendidikan Pejabat Struktural
						</button>
					</div>

					<!-- Action Buttons: Sync, Refresh, Print, Export -->
					<div class="flex items-center gap-2 self-end xl:self-auto">
						<button
							type="button"
							onclick={handleSyncEselon}
							disabled={syncLoading}
							title="Selaraskan Eselon dari Master Referensi Jabatan"
							class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition disabled:opacity-50"
						>
							<svg class="w-4 h-4 {syncLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Sinkronkan Eselon
						</button>

						<button
							type="button"
							onclick={loadStatistik}
							disabled={statLoading}
							title="Segarkan Data Statistik"
							class="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50"
						>
							<svg class="w-4 h-4 {statLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>

						<button
							type="button"
							onclick={printStatistik}
							title="Cetak Tabel / Simpan PDF"
							class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							Cetak
						</button>

						<button
							type="button"
							onclick={exportActiveStatCsv}
							title="Ekspor Data ke File CSV"
							class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
							</svg>
							Ekspor CSV
						</button>
					</div>
				</div>

				<!-- CONTENT TABLE CONTAINER -->
				{#if statLoading}
					<div class="py-16">
						<LoadingState message="Menghitung dan memuat data statistik import PNS..." />
					</div>
				{:else if statError}
					<ErrorState message={statError} onRetry={loadStatistik} />
				{:else if statData}
					<!-- 1. TAB STATISTIK: BERDASARKAN JENIS KELAMIN -->
					{#if activeStatTab === 'gender'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Statistik Pegawai Berdasarkan Jenis Kelamin
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Proporsi komposisi pegawai pria dan wanita dari hasil import data PNS
									</p>
								</div>
								<Badge variant="indigo">
									Total: {statData.rekap_gender.total.toLocaleString('id-ID')} Pegawai
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-4 w-12 text-center">No</th>
											<th class="py-3 px-4">Jenis Kelamin</th>
											<th class="py-3 px-4 text-center">Kode</th>
											<th class="py-3 px-4 text-right">Jumlah Pegawai</th>
											<th class="py-3 px-4 text-right">Persentase</th>
											<th class="py-3 px-4 w-56">Visualisasi Distribusi</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_gender.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
												<td class="py-3.5 px-4 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
													<div class="flex items-center gap-2">
														<span class="p-1 rounded-lg text-xs {item.kode === 'L' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}">
															{item.kode === 'L' ? '♂' : '♀'}
														</span>
														<span>{item.jenis_kelamin}</span>
													</div>
												</td>
												<td class="py-3.5 px-4 text-center font-mono text-zinc-500 font-bold">{item.kode}</td>
												<td class="py-3.5 px-4 text-right">
													<button
														type="button"
														onclick={() => openDrilldown({ stat_type: 'gender', gender: item.kode }, `Daftar Pegawai (${item.jenis_kelamin})`)}
														class="font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
														title="Klik untuk melihat daftar pegawai"
													>
														{item.jumlah.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3.5 px-4 text-right font-bold text-zinc-700 dark:text-zinc-300">
													{item.persentase}%
												</td>
												<td class="py-3.5 px-4">
													<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
														<div
															class="h-full rounded-full {item.kode === 'L' ? 'bg-blue-600' : 'bg-rose-500'}"
															style="width: {item.persentase}%"
														></div>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="3" class="py-3.5 px-4 text-center uppercase tracking-wider text-xs">Total Keseluruhan</td>
											<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
												{statData.rekap_gender.total.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right">100%</td>
											<td class="py-3.5 px-4"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

					<!-- 2. TAB STATISTIK: BERDASARKAN GOLONGAN RUANG DAN JENIS KELAMIN -->
					{:else if activeStatTab === 'golongan'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Statistik Pegawai Berdasarkan Golongan Ruang dan Jenis Kelamin
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Sebaran kepangkatan golongan ruang I/a sampai IV/e menurut jenis kelamin
									</p>
								</div>
								<Badge variant="indigo">
									Total: {statData.rekap_golongan_gender.summary.total_keseluruhan.toLocaleString('id-ID')} Pegawai
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-4 w-12 text-center">No</th>
											<th class="py-3 px-4">Golongan / Ruang</th>
											<th class="py-3 px-4">Pangkat</th>
											<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
											<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
											<th class="py-3 px-4 text-right font-black">Jumlah Total</th>
											<th class="py-3 px-4 w-44">Rasio L/P</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_golongan_gender.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
												<td class="py-3 px-4 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
													<span class="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-mono text-xs font-bold">
														{item.golongan}
													</span>
												</td>
												<td class="py-3 px-4 text-zinc-600 dark:text-zinc-300">{item.pangkat || '-'}</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.laki_laki === 0}
														onclick={() => openDrilldown({ stat_type: 'golongan', golongan: item.golongan, gender: 'L' }, `Pegawai Gol. ${item.golongan} (Laki-Laki)`)}
														class="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.laki_laki.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.perempuan === 0}
														onclick={() => openDrilldown({ stat_type: 'golongan', golongan: item.golongan, gender: 'P' }, `Pegawai Gol. ${item.golongan} (Perempuan)`)}
														class="font-bold text-rose-600 dark:text-rose-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.perempuan.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.total === 0}
														onclick={() => openDrilldown({ stat_type: 'golongan', golongan: item.golongan }, `Pegawai Golongan ${item.golongan}`)}
														class="font-black text-indigo-600 dark:text-indigo-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.total.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4">
													{#if item.total > 0}
														{@const pL = Math.round((item.laki_laki / item.total) * 100)}
														{@const pP = 100 - pL}
														<div class="flex items-center gap-1.5 w-full">
															<div class="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
																<div class="bg-blue-500 h-full" style="width: {pL}%" title="Laki-laki: {pL}%"></div>
																<div class="bg-rose-500 h-full" style="width: {pP}%" title="Perempuan: {pP}%"></div>
															</div>
															<span class="text-[10px] text-zinc-400 font-mono w-10 text-right">{pL}/{pP}</span>
														</div>
													{:else}
														<span class="text-zinc-300 dark:text-zinc-700 text-xs">-</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="3" class="py-3.5 px-4 text-center uppercase tracking-wider text-xs">Total Keseluruhan</td>
											<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
												{statData.rekap_golongan_gender.summary.total_laki.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
												{statData.rekap_golongan_gender.summary.total_perempuan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
												{statData.rekap_golongan_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

					<!-- 3. TAB STATISTIK: TINGKAT PENDIDIKAN BERDASARKAN JENIS KELAMIN -->
					{:else if activeStatTab === 'pendidikan'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Tingkat Pendidikan Berdasarkan Jenis Kelamin
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Kualifikasi jenjang pendidikan ASN mulai dari SD sampai S-3 per jenis kelamin
									</p>
								</div>
								<Badge variant="indigo">
									Total: {statData.rekap_pendidikan_gender.summary.total_keseluruhan.toLocaleString('id-ID')} Pegawai
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-4 w-12 text-center">No</th>
											<th class="py-3 px-4">Tingkat Pendidikan</th>
											<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
											<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
											<th class="py-3 px-4 text-right font-black">Jumlah Total</th>
											<th class="py-3 px-4 w-44">Rasio L/P</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_pendidikan_gender.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
												<td class="py-3 px-4 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
													<div class="flex items-center gap-2">
														<span class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs">🎓</span>
														<span>{item.tingkat_pendidikan}</span>
													</div>
												</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.laki_laki === 0}
														onclick={() => openDrilldown({ stat_type: 'pendidikan', tingkat_pendidikan_id: item.id, gender: 'L' }, `Pegawai Pendidikan ${item.tingkat_pendidikan} (Laki-Laki)`)}
														class="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.laki_laki.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.perempuan === 0}
														onclick={() => openDrilldown({ stat_type: 'pendidikan', tingkat_pendidikan_id: item.id, gender: 'P' }, `Pegawai Pendidikan ${item.tingkat_pendidikan} (Perempuan)`)}
														class="font-bold text-rose-600 dark:text-rose-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.perempuan.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4 text-right">
													<button
														type="button"
														disabled={item.total === 0}
														onclick={() => openDrilldown({ stat_type: 'pendidikan', tingkat_pendidikan_id: item.id }, `Pegawai Pendidikan ${item.tingkat_pendidikan}`)}
														class="font-black text-indigo-600 dark:text-indigo-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.total.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3 px-4">
													{#if item.total > 0}
														{@const pL = Math.round((item.laki_laki / item.total) * 100)}
														{@const pP = 100 - pL}
														<div class="flex items-center gap-1.5 w-full">
															<div class="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
																<div class="bg-blue-500 h-full" style="width: {pL}%" title="Laki-laki: {pL}%"></div>
																<div class="bg-rose-500 h-full" style="width: {pP}%" title="Perempuan: {pP}%"></div>
															</div>
															<span class="text-[10px] text-zinc-400 font-mono w-10 text-right">{pL}/{pP}</span>
														</div>
													{:else}
														<span class="text-zinc-300 dark:text-zinc-700 text-xs">-</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="2" class="py-3.5 px-4 text-center uppercase tracking-wider text-xs">Total Keseluruhan</td>
											<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
												{statData.rekap_pendidikan_gender.summary.total_laki.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
												{statData.rekap_pendidikan_gender.summary.total_perempuan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
												{statData.rekap_pendidikan_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

					<!-- 4. TAB STATISTIK: REKAP JABATAN STRUKTURAL (ESELON) - FORMASI & TERISI -->
					{:else if activeStatTab === 'eselon_formasi'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Rekapitulasi Jabatan Struktural (Eselon)
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Perbandingan jumlah formasi SOTK versus posisi yang telah terisi dari data import PNS
									</p>
								</div>
								<Badge variant="amber">
									Keterisian: {statData.rekap_jabatan_struktural.summary.persen_terisi}%
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-3 w-10 text-center">No</th>
											<th class="py-3 px-4">Eselon Struktural</th>
											<th class="py-3 px-4 text-right">Formasi SOTK</th>
											<th class="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">Terisi (PNS)</th>
											<th class="py-3 px-4 text-right text-amber-600 dark:text-amber-400">Kosong / Lowong</th>
											<th class="py-3 px-4 text-right">% Keterisian</th>
											<th class="py-3 px-4 w-36">Indikator</th>
											<th class="py-3 px-4 text-center w-56">Rincian Pegawai</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_jabatan_struktural.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors {expandedEselons[item.eselon] ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}">
												<td class="py-3.5 px-3 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
													<div class="flex items-center gap-2">
														<span class="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-black text-xs">
															Eselon {item.eselon}
														</span>
													</div>
												</td>
												<td class="py-3.5 px-4 text-right font-bold text-zinc-700 dark:text-zinc-300">
													{item.formasi.toLocaleString('id-ID')}
												</td>
												<td class="py-3.5 px-4 text-right">
													<button
														type="button"
														disabled={item.terisi === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Daftar Pejabat Eselon ${item.eselon}`)}
														class="font-black text-emerald-600 dark:text-emerald-400 hover:underline disabled:no-underline disabled:text-zinc-400"
														title="Buka daftar pegawai Eselon {item.eselon}"
													>
														{item.terisi.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3.5 px-4 text-right font-bold {item.kosong > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}">
													{item.kosong.toLocaleString('id-ID')}
												</td>
												<td class="py-3.5 px-4 text-right font-bold text-zinc-800 dark:text-zinc-200">
													{item.persen_terisi}%
												</td>
												<td class="py-3.5 px-4">
													<div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
														<div
															class="h-full rounded-full {item.persen_terisi >= 80 ? 'bg-emerald-500' : item.persen_terisi >= 50 ? 'bg-amber-500' : 'bg-rose-500'}"
															style="width: {item.persen_terisi}%"
														></div>
													</div>
												</td>
												<td class="py-3.5 px-4 text-center">
													<div class="inline-flex items-center gap-1.5">
														<button
															type="button"
															disabled={item.terisi === 0}
															onclick={() => toggleExpandEselon(item.eselon)}
															class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs {expandedEselons[item.eselon] ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60'} disabled:opacity-40 disabled:cursor-not-allowed"
															title="{expandedEselons[item.eselon] ? 'Tutup rincian pegawai' : `Tampilkan rincian daftar pegawai Eselon ${item.eselon}`}"
														>
															<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-200 {expandedEselons[item.eselon] ? 'rotate-180' : ''}">
																<polyline points="6 9 12 15 18 9"/>
															</svg>
															<span>{expandedEselons[item.eselon] ? 'Tutup' : `Tampilkan Rincian (${item.terisi})`}</span>
														</button>

														<button
															type="button"
															disabled={item.terisi === 0}
															onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Rincian Pejabat Eselon ${item.eselon}`)}
															class="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
															title="Buka rincian pegawai di jendela modal"
														>
															<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
														</button>
													</div>
												</td>
											</tr>

											<!-- BARIS EXPANDABLE RINCIAN PEGAWAI BERDASARKAN ESELON -->
											{#if expandedEselons[item.eselon]}
												<tr class="bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50">
													<td colspan="8" class="p-3 sm:p-5">
														<div class="rounded-2xl bg-white dark:bg-zinc-900 border border-indigo-200/80 dark:border-indigo-900/60 p-4 sm:p-5 shadow-xs space-y-4">
															<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
																<div class="flex items-center gap-2.5">
																	<span class="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
																		👥
																	</span>
																	<div>
																		<h4 class="font-black text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
																			<span>Rincian Pejabat Definitif — Eselon {item.eselon}</span>
																			<span class="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-black">
																				{item.terisi} Pegawai
																			</span>
																		</h4>
																		<p class="text-xs text-zinc-500">
																			Daftar nama dan jabatan definitif pegawai hasil import data PNS
																		</p>
																	</div>
																</div>

																<div class="flex items-center gap-2">
																	{#if (eselonPegawaiData[item.eselon]?.list?.length ?? 0) > 0}
																		<button
																			type="button"
																			onclick={() => exportSingleEselonCsv(item.eselon, eselonPegawaiData[item.eselon].list)}
																			class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition shadow-xs"
																			title="Unduh daftar rincian pejabat eselon ini ke file CSV"
																		>
																			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
																			Ekspor CSV
																		</button>
																	{/if}

																	<button
																		type="button"
																		onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Rincian Pejabat Eselon ${item.eselon}`)}
																		class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition shadow-xs"
																		title="Buka rincian lengkap dalam jendela modal dialog"
																	>
																		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
																		Buka Modal
																	</button>

																	<button
																		type="button"
																		onclick={() => toggleExpandEselon(item.eselon)}
																		class="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
																		title="Tutup rincian"
																	>
																		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
																	</button>
																</div>
															</div>

															{#if eselonPegawaiData[item.eselon]?.loading}
																<div class="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
																	<span class="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
																	<span>Memuat rincian pejabat Eselon {item.eselon}...</span>
																</div>
															{:else if eselonPegawaiData[item.eselon]?.error}
																<div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600">
																	{eselonPegawaiData[item.eselon].error}
																</div>
															{:else if !eselonPegawaiData[item.eselon]?.list || eselonPegawaiData[item.eselon].list.length === 0}
																<p class="py-4 text-center text-xs text-zinc-400 italic">
																	Tidak ada data pejabat definitif yang tercatat pada Eselon {item.eselon}.
																</p>
															{:else}
																<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
																	<table class="w-full text-left text-xs border-collapse">
																		<thead class="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-bold text-[10px] uppercase border-b border-zinc-200 dark:border-zinc-800">
																			<tr>
																				<th class="py-2.5 px-3 w-10 text-center">No</th>
																				<th class="py-2.5 px-3">Nama Pejabat & NIP</th>
																				<th class="py-2.5 px-3">Jabatan Definitif</th>
																				<th class="py-2.5 px-3">Unit Organisasi</th>
																				<th class="py-2.5 px-3 text-center">Gol</th>
																				<th class="py-2.5 px-3 text-center">JK</th>
																				<th class="py-2.5 px-3">Pendidikan</th>
																				<th class="py-2.5 px-3 text-center">Aksi</th>
																			</tr>
																		</thead>
																		<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
																			{#each eselonPegawaiData[item.eselon].list as peg, pIdx (peg.id)}
																				<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
																					<td class="py-2.5 px-3 text-center text-zinc-400 font-bold">{pIdx + 1}</td>
																					<td class="py-2.5 px-3">
																						<div class="font-bold text-zinc-900 dark:text-zinc-100">
																							{peg.gelar_depan ? peg.gelar_depan + ' ' : ''}{peg.nama || '-'}{peg.gelar_belakang ? ', ' + peg.gelar_belakang : ''}
																						</div>
																						<div class="font-mono text-[11px] text-zinc-400">
																							{(peg.nip_baru || '-').replace(/^'+/, '')}
																						</div>
																					</td>
																					<td class="py-2.5 px-3 font-semibold text-zinc-800 dark:text-zinc-200">
																						{peg.jabatan_nama || '-'}
																					</td>
																					<td class="py-2.5 px-3 text-zinc-600 dark:text-zinc-300 truncate max-w-[220px]" title={peg.unor_nama}>
																						{peg.unor_nama || '-'}
																					</td>
																					<td class="py-2.5 px-3 text-center whitespace-nowrap">
																						<span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
																							{peg.gol_akhir_nama || '-'}
																						</span>
																					</td>
																					<td class="py-2.5 px-3 text-center">
																						<span class="px-1.5 py-0.5 rounded-md text-[10px] font-black {['M', 'L', '1'].includes(String(peg.jenis_kelamin).toUpperCase()) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}">
																							{['M', 'L', '1'].includes(String(peg.jenis_kelamin).toUpperCase()) ? 'L' : 'P'}
																						</span>
																					</td>
																					<td class="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
																						{peg.tingkat_pendidikan_nama || '-'}
																					</td>
																					<td class="py-2.5 px-3 text-center">
																						<button
																							type="button"
																							onclick={() => openDetail(peg)}
																							class="px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
																						>
																							Detail
																						</button>
																					</td>
																				</tr>
																			{/each}
																		</tbody>
																	</table>
																</div>
															{/if}
														</div>
													</td>
												</tr>
											{/if}
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="2" class="py-3.5 px-4 text-center uppercase tracking-wider text-xs">Total Keseluruhan</td>
											<td class="py-3.5 px-4 text-right">{statData.rekap_jabatan_struktural.summary.total_formasi.toLocaleString('id-ID')}</td>
											<td class="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
												{statData.rekap_jabatan_struktural.summary.total_terisi.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400">
												{statData.rekap_jabatan_struktural.summary.total_kosong.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
												{statData.rekap_jabatan_struktural.summary.persen_terisi}%
											</td>
											<td class="py-3.5 px-4" colspan="2"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

					<!-- 5. TAB STATISTIK: REKAP PEJABAT STRUKTURAL (ESELON) BERDASARKAN JENIS KELAMIN -->
					{:else if activeStatTab === 'eselon_gender'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Rekap Pejabat Struktural (Eselon) Berdasarkan Jenis Kelamin
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Distribusi pejabat struktural pria dan wanita pada setiap jenjang eselon
									</p>
								</div>
								<Badge variant="indigo">
									Total Pejabat: {statData.rekap_struktural_gender.summary.total_keseluruhan.toLocaleString('id-ID')} Orang
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-4 w-12 text-center">No</th>
											<th class="py-3 px-4">Eselon Struktural</th>
											<th class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">Laki-Laki</th>
											<th class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Perempuan</th>
											<th class="py-3 px-4 text-right font-black">Total Pejabat</th>
											<th class="py-3 px-4 w-44">Rasio L/P</th>
											<th class="py-3 px-4 text-center w-44">Rincian Pegawai</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_struktural_gender.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
												<td class="py-3.5 px-4 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
													<span class="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-black text-xs">
														Eselon {item.eselon}
													</span>
												</td>
												<td class="py-3.5 px-4 text-right">
													<button
														type="button"
														disabled={item.laki_laki === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon_gender', eselon: item.eselon, gender: 'L' }, `Pejabat Eselon ${item.eselon} (Laki-Laki)`)}
														class="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.laki_laki.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3.5 px-4 text-right">
													<button
														type="button"
														disabled={item.perempuan === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon_gender', eselon: item.eselon, gender: 'P' }, `Pejabat Eselon ${item.eselon} (Perempuan)`)}
														class="font-bold text-rose-600 dark:text-rose-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.perempuan.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3.5 px-4 text-right">
													<button
														type="button"
														disabled={item.total === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Pejabat Eselon ${item.eselon}`)}
														class="font-black text-indigo-600 dark:text-indigo-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.total.toLocaleString('id-ID')}
													</button>
												</td>
												<td class="py-3.5 px-4">
													{#if item.total > 0}
														{@const pL = Math.round((item.laki_laki / item.total) * 100)}
														{@const pP = 100 - pL}
														<div class="flex items-center gap-1.5 w-full">
															<div class="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
																<div class="bg-blue-500 h-full" style="width: {pL}%" title="Laki-laki: {pL}%"></div>
																<div class="bg-rose-500 h-full" style="width: {pP}%" title="Perempuan: {pP}%"></div>
															</div>
															<span class="text-[10px] text-zinc-400 font-mono w-10 text-right">{pL}/{pP}</span>
														</div>
													{:else}
														<span class="text-zinc-300 dark:text-zinc-700 text-xs">-</span>
													{/if}
												</td>
												<td class="py-3.5 px-4 text-center">
													<button
														type="button"
														disabled={item.total === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Rincian Pejabat Eselon ${item.eselon}`)}
														class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
														title="Tampilkan rincian daftar pegawai Eselon {item.eselon}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
														<span>Tampilkan Rincian</span>
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="2" class="py-3.5 px-4 text-center uppercase tracking-wider text-xs">Total Keseluruhan</td>
											<td class="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400">
												{statData.rekap_struktural_gender.summary.total_laki.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">
												{statData.rekap_struktural_gender.summary.total_perempuan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
												{statData.rekap_struktural_gender.summary.total_keseluruhan.toLocaleString('id-ID')}
											</td>
											<td class="py-3.5 px-4" colspan="2"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

					<!-- 6. TAB STATISTIK: PENDIDIKAN BERDASARKAN PEJABAT STRUKTURAL -->
					{:else if activeStatTab === 'eselon_pendidikan'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-base font-black text-zinc-900 dark:text-zinc-50">
										Pendidikan Berdasarkan Pejabat Struktural
									</h3>
									<p class="text-xs text-zinc-500 mt-0.5">
										Matriks silang tingkat pendidikan yang dimiliki pejabat struktural pada setiap eselon
									</p>
								</div>
								<Badge variant="indigo">
									Total Pejabat: {statData.rekap_struktural_pendidikan.summary.total_keseluruhan.toLocaleString('id-ID')} Orang
								</Badge>
							</div>

							<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
								<table class="w-full text-left text-xs sm:text-sm border-collapse">
									<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-200/80 dark:border-zinc-800">
										<tr>
											<th class="py-3 px-3 w-10 text-center">No</th>
											<th class="py-3 px-3 min-w-[120px]">Eselon</th>
											{#each statData.rekap_struktural_pendidikan.columns as col}
												<th class="py-3 px-3 text-center">{col.label}</th>
											{/each}
											<th class="py-3 px-3 text-right font-black bg-zinc-100/60 dark:bg-zinc-800/80 min-w-[90px]">Total</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
										{#each statData.rekap_struktural_pendidikan.items as item (item.no)}
											<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
												<td class="py-3 px-3 text-center text-zinc-400 font-bold">{item.no}</td>
												<td class="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
													<span class="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-black text-xs">
														Eselon {item.eselon}
													</span>
												</td>
												{#each statData.rekap_struktural_pendidikan.columns as col}
													{@const cnt = item.counts[col.id] || 0}
													<td class="py-3 px-3 text-center font-bold">
														{#if cnt > 0}
															<button
																type="button"
																onclick={() => openDrilldown({ stat_type: 'eselon_pendidikan', eselon: item.eselon, tingkat_pendidikan_id: col.id }, `Pejabat Eselon ${item.eselon} (${col.label})`)}
																class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer font-black"
															>
																{cnt}
															</button>
														{:else}
															<span class="text-zinc-300 dark:text-zinc-700 font-normal">-</span>
														{/if}
													</td>
												{/each}
												<td class="py-3 px-3 text-right font-black bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-50">
													<button
														type="button"
														disabled={item.total === 0}
														onclick={() => openDrilldown({ stat_type: 'eselon', eselon: item.eselon }, `Pejabat Eselon ${item.eselon}`)}
														class="text-indigo-600 dark:text-indigo-400 hover:underline disabled:no-underline disabled:text-zinc-400"
													>
														{item.total}
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
									<tfoot class="bg-zinc-50 dark:bg-zinc-800/80 font-black text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-200 dark:border-zinc-700">
										<tr>
											<td colspan="2" class="py-3 px-3 text-center uppercase tracking-wider text-xs">Total</td>
											{#each statData.rekap_struktural_pendidikan.columns as col}
												<td class="py-3 px-3 text-center text-indigo-600 dark:text-indigo-400">
													{statData.rekap_struktural_pendidikan.summary.counts[col.id] || 0}
												</td>
											{/each}
											<td class="py-3 px-3 text-right text-indigo-700 dark:text-indigo-300 bg-zinc-100/80 dark:bg-zinc-800">
												{statData.rekap_struktural_pendidikan.summary.total_keseluruhan}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Modal Detail 71 Kolom PNS -->
{#if showDetailModal && activeDetail}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full">
							Detail Data Import
						</span>
						<span class="text-xs text-zinc-400 font-mono">ID: {activeDetail.id}</span>
					</div>
					<h3 class="text-xl font-black text-zinc-900 dark:text-zinc-50">
						{activeDetail.gelar_depan ? activeDetail.gelar_depan + ' ' : ''}{activeDetail.nama || '-'}{activeDetail.gelar_belakang ? ', ' + activeDetail.gelar_belakang : ''}
					</h3>
				</div>
				<button
					type="button"
					onclick={() => { showDetailModal = false; }}
					class="p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<!-- Modal Body (71 Attributes grouped) -->
			<div class="p-8 overflow-y-auto space-y-6 text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
				<!-- Group 1: Identitas & Biodata -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">1. Identitas & Biodata</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">PNS ID</span><p class="font-mono text-xs">{activeDetail.pns_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIP Baru</span><p class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{activeDetail.nip_baru || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIP Lama</span><p class="font-mono text-xs">{activeDetail.nip_lama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NIK</span><p class="font-mono text-xs">{activeDetail.nik || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tempat Lahir</span><p class="font-medium">{activeDetail.tempat_lahir || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal Lahir</span><p class="font-medium">{activeDetail.tanggal_lahir || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Kelamin</span><p class="font-medium">{activeDetail.jenis_kelamin || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Agama</span><p class="font-medium">{activeDetail.agama_nama || activeDetail.agama_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Status Kawin</span><p class="font-medium">{activeDetail.jenis_kawin_nama || activeDetail.jenis_kawin_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">No HP</span><p class="font-medium">{activeDetail.nomor_hp || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Email</span><p class="font-medium">{activeDetail.email || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Email Gov</span><p class="font-medium">{activeDetail.email_gov || '-'}</p></div>
						<div class="col-span-2 sm:col-span-4"><span class="text-[11px] text-zinc-400 block font-bold">Alamat</span><p class="font-medium">{activeDetail.alamat || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">NPWP</span><p class="font-mono text-xs">{activeDetail.npwp_nomor || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">BPJS</span><p class="font-mono text-xs">{activeDetail.bpjs || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Valid NIK / Flag IKD</span><p class="font-medium">{activeDetail.is_valid_nik || '-'} / {activeDetail.flag_ikd || '-'}</p></div>
					</div>
				</div>

				<!-- Group 2: Status & Kepegawaian -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">2. Status & SK Kepegawaian</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Pegawai</span><p class="font-medium">{activeDetail.jenis_pegawai_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Kedudukan PNS</span><p class="font-medium">{activeDetail.kedudukan_pns_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Status CPNS/PNS</span><p class="font-bold text-emerald-600">{formatStatusText(activeDetail.status_cpns_pns)}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Kartu ASN Virtual</span><p class="font-medium">{activeDetail.kartu_asn_virtual || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Nomor SK CPNS</span><p class="font-medium text-xs">{activeDetail.nomor_sk_cpns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal & TMT CPNS</span><p class="font-medium text-xs">{activeDetail.tanggal_sk_cpns || '-'} / {activeDetail.tmt_cpns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Nomor SK PNS</span><p class="font-medium text-xs">{activeDetail.nomor_sk_pns || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tanggal & TMT PNS</span><p class="font-medium text-xs">{activeDetail.tanggal_sk_pns || '-'} / {activeDetail.tmt_pns || '-'}</p></div>
					</div>
				</div>

				<!-- Group 3: Pangkat, Golongan & Masa Kerja -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">3. Pangkat, Golongan & Masa Kerja</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Golongan Awal</span><p class="font-medium">{activeDetail.gol_awal_nama || activeDetail.gol_awal_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Golongan Akhir</span><p class="font-medium font-bold text-indigo-600">{activeDetail.gol_akhir_nama || activeDetail.gol_akhir_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">TMT Golongan</span><p class="font-medium">{activeDetail.tmt_golongan || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Masa Kerja (Thn/Bln)</span><p class="font-medium">{activeDetail.mk_tahun || '0'} Thn {activeDetail.mk_bulan || '0'} Bln</p></div>
					</div>
				</div>

				<!-- Group 4: Jabatan & Unit Organisasi -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">4. Jabatan & Unit Organisasi</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Jenis Jabatan</span><p class="font-medium">{activeDetail.jenis_jabatan_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Jabatan</span><p class="font-bold text-zinc-900 dark:text-zinc-50">{activeDetail.jabatan_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">TMT Jabatan / Eselon</span><p class="font-medium">{activeDetail.tmt_jabatan || '-'} ({activeDetail.eselon_nama || '-'})</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Unit Organisasi (UNOR)</span><p class="font-semibold">{activeDetail.unor_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">UNOR ID</span><p class="font-mono text-xs">{activeDetail.unor_id || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Lokasi Kerja</span><p class="font-medium">{activeDetail.lokasi_kerja_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Instansi Induk</span><p class="font-medium">{activeDetail.instansi_induk_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Satuan Kerja Induk</span><p class="font-medium">{activeDetail.satuan_kerja_induk_nama || '-'}</p></div>
					</div>
				</div>

				<!-- Group 5: Pendidikan & Lainnya -->
				<div class="space-y-3 pt-6">
					<h4 class="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">5. Pendidikan & Arsip CSV</h4>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tingkat Pendidikan</span><p class="font-medium">{activeDetail.tingkat_pendidikan_nama || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Jurusan / Pendidikan</span><p class="font-medium">{activeDetail.pendidikan_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">Tahun Lulus</span><p class="font-medium">{activeDetail.tahun_lulus || '-'}</p></div>
						<div class="col-span-2"><span class="text-[11px] text-zinc-400 block font-bold">Nama Sekolah / Universitas</span><p class="font-medium">{activeDetail.nama_sekolah || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">KPKN</span><p class="font-medium">{activeDetail.kpkn_nama || '-'}</p></div>
						<div><span class="text-[11px] text-zinc-400 block font-bold">File Sumber</span><p class="font-mono text-xs">{activeDetail.file_name || '-'}</p></div>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
				<Button variant="secondary" onclick={() => { showDetailModal = false; }}>
					Tutup
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
{#if showDeleteConfirm}
	<ConfirmModal
		title={isBatchDelete ? 'Hapus Seluruh Batch Import?' : 'Hapus Data PNS Ini?'}
		message={isBatchDelete
			? `Apakah Anda yakin ingin menghapus seluruh data yang diimport dari file "${itemToDelete?.fileName || 'CSV'}"? Semua baris dalam batch ini akan dihapus.`
			: `Apakah Anda yakin ingin menghapus data PNS "${itemToDelete?.nama || ''}" (${itemToDelete?.nip_baru || ''})?`}
		loading={deleteLoading}
		onConfirm={handleDelete}
		onCancel={() => { showDeleteConfirm = false; itemToDelete = null; }}
	/>
{/if}

<!-- Modal Drilldown Daftar Pegawai Statistik -->
{#if showDrilldownModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<span class="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full">
							Drilldown Statistik PNS
						</span>
						<span class="text-xs text-zinc-400 font-bold">
							{drilldownTotalRecords.toLocaleString('id-ID')} Pegawai Ditemukan
						</span>
					</div>
					<h3 class="text-lg font-black text-zinc-900 dark:text-zinc-50">
						{drilldownTitle}
					</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if drilldownList.length > 0}
						<button
							type="button"
							onclick={exportDrilldownCsv}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-xs"
							title="Unduh daftar rincian pegawai yang sedang ditampilkan ke CSV"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
							Ekspor CSV
						</button>
					{/if}
					<button
						type="button"
						onclick={() => { showDrilldownModal = false; }}
						class="p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>

			<!-- Search Bar -->
			<div class="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4 bg-white dark:bg-zinc-900">
				<div class="relative flex-1">
					<div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						type="text"
						placeholder="Cari NIP, nama, atau unit kerja..."
						bind:value={drilldownSearch}
						oninput={handleDrilldownSearch}
						class="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
					/>
				</div>
			</div>

			<!-- Modal Body (Table) -->
			<div class="p-6 overflow-y-auto flex-1 space-y-4">
				{#if drilldownLoading}
					<div class="py-12">
						<LoadingState message="Memuat daftar pegawai..." />
					</div>
				{:else if drilldownList.length === 0}
					<div class="py-12">
						<EmptyState message="Tidak ada data pegawai yang sesuai kriteria ini." />
					</div>
				{:else}
					<div class="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
						<table class="w-full text-left text-xs border-collapse">
							<thead class="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-bold text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
								<tr>
									<th class="py-3 px-3 w-10 text-center">No</th>
									<th class="py-3 px-3">Pegawai</th>
									<th class="py-3 px-3">Gol / Pangkat</th>
									<th class="py-3 px-3">Jabatan & Eselon</th>
									<th class="py-3 px-3">Unit Organisasi</th>
									<th class="py-3 px-3 text-center">JK</th>
									<th class="py-3 px-3">Pendidikan</th>
									<th class="py-3 px-3 text-center">Aksi</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
								{#each drilldownList as item, index (item.id)}
									<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
										<td class="py-2.5 px-3 text-center text-zinc-400 font-bold">
											{(drilldownPage - 1) * drilldownLimit + index + 1}
										</td>
										<td class="py-2.5 px-3">
											<div class="font-bold text-zinc-900 dark:text-zinc-50">
												{item.gelar_depan ? item.gelar_depan + ' ' : ''}{item.nama || '-'}{item.gelar_belakang ? ', ' + item.gelar_belakang : ''}
											</div>
											<div class="font-mono text-[11px] text-zinc-400">
												{item.nip_baru || '-'}
											</div>
										</td>
										<td class="py-2.5 px-3 whitespace-nowrap">
											<span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
												{item.gol_akhir_nama || '-'}
											</span>
										</td>
										<td class="py-2.5 px-3">
											<div class="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
												{item.jabatan_nama || '-'}
											</div>
											{#if item.eselon_nama}
												<span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
													Eselon {item.eselon_nama}
												</span>
											{/if}
										</td>
										<td class="py-2.5 px-3">
											<div class="text-zinc-600 dark:text-zinc-300 truncate max-w-[200px]" title={item.unor_nama}>
												{item.unor_nama || '-'}
											</div>
										</td>
										<td class="py-2.5 px-3 text-center">
											<span class="p-1 rounded-md text-[11px] font-bold {['M', 'L', '1'].includes(String(item.jenis_kelamin).toUpperCase()) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}">
												{['M', 'L', '1'].includes(String(item.jenis_kelamin).toUpperCase()) ? 'L' : 'P'}
											</span>
										</td>
										<td class="py-2.5 px-3">
											<span class="text-zinc-700 dark:text-zinc-300">
												{item.tingkat_pendidikan_nama || '-'}
											</span>
										</td>
										<td class="py-2.5 px-3 text-center">
											<button
												type="button"
												onclick={() => { openDetail(item); }}
												class="px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition"
											>
												Detail
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Modal Footer & Pagination -->
			<div class="px-8 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Button
						variant="secondary"
						disabled={drilldownPage <= 1 || drilldownLoading}
						onclick={() => { drilldownPage -= 1; loadDrilldownData(); }}
						class="px-3 py-1.5 text-xs rounded-xl"
					>
						Sebelumnya
					</Button>
					<span class="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
						Halaman {drilldownPage} dari {drilldownTotalPages}
					</span>
					<Button
						variant="secondary"
						disabled={drilldownPage >= drilldownTotalPages || drilldownLoading}
						onclick={() => { drilldownPage += 1; loadDrilldownData(); }}
						class="px-3 py-1.5 text-xs rounded-xl"
					>
						Selanjutnya
					</Button>
				</div>
				<Button variant="secondary" onclick={() => { showDrilldownModal = false; }}>
					Tutup
				</Button>
			</div>
		</div>
	</div>
{/if}
