/**
 * Fungsi debounce untuk membatasi frekuensi eksekusi fungsi
 * @param {Function} fn - Fungsi yang akan dieksekusi
 * @param {number} delay - Penundaan dalam milidetik
 * @returns {Function} Fungsi yang sudah di-debounce
 */
export function debounce(fn, delay) {
	let timeoutId;
	return (...args) => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}
