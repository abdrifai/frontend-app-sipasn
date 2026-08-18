<script>
	import Button from '../ui/Button.svelte';

	let { 
		show = $bindable(false), 
		title = 'Hapus Data', 
		message = 'Apakah Anda yakin ingin menghapus data ini?', 
		verifyText = 'delete',
		onConfirm,
		loading = false
	} = $props();

	let inputVal = $state('');
	
	function handleConfirm() {
		if (inputVal === verifyText && onConfirm) {
			onConfirm();
		}
	}

	function close() {
		if (!loading) {
			show = false;
			inputVal = '';
		}
	}

	// Reset input when modal closes
	$effect(() => {
		if (!show) {
			inputVal = '';
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 z-[110] flex items-center justify-center p-6">
		<!-- Backdrop -->
		<div 
			role="button" 
			tabindex="0"
			class="absolute inset-0 bg-zinc-950/40 backdrop-blur-md animate-in fade-in duration-300" 
			onclick={close}
			onkeydown={(e) => e.key === 'Escape' && close()}
		></div>

		<!-- Modal Body -->
		<div class="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-300">
			<div class="p-8 text-center flex flex-col items-center">
				<!-- Icon -->
				<div class="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
				</div>

				<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{message}</p>
				
				<!-- Verification Input -->
				<div class="w-full space-y-2 mb-8 text-left">
					<label for="verify" class="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ketik "{verifyText}" untuk konfirmasi</label>
					<input 
						id="verify"
						type="text" 
						bind:value={inputVal}
						placeholder='Ketik "{verifyText}"'
						class="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-rose-600 dark:text-rose-400 text-center"
						disabled={loading}
					/>
				</div>

				<!-- Actions -->
				<div class="flex flex-col w-full gap-3">
					<Button 
						variant="danger" 
						onclick={handleConfirm}
						disabled={loading || inputVal !== verifyText}
						loading={loading}
						class="w-full py-4 rounded-2xl font-black tracking-tight"
					>
						HAPUS SEKARANG
					</Button>
					<Button 
						variant="ghost" 
						onclick={close}
						disabled={loading}
						class="w-full py-3 rounded-2xl font-bold text-zinc-500"
					>
						Batal
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
