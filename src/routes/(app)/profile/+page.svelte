<script>
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import CropModal from '$lib/components/ui/CropModal.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { api } from '$lib/utils/api.js';
	import { toast } from '$lib/stores/toastStore';

	let loading = $state(false);
	let fieldErrors = $state({});
	let formData = $state({
		nama_lengkap: '',
		email: '',
		nik: '',
		password: ''
	});
	
	let photoFile = $state(null);
	let photoPreview = $state(null);
	let tempImage = $state(null);
	let showCropModal = $state(false);

	const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

	$effect(() => {
		if ($authStore.user && !formData.nama_lengkap) {
			formData.nama_lengkap = $authStore.user.nama_lengkap || '';
			formData.email = $authStore.user.email || '';
			formData.nik = $authStore.user.nik || '';
			if ($authStore.user.profile_photo_path && !photoFile) {
				photoPreview = `${API_BASE}/${$authStore.user.profile_photo_path}`;
			}
		}
	});

	function handleFileChange(e) {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				tempImage = e.target.result;
				showCropModal = true;
			};
			reader.readAsDataURL(file);
			// Reset input value agar bisa pilih file yang sama lagi
			e.target.value = '';
		}
	}

	function handleCrop(blob) {
		const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
		photoFile = file;
		photoPreview = URL.createObjectURL(blob);
		showCropModal = false;
	}

	async function handleUpdate(e) {
		e.preventDefault();
		loading = true;
		fieldErrors = {};

		try {
			const data = new FormData();
			data.append('nama_lengkap', formData.nama_lengkap);
			if (formData.email) data.append('email', formData.email);
			if (formData.nik) data.append('nik', formData.nik);
			if (formData.password) data.append('password', formData.password);
			if (photoFile) data.append('photo', photoFile);

			const res = await api('/auth/profile', {
				method: 'PUT',
				body: data
			});

			authStore.setUser(res.data);
			toast.success('Profil Anda berhasil diperbarui');
			formData.password = ''; // Reset password field
			photoFile = null;
		} catch (err) {
			if (err.statusCode === 422) {
				fieldErrors = err.errors.reduce((acc, curr) => {
					acc[curr.field] = curr.message;
					return acc;
				}, {});
			} else {
				toast.error(err.message || 'Gagal memperbarui profil');
			}
		} finally {
			loading = false;
		}
	}
</script>

	{#if showCropModal}
		<CropModal 
			image={tempImage} 
			onCrop={handleCrop} 
			onCancel={() => showCropModal = false} 
		/>
	{/if}

	<div class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
		<!-- Header -->
		<div class="space-y-1">
			<h2 class="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Pengaturan Profil</h2>
			<p class="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">Kelola informasi pribadi dan keamanan akun Anda.</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Left Avatar Card -->
			<div class="lg:col-span-1 space-y-6">
				<div class="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
					<div class="relative group">
						<div class="w-32 h-32 rounded-[2rem] bg-indigo-600 overflow-hidden flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/40 mb-6 transition-transform duration-500 group-hover:scale-105">
							{#if photoPreview}
								<img src={photoPreview} alt="Profile" class="w-full h-full object-cover" />
							{:else}
								{$authStore.user?.nama_lengkap?.charAt(0) || 'U'}
							{/if}
						</div>
						
						<label 
							for="photo-upload" 
							class="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl flex items-center justify-center cursor-pointer text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-all active:scale-95"
							title="Ubah Foto Profil"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
							<input id="photo-upload" type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
						</label>
					</div>

					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight">{$authStore.user?.nama_lengkap}</h3>
					<p class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mt-2">{$authStore.user?.role}</p>
					
					<div class="w-full h-px bg-zinc-100 dark:bg-zinc-800 my-6"></div>
					
					<div class="w-full space-y-4 text-left">
						<div class="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
							<span class="text-xs font-bold">{$authStore.user?.username}</span>
						</div>
						<div class="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 9h10"/><path d="M7 13h10"/><path d="M7 17h10"/></svg>
							<span class="text-xs font-bold">{$authStore.user?.nik || 'NIK Belum Diatur'}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Right Form Card -->
			<div class="lg:col-span-2">
				<div class="p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
					<form onsubmit={handleUpdate} class="space-y-8">
						<div class="space-y-6">
							<h4 class="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-4">Informasi Pribadi</h4>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
								<Input label="Nama Lengkap" bind:value={formData.nama_lengkap} error={fieldErrors.nama_lengkap} required />
								<Input label="NIK (KTP)" bind:value={formData.nik} error={fieldErrors.nik} placeholder="16 Digit NIK" />
							</div>
							<Input label="Email" type="email" bind:value={formData.email} error={fieldErrors.email} placeholder="email@sipasn.go.id" />
						</div>

						<div class="space-y-6 pt-4">
							<h4 class="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-4">Keamanan Akun</h4>
							<div class="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start mb-6">
								<div class="shrink-0 p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
								</div>
								<p class="text-[11px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed uppercase tracking-wide">Kosongkan kolom password jika Anda tidak ingin mengubah password saat ini.</p>
							</div>
							<Input label="Ganti Password" type="password" bind:value={formData.password} error={fieldErrors.password} placeholder="Minimal 8 karakter" />
						</div>

						<div class="pt-6">
							<Button type="submit" variant="primary" class="w-full sm:w-auto px-10 py-4 h-auto rounded-2xl shadow-2xl shadow-indigo-500/30 font-black tracking-tight" {loading}>
								SIMPAN PERUBAHAN
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
