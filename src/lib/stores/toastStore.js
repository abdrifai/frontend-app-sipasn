import { writable } from 'svelte/store';

/**
 * Store untuk notifikasi toast
 */
function createToastStore() {
	const { subscribe, update } = writable([]);

	return {
		subscribe,
		/**
		 * Tambahkan toast baru
		 * @param {string} message - Pesan notifikasi
		 * @param {string} type - 'success', 'error', 'info', 'warning'
		 * @param {number} duration - Durasi dalam ms
		 */
		add: (message, type = 'success', duration = 3000) => {
			const id = Math.random().toString(36).substring(2, 9);
			update((toasts) => [...toasts, { id, message, type }]);

			if (duration) {
				setTimeout(() => {
					update((toasts) => toasts.filter((t) => t.id !== id));
				}, duration);
			}
		},
		success: (message, duration) => createToastStore().add(message, 'success', duration),
		error: (message, duration) => createToastStore().add(message, 'error', duration),
		remove: (id) => update((toasts) => toasts.filter((t) => t.id !== id))
	};
}

// Singleton pattern for the store to be easily accessible
const store = createToastStore();

export const toast = {
	subscribe: store.subscribe,
	add: store.add,
	success: (msg, dur) => store.add(msg, 'success', dur),
	error: (msg, dur) => store.add(msg, 'error', dur),
	info: (msg, dur) => store.add(msg, 'info', dur),
	warning: (msg, dur) => store.add(msg, 'warning', dur),
	remove: store.remove
};

export const toastStore = toast;
export default toast;

