import { writable } from 'svelte/store';

const createSidebarStore = () => {
	const { subscribe, set, update } = writable({
		collapsed: false,
		mobileOpen: false
	});

	return {
		subscribe,
		toggle: () =>
			update((state) => {
				if (typeof window !== 'undefined' && window.innerWidth < 1024) {
					return { ...state, mobileOpen: !state.mobileOpen };
				}
				return { ...state, collapsed: !state.collapsed };
			}),
		toggleMobile: () => update((state) => ({ ...state, mobileOpen: !state.mobileOpen })),
		openMobile: () => update((state) => ({ ...state, mobileOpen: true })),
		closeMobile: () => update((state) => ({ ...state, mobileOpen: false })),
		collapse: () => update((state) => ({ ...state, collapsed: true, mobileOpen: false })),
		expand: () => update((state) => ({ ...state, collapsed: false })),
		set: (val) => {
			if (typeof val === 'boolean') {
				set({ collapsed: val, mobileOpen: false });
			} else {
				set(val);
			}
		}
	};
};

export const sidebarStore = createSidebarStore();
