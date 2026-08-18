const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Fungsi fetch terpusat ke backend
 * @param {string} endpoint - Path API (misal: /auth/login)
 * @param {object} options - Options fetch (method, body, dll)
 */
export const api = async (endpoint, options = {}) => {
	const headers = { ...options.headers };
	const customFetch = options.fetch || fetch;

	// Jika body bukan FormData, set default Content-Type ke application/json
	if (!(options.body instanceof FormData)) {
		headers['Content-Type'] = 'application/json';
	}

	const res = await customFetch(`${BASE_URL}${endpoint}`, {
		...options,
		headers,
		credentials: 'include' // Penting untuk httpOnly cookie
	});

	let data;
	try {
		data = await res.json();
	} catch (e) {
		data = {};
	}

	if (!res.ok) {
		throw {
			statusCode: res.status,
			message: data.message ?? 'Terjadi kesalahan sistem',
			errors: data.errors ?? null
		};
	}

	return data;
};
