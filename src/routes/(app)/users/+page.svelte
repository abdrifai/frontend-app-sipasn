<script>
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LoadingState from '$lib/components/feedback/LoadingState.svelte';
	import ErrorState from '$lib/components/feedback/ErrorState.svelte';
	import EmptyState from '$lib/components/feedback/EmptyState.svelte';
	import ConfirmModal from '$lib/components/feedback/ConfirmModal.svelte';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore';
	import { onMount } from 'svelte';

	let users = $state([]);
	let roles = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let search = $state('');
	let page = $state(1);
	let totalPages = $state(1);

	// Modal state (Add/Edit)
	let showModal = $state(false);
	let isEdit = $state(false);
	let formLoading = $state(false);
	let fieldErrors = $state({});
	let selectedUser = $state({
		username: '',
		nama_lengkap: '',
		email: '',
		password: '',
		nik: '',
		role_id: ''
	});

	// Delete confirm state
	let showDeleteConfirm = $state(false);
	let userToDelete = $state(null);
	let deleteLoading = $state(false);

	async function loadUsers() {
		loading = true;
		error = null;
		try {
			const res = await api(`/users?page=${page}&search=${search}`);
			users = res.data;
			totalPages = res.meta.totalPages;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadRoles() {
		try {
			const res = await api('/users/roles');
			roles = res.data;
		} catch (err) {
			console.error('Failed to load roles');
		}
	}

	onMount(() => {
		loadUsers();
		loadRoles();
	});

	function handleSearch() {
		page = 1;
		loadUsers();
	}

	function openAddModal() {
		isEdit = false;
		fieldErrors = {};
		selectedUser = { username: '', nama_lengkap: '', email: '', password: '', nik: '', role_id: '' };
		showModal = true;
	}

	function openEditModal(user) {
		isEdit = true;
		fieldErrors = {};
		selectedUser = { ...user, role_id: user.role_id?.toString() || '' };
		// Password should be empty when editing
		selectedUser.password = '';
		showModal = true;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		formLoading = true;
		fieldErrors = {};
		try {
			if (isEdit) {
				// Hanya kirim field yang diizinkan untuk update
				const payload = {
					nama_lengkap: selectedUser.nama_lengkap,
					username: selectedUser.username,
					email: selectedUser.email,
					nik: selectedUser.nik,
					role_id: selectedUser.role_id ? parseInt(selectedUser.role_id) : null
				};
				
				// Hanya kirim password jika tidak kosong
				if (selectedUser.password) {
					payload.password = selectedUser.password;
				}
				
				await api(`/users/${selectedUser.id}`, {
					method: 'PUT',
					body: JSON.stringify(payload)
				});
			} else {
				await api('/users', {
					method: 'POST',
					body: JSON.stringify(selectedUser)
				});
			}
			showModal = false;
			toast.success(isEdit ? 'Data pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
			loadUsers();
		} catch (err) {
			if (err.statusCode === 422) {
				fieldErrors = err.errors.reduce((acc, curr) => {
					acc[curr.field] = curr.message;
					return acc;
				}, {});
			} else {
				alert(err.message);
			}
		} finally {
			formLoading = false;
		}
	}

	function confirmDelete(user) {
		userToDelete = user;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!userToDelete) return;
		deleteLoading = true;
		try {
			await api(`/users/${userToDelete.id}`, { method: 'DELETE' });
			showDeleteConfirm = false;
			toast.success(`Akun ${userToDelete.nama_lengkap} berhasil dihapus`);
			userToDelete = null;
			loadUsers();
		} catch (err) {
			alert(err.message);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="space-y-1">
				<h2 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Manajemen User</h2>
				<p class="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">Kelola akses dan data pengguna sistem.</p>
			</div>
			<Button variant="primary" onclick={openAddModal} class="px-6 py-2.5 rounded-2xl shadow-xl shadow-indigo-500/20">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				Tambah User
			</Button>
		</div>

		<!-- Main Card -->
		<div class="p-4 sm:p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
			<!-- Toolbar -->
			<div class="flex flex-col sm:flex-row gap-4 mb-10">
				<div class="relative flex-1 group">
					<div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input 
						type="text" 
						placeholder="Cari nama, email, atau NIK..." 
						bind:value={search}
						oninput={handleSearch}
						class="w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-medium"
					/>
				</div>
				<button 
					onclick={loadUsers}
					class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
					aria-label="Segarkan data"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={loading ? 'animate-spin' : ''}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
				</button>
			</div>

			<!-- User List -->
			{#if loading}
				<div class="py-20">
					<LoadingState message="Menghubungkan ke pusat data..." />
				</div>
			{:else if error}
				<div class="py-12">
					<ErrorState message={error} onRetry={loadUsers} />
				</div>
			{:else if users.length === 0}
				<div class="py-20">
					<EmptyState message={search ? 'Tidak ditemukan user yang cocok dengan pencarian Anda.' : 'Belum ada data user tersimpan.'} />
				</div>
			{:else}
				<div class="overflow-x-auto -mx-4 sm:mx-0">
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-zinc-100 dark:border-zinc-800">
								<th class="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data Pegawai</th>
								<th class="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden lg:table-cell">Identitas</th>
								<th class="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hak Akses</th>
								<th class="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Opsi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-50 dark:divide-zinc-800/30">
							{#each users as user}
								<tr class="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-all duration-300">
									<td class="px-4 py-6">
										<div class="flex items-center gap-4">
											<div class="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 group-hover:bg-indigo-600 transition-all duration-500 group-hover:text-white group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
												{user.nama_lengkap.charAt(0)}
											</div>
											<div class="space-y-0.5">
												<p class="text-sm font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.nama_lengkap}</p>
												<p class="text-[11px] font-medium text-zinc-400">{user.email || 'tanpa-email@sipasn.go.id'}</p>
											</div>
										</div>
									</td>
									<td class="px-4 py-6 hidden lg:table-cell">
										<div class="space-y-1">
											<p class="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 9h10"/><path d="M7 13h10"/><path d="M7 17h10"/></svg>
												{user.nik || 'NIK Belum Set'}
											</p>
											<p class="text-[10px] font-semibold text-zinc-400 tracking-wide">ID: {user.username}</p>
										</div>
									</td>
									<td class="px-4 py-6">
										<Badge variant={user.role === 'admin' || user.role === 'super admin' ? 'indigo' : 'neutral'}>
											{user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Pegawai'}
										</Badge>
									</td>
									<td class="px-4 py-6 text-right">
										<div class="flex items-center justify-end gap-1">
											<button 
												onclick={() => openEditModal(user)}
												class="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm bg-zinc-50 dark:bg-zinc-800/50"
												title="Edit User"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
											</button>
											<button 
												onclick={() => confirmDelete(user)}
												class="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm bg-zinc-50 dark:bg-zinc-800/50"
												title="Delete User"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				<div class="flex flex-col sm:flex-row items-center justify-between pt-10 mt-6 border-t border-zinc-50 dark:border-zinc-800 gap-4">
					<p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Halaman {page} dari {totalPages}</p>
					<div class="flex gap-2">
						<Button 
							variant="secondary" 
							disabled={page === 1} 
							onclick={() => { page--; loadUsers(); }}
							class="px-5 text-xs font-bold py-2 rounded-xl"
						>
							Sebelumnya
						</Button>
						<Button 
							variant="secondary" 
							disabled={page >= totalPages} 
							onclick={() => { page++; loadUsers(); }}
							class="px-5 text-xs font-bold py-2 rounded-xl"
						>
							Berikutnya
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Add/Edit Modal -->
	{#if showModal}
		<div class="fixed inset-0 z-[100] flex items-center justify-center p-6">
			<div role="button" tabindex="0" class="absolute inset-0 bg-zinc-950/40 backdrop-blur-md animate-in fade-in" onclick={() => !formLoading && (showModal = false)} onkeydown={(e) => e.key === 'Escape' && (showModal = false)}></div>
			
			<div class="relative bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-300">
				<div class="p-8 sm:p-12">
					<header class="flex items-center justify-between mb-10">
						<div class="space-y-1">
							<h3 class="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
								{isEdit ? 'Ubah Informasi User' : 'Daftarkan User Baru'}
							</h3>
							<p class="text-sm font-medium text-zinc-500">Pastikan data yang dimasukkan valid sesuai identitas.</p>
						</div>
						<button 
							onclick={() => showModal = false}
							class="w-11 h-11 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:rotate-90 transition-all duration-500"
							aria-label="Tutup modal"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</header>

					<form onsubmit={handleSubmit} class="space-y-7">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<Input label="Nama Lengkap" bind:value={selectedUser.nama_lengkap} error={fieldErrors.nama_lengkap} required placeholder="Sesuai NIK" />
							<Input label="Username" bind:value={selectedUser.username} error={fieldErrors.username} required placeholder="username_login" />
						</div>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<Input label="Email Institusi" type="email" bind:value={selectedUser.email} error={fieldErrors.email} placeholder="email@sipasn.go.id" />
							<Input label="NIK (KTP)" bind:value={selectedUser.nik} error={fieldErrors.nik} placeholder="16 Digit NIK" />
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div class="flex flex-col gap-2">
								<label for="role" class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Role & Akses</label>
								<div class="relative">
									<select id="role" bind:value={selectedUser.role_id} class="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 font-bold appearance-none">
										<option value="">Pilih Hak Akses...</option>
										{#each roles as role}
											<option value={role.id.toString()}>{role.name}</option>
										{/each}
									</select>
									<div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
									</div>
								</div>
								{#if fieldErrors.role_id}
									<p class="text-xs text-rose-500 font-medium ml-1">{fieldErrors.role_id}</p>
								{/if}
							</div>
							<Input 
								label={isEdit ? 'Ubah Password' : 'Password Setup'} 
								type="password" 
								bind:value={selectedUser.password} 
								error={fieldErrors.password}
								required={!isEdit} 
								placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Min. 8 karakter'} 
							/>
						</div>

						<div class="flex gap-4 pt-4">
							<Button variant="ghost" class="flex-1 py-4 h-auto rounded-2xl font-bold" onclick={() => showModal = false}>Tutup</Button>
							<Button type="submit" variant="primary" class="flex-[3] py-4 h-auto rounded-2xl shadow-2xl shadow-indigo-500/30 font-black tracking-tight" loading={formLoading}>
								{isEdit ? 'PERBARUI DATA' : 'DAFTARKAN PENGGUNA'}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Confirm Modal -->
	<ConfirmModal 
		bind:show={showDeleteConfirm}
		title="Hapus Pengguna?"
		message="Tindakan ini akan menonaktifkan akun {userToDelete?.nama_lengkap}. Data akan diarsipkan dan tidak dapat dipulihkan secara instan."
		confirmText="Ya, Hapus Akun"
		loading={deleteLoading}
		onConfirm={handleDelete}
	/>
