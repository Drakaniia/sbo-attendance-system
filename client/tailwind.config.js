/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			transitionTimingFunction: {
				'apple-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
			},
			animation: {
				'spin-slow': 'spin 3s linear infinite',
			},
			keyframes: {
				'spin-slow': {
					to: {
						transform: 'rotate(360deg)',
					},
				},
			},
		},
	},
	plugins: [],
};
