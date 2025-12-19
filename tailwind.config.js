/**
 * Tailwind CSS configuration
 * Configurado para Skeleton UI con tema crimson
 */

import { skeleton } from '@skeletonlabs/tw-plugin';
import forms from '@tailwindcss/forms';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(__dirname, 'node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {}
	},
	plugins: [
		skeleton({
			themes: {
				preset: [{ name: 'crimson', enhancements: true }]
			}
		}),
		forms
	]
};
