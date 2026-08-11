/**
 * Dev-only browser mock of the Tauri IPC bridge.
 *
 * The SEATS frontend talks to the Rust backend exclusively through Tauri IPC
 * (`window.__TAURI_INTERNALS__.invoke`), which does not exist in a plain
 * browser tab — so in the browser preview every data call used to fail with
 * "requires the SEATS desktop app". This module installs a fake
 * `__TAURI_INTERNALS__` with an `invoke` that serves deterministic sample
 * data, mirroring the shapes the Rust commands return (see
 * `src-tauri/src/commands/` and `src-tauri/src/db/queries/`).
 *
 * The module is injected ahead of `/src/main.tsx` by the `browser-ipc-mock`
 * Vite plugin, and only in dev (`vite dev` / `tauri dev`). In the real
 * Tauri webview `window.__TAURI_INTERNALS__` already exists, so this file is
 * a no-op there. It is never part of production builds.
 *
 * The in-memory "database" is mutable, so scans, imports, resets, etc. work
 * like the real app for the duration of the preview session.
 */

import { initDb } from './mock-db';
import { handleCommand } from './mock-handlers';

// Guard: never clobber the real bridge or a previously installed mock.
if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
	installMock();
}

declare global {
	interface Window {
		__TAURI_INTERNALS__?: {
			invoke: (cmd: string, args?: unknown, options?: unknown) => Promise<unknown>;
			transformCallback?: (...args: unknown[]) => number;
			metadata?: unknown;
		};
	}
}

// ── install the bridge ───────────────────────────────────────────────────

function installMock(): void {
	// Populate the in-memory dataset once.
	initDb();

	Object.defineProperty(window, '__TAURI_INTERNALS__', {
		value: {
			invoke: async (cmd: string, args?: unknown) => {
				// Simulate realistic network latency.
				await new Promise<void>((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
				return handleCommand(cmd, (args ?? {}) as Record<string, unknown>);
			},
			transformCallback: () => 0,
			metadata: {
				currentWebview: { label: 'main' },
				currentWindow: { label: 'main' },
			},
		},
		writable: false,
		configurable: false,
	});
	console.info('[mock] Tauri IPC mock installed — serving sample data in the browser preview.');
}

// Keep this file a module (TS treats top-level statements as a script otherwise).
export {};
