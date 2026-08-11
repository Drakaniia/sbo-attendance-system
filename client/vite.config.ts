import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only shim that loads the browser IPC mock (`src/mocks/index.ts`)
 * before the app, so the browser preview can serve sample data without the
 * Tauri webview. Skipped entirely for `vite build` / `tauri build`; in the
 * real webview the mock sees `window.__TAURI_INTERNALS__` already present
 * and does nothing.
 */
function browserIpcMock(): Plugin {
	return {
		name: 'browser-ipc-mock',
		apply: 'serve',
		transformIndexHtml(html, ctx) {
			// The splash has its own native Tauri event bridge and must not load
			// the browser data mock.
			if (!ctx.filename.endsWith('index.html')) return html;
			return {
				html,
				tags: [
					{
						tag: 'script',
						attrs: { type: 'module', src: '/src/mocks/index.ts' },
						injectTo: 'body-prepend',
					},
				],
			};
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), browserIpcMock()],
	server: {
		port: 5173,
		strictPort: true,
	},
	// Prevent vite from obfuscating the `tauri` identifier in dev
	clearScreen: false,
	// Tauri v2 requires @tauri-apps/api to be loaded natively by the webview;
	// pre-bundling it breaks the IPC bridge (invoke becomes undefined).
	optimizeDeps: {
		exclude: ['@tauri-apps/api'],
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(process.cwd(), 'index.html'),
				splashscreen: resolve(process.cwd(), 'splashscreen.html'),
			},
		},
	},
});
