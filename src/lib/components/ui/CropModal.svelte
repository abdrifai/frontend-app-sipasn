<script>
	import Cropper from 'svelte-easy-crop';
	import Button from './Button.svelte';
	import getCroppedImg from '$lib/utils/cropImage';

	let { image, onCrop, onCancel } = $props();

	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let pixelCrop = $state(null);
	let processing = $state(false);

	function onCropComplete(e) {
		// Svelte 5 compatibility layer passes the detail directly or as an event
		const data = e?.detail || e;
		if (data) {
			pixelCrop = data.pixels || data.pixelCrop;
		}
	}

	async function handleSave() {
		if (!pixelCrop) return;
		processing = true;
		try {
			const croppedBlob = await getCroppedImg(image, pixelCrop);
			onCrop(croppedBlob);
		} catch (e) {
			console.error('Error cropping image:', e);
		} finally {
			processing = false;
		}
	}
</script>

<div class="fixed inset-0 z-[300] flex items-center justify-center p-4">
	<!-- Backdrop -->
	<div 
		class="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300"
		onclick={onCancel}
		onkeydown={(e) => e.key === 'Escape' && onCancel()}
		role="button"
		tabindex="0"
		aria-label="Tutup modal"
	></div>

	<!-- Modal Content -->
	<div class="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
		<div class="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
			<div>
				<h3 class="text-xl font-black text-zinc-900 dark:text-zinc-50">Sesuaikan Foto</h3>
				<p class="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Geser dan zoom untuk posisi terbaik</p>
			</div>
			<button 
				onclick={onCancel}
				class="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:rotate-90 transition-all duration-300"
				aria-label="Batal"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>

		<div class="relative h-[400px] w-full bg-zinc-100 dark:bg-zinc-950">
			<Cropper
				{image}
				bind:crop
				bind:zoom
				aspect={1}
				cropShape="rect"
				showGrid={true}
				oncropcomplete={onCropComplete}
			/>
		</div>

		<div class="p-6 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
			<div class="flex items-center gap-4 w-full sm:w-auto">
				<span class="text-xs font-black text-zinc-400 uppercase tracking-widest">Zoom</span>
				<input
					type="range"
					min="1"
					max="3"
					step="0.1"
					bind:value={zoom}
					class="w-full sm:w-32 accent-indigo-600"
				/>
			</div>
			
			<div class="flex gap-3 w-full sm:w-auto">
				<Button variant="ghost" onclick={onCancel} class="flex-1 sm:flex-none uppercase tracking-widest text-[10px] font-black">
					BATAL
				</Button>
				<Button 
					variant="primary" 
					onclick={handleSave} 
					loading={processing}
					disabled={processing}
					class="flex-1 sm:flex-none px-8 py-3 rounded-xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-[10px] font-black"
				>
					POTONG & SIMPAN
				</Button>
			</div>
		</div>
	</div>
</div>
