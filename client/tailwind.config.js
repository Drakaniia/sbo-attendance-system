/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			// Every integer 0–100 is a valid opacity modifier. Tailwind's stock
			// scale only ships steps of 5, which silently drops the fine-grained
			// label tints this interface relies on (white/28, white/72, …).
			opacity: Object.fromEntries(
				Array.from({ length: 101 }, (_, value) => [value, String(value / 100)])
			),
			fontFamily: {
				sans: [
					'Inter Variable',
					'Inter',
					'-apple-system',
					'BlinkMacSystemFont',
					'SF Pro Text',
					'Segoe UI',
					'system-ui',
					'sans-serif',
				],
			},
			colors: {
				foreground: 'var(--label-primary)',
				border: 'var(--surface-border)',
				muted: {
					DEFAULT: 'rgba(255, 255, 255, 0.08)',
					foreground: 'var(--label-tertiary)',
				},
				chart: {
					label: 'var(--chart-label)',
					grid: 'var(--chart-grid)',
					tooltip: {
						background: 'var(--chart-tooltip-background)',
						foreground: 'var(--chart-tooltip-foreground)',
						muted: 'var(--chart-tooltip-muted)',
					},
					line: {
						primary: 'var(--chart-line-primary)',
						secondary: 'var(--chart-line-secondary)',
					},
				},
			},
			transitionTimingFunction: {
				'apple-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
				'apple-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
				drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
			},
			animation: {
				'spin-slow': 'spin 3s linear infinite',
				'ambient-drift': 'ambient-drift 18s ease-in-out infinite',
			},
			keyframes: {
				'spin-slow': {
					to: {
						transform: 'rotate(360deg)',
					},
				},
			},
			boxShadow: {
				panel:
					'inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.4), 0 28px 60px -40px rgba(0,0,0,0.9)',
				float: '0 24px 60px -20px rgba(0,0,0,0.75)',
				focus: '0 0 0 3px rgba(91,141,239,0.3)',
			},
			maxWidth: {
				shell: '1500px',
			},
		},
	},
	plugins: [],
};
