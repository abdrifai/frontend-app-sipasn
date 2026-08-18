import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Store untuk dark/light mode
 */
function createThemeStore() {
	const initialTheme = browser ? localStorage.getItem('theme') || 'light' : 'light';
	const { subscribe, set, update } = writable(initialTheme);

	return {
		subscribe,
		toggle: () =>
			update((theme) => {
				const nextTheme = theme === 'light' ? 'dark' : 'light';
				if (browser) {
					localStorage.setItem('theme', nextTheme);
					if (nextTheme === 'dark') {
						document.documentElement.classList.add('dark');
					} else {
						document.documentElement.classList.remove('dark');
					}
				}
				return nextTheme;
			}),
		init: () => {
			if (browser) {
				const theme = localStorage.getItem('theme') || 'light';
				if (theme === 'dark') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
				set(theme);
			}
		}
	};
}

export const themeStore = createThemeStore();
