import { writable } from 'svelte/store';

/**
 * Store untuk data user yang sedang login
 */
function createAuthStore() {
	const { subscribe, set, update } = writable({
		user: null,
		loading: true,
		isAuthenticated: false
	});

	return {
		subscribe,
		setUser: (user) => set({ user, loading: false, isAuthenticated: !!user }),
		setLoading: (loading) => update((n) => ({ ...n, loading })),
		clear: () => set({ user: null, loading: false, isAuthenticated: false })
	};
}

export const authStore = createAuthStore();
