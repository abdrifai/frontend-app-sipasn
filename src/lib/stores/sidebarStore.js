import { writable } from 'svelte/store';

const createSidebarStore = () => {
	const { subscribe, set, update } = writable(false);

	return {
		subscribe,
		toggle: () => update((v) => !v),
		collapse: () => set(true),
		expand: () => set(false),
		set: (val) => set(val)
	};
};

export const sidebarStore = createSidebarStore();
