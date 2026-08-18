import { api } from '$lib/utils/api.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch }) {
	try {
		const result = await api(`/pegawai/${params.id}`, { fetch });
		return {
			pegawai: result.data
		};
	} catch (err) {
		console.error('Error loading pegawai detail:', err);
		throw error(err.statusCode || 500, err.message || 'Gagal memuat data pegawai');
	}
}
