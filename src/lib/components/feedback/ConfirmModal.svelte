<script>
	let { 
		show = $bindable(false),
		open = false,
		title = 'Konfirmasi', 
		message = 'Apakah Anda yakin?', 
		confirmText = 'Hapus',
		confirmLabel = '',
		cancelText = 'Batal',
		type = 'danger',
		variant = '',
		onConfirm,
		onClose = null,
		loading = false
	} = $props();

	const isVisible = $derived(show || open);
	const resolvedType = $derived(variant || type || 'danger');
	const resolvedConfirmText = $derived(confirmLabel || confirmText || 'Hapus');

	function handleConfirm() {
		if (onConfirm) onConfirm();
	}

	function handleClose() {
		if (loading) return;
		show = false;
		if (onClose) onClose();
	}

	const themes = {
		danger: {
			iconBg: 'bg-rose-100 dark:bg-rose-900/30',
			iconColor: 'text-rose-600 dark:text-rose-400',
			button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
		},
		warning: {
			iconBg: 'bg-amber-100 dark:bg-amber-900/30',
			iconColor: 'text-amber-600 dark:text-amber-400',
			button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
		},
		indigo: {
			iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
			iconColor: 'text-indigo-600 dark:text-indigo-400',
			button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
		}
	};

	const theme = $derived(themes[resolvedType] || themes.danger);
</script>

{#if isVisible}
	<div class="fixed inset-0 z-[110] flex items-center justify-center p-6">
		<!-- Backdrop -->
		<div 
			role="button" 
			tabindex="0"
			class="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300" 
			onclick={handleClose}
			onkeydown={(e) => e.key === 'Escape' && handleClose()}
		></div>

		<!-- Modal body -->
		<div class="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-300">
			<div class="p-8 text-center flex flex-col items-center">
				<div class="w-16 h-16 rounded-2xl {theme.iconBg} {theme.iconColor} flex items-center justify-center mb-6">
					{#if resolvedType === 'danger'}
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
					{:else if resolvedType === 'warning'}
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 9 4 7H8l4-7Z"/><path d="M12 3v12"/><circle cx="12" cy="19" r="1"/></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
					{/if}
				</div>

				<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">{message}</p>

				<div class="flex flex-col w-full gap-3">
					<button 
						onclick={handleConfirm}
						disabled={loading}
						class="w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer {theme.button}"
					>
						{#if loading}
							<span class="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full inline-block mr-2 align-middle"></span>
						{/if}
						{resolvedConfirmText}
					</button>
					<button 
						onclick={handleClose}
						disabled={loading}
						class="w-full py-3 rounded-2xl font-bold text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
					>
						{cancelText}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
