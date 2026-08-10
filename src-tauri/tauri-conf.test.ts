import { describe, expect, test } from 'bun:test';

// When `decorations: false` and the window transitions to/from fullscreen
// the OS may briefly show the webview's background before the page paints.
// Setting `backgroundColor` in the window config tells the OS what colour
// to use during the transition, preventing a jarring white / blink flash.

function readTauriConf(): Record<string, unknown> | null {
	try {
		const raw = require('fs').readFileSync(
			require('path').resolve(__dirname, 'tauri.conf.json'),
			'utf-8',
		);
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function firstWindow() {
	const conf = readTauriConf();
	if (!conf) throw new Error('Could not read tauri.conf.json');
	const windows = (conf.app as Record<string, unknown>)?.windows as unknown[];
	if (!windows?.length) throw new Error('No windows defined in tauri.conf.json');
	return windows[0] as Record<string, unknown>;
}

describe('fullscreen smoothness', () => {
	test('tauri.conf.json loads', () => {
		expect(firstWindow()).toBeObject();
	});

	test('window backgroundColor is set (prevents white flash)', () => {
		const win = firstWindow();
		expect(win.backgroundColor).toBe('#0A0A0A');
	});

	test('window decorations are enabled (OS-native titlebar)', () => {
		const win = firstWindow();
		expect(win.decorations).toBe(true);
	});
});
