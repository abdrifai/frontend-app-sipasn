<script>
	import { api } from '$lib/utils/api.js';
	import { authStore } from '$lib/stores/authStore';
	import { themeStore } from '$lib/stores/themeStore';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import AppLogo from '$lib/components/ui/AppLogo.svelte';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state(null);
	let fieldErrors = $state({});

	async function handleLogin(e) {
		e.preventDefault();
		loading = true;
		error = null;
		fieldErrors = {};

		try {
			const res = await api('/auth/login', {
				method: 'POST',
				body: JSON.stringify({ username, password })
			});

			authStore.setUser(res.data);
			goto('/dashboard');
		} catch (err) {
			console.error('Login error:', err);
			if (err.statusCode === 422) {
				fieldErrors = err.errors.reduce((acc, curr) => {
					acc[curr.field] = curr.message;
					return acc;
				}, {});
			} else {
				error = err.message || 'Gagal tersambung ke server.';
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk ke SIPASN | Kabupaten Tojo Una-Una</title>
</svelte:head>

<div class="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
	<!-- Left Side: Official Branding & Visual Hero -->
	<div class="hidden md:flex md:w-1/2 lg:w-3/5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 relative overflow-hidden items-center justify-center p-10 lg:p-16">
		<!-- Ambient Glow & Orbs -->
		<div class="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-500/25 rounded-full blur-3xl animate-pulse"></div>
		<div class="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-3xl"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-2xl"></div>
		
		<div class="relative z-10 max-w-lg text-white space-y-8">
			<!-- Government Emblem Card -->
			<div class="p-6 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-5 hover:bg-white/15 transition-all duration-300">
				<div class="w-20 h-20 bg-white rounded-3xl p-2 shadow-xl flex items-center justify-center shrink-0 border border-white/80">
					<img src="/logo-touna.png" alt="Lambang Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
				</div>
				<div class="space-y-1">
					<span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-black uppercase tracking-[0.2em]">
						⭐ SIVIA PATUJU
					</span>
					<h2 class="text-lg lg:text-xl font-black text-white tracking-tight leading-snug">
						Pemerintah Kabupaten<br />Tojo Una-Una
					</h2>
				</div>
			</div>

			<!-- Application Title & Description -->
			<div class="space-y-3">
				<div class="inline-flex items-center gap-2">
					<span class="text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-sm">
						SIP<span class="text-amber-400">ASN</span>
					</span>
					<span class="px-2.5 py-1 rounded-xl bg-white/15 border border-white/20 text-xs font-bold uppercase tracking-wider text-indigo-100">
						v2.0
					</span>
				</div>
				<p class="text-base lg:text-lg text-indigo-100/90 font-medium leading-relaxed">
					Sistem Informasi Pengelolaan Aparatur Sipil Negara yang Modern, Cepat, Akurat, dan Terintegrasi.
				</p>
			</div>
			
			<!-- Key Pillars / Badges -->
			<div class="grid grid-cols-2 gap-3 pt-2">
				<div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
					<div class="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
						✓
					</div>
					<span class="text-xs font-bold text-indigo-100">Data Pokok ASN</span>
				</div>
				<div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
					<div class="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
						✓
					</div>
					<span class="text-xs font-bold text-indigo-100">Riwayat Mutasi & KGB</span>
				</div>
				<div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
					<div class="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
						✓
					</div>
					<span class="text-xs font-bold text-indigo-100">Laporan DUK & BUP</span>
				</div>
				<div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
					<div class="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
						✓
					</div>
					<span class="text-xs font-bold text-indigo-100">Single Sign-On</span>
				</div>
			</div>
		</div>
		
		<!-- Subtle dot grid pattern -->
		<div class="absolute inset-0 opacity-[0.04] pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 28px 28px;"></div>
	</div>

	<!-- Right Side: Login Form -->
	<div class="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
		<div class="w-full max-w-md space-y-8 relative">
			<!-- Header with Official Logo -->
			<div class="space-y-4">
				<AppLogo 
					size="lg" 
					variant="hero" 
					subtitle="Pemerintah Kab. Tojo Una-Una"
				/>

				<div class="pt-2">
					<h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
						Selamat Datang
					</h2>
					<p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1">
						Silakan masuk dengan akun SIPASN resmi Anda.
					</p>
				</div>
			</div>

			{#if error}
				<div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 transition-all duration-300">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<p class="text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-5">
				<Input
					label="Username / NIP"
					name="username"
					placeholder="Masukkan username atau NIP"
					bind:value={username}
					error={fieldErrors.username}
					required
				/>

				<div class="space-y-1">
					<Input
						label="Password"
						name="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						error={fieldErrors.password}
						required
					/>
				</div>

				<Button type="submit" variant="primary" class="w-full py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 uppercase tracking-wider" {loading}>
					Masuk Ke SIPASN
				</Button>
			</form>

			<footer class="pt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-zinc-400 dark:text-zinc-500">
				<div class="flex flex-col">
					<span class="text-xs font-bold text-zinc-600 dark:text-zinc-300">SIPASN Tojo Una-Una</span>
					<span class="text-[10px]">© 2026 BKPSDM Kab. Tojo Una-Una</span>
				</div>
				<ThemeToggle />
			</footer>
		</div>
	</div>
</div>

