import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
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
});
