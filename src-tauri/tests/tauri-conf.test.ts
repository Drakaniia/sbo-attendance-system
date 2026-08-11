import { describe, expect, test } from 'bun:test';

// Keep startup-window behavior explicit: the OS must show the splash while
// the main webview initializes, preventing a black or white startup flash.

function readTauriConf(): Record<string, unknown> | null {
	try {
		const raw = require('fs').readFileSync(
			require('path').resolve(__dirname, '../tauri.conf.json'),
			'utf-8',
		);
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function windows(): Record<string, unknown>[] {
	const conf = readTauriConf();
	if (!conf) throw new Error('Could not read tauri.conf.json');
	const configured = (conf.app as Record<string, unknown>)?.windows as unknown[];
	if (!configured?.length) throw new Error('No windows defined in tauri.conf.json');
	return configured as Record<string, unknown>[];
}

function windowByLabel(label: string): Record<string, unknown> {
	const window = windows().find((entry) => entry.label === label);
	if (!window) throw new Error(`Window "${label}" is not defined in tauri.conf.json`);
	return window;
}

describe('Tauri startup windows', () => {
	test('tauri.conf.json loads', () => {
		expect(windowByLabel('main')).toBeObject();
	});

	test('main window starts hidden behind the splash', () => {
		const main = windowByLabel('main');
		expect(main.visible).toBe(false);
		expect(main.backgroundColor).toBe('#0A0A0A');
		expect(main.decorations).toBe(true);
	});

	test('splash window is centered, visible, and points to the built entry', () => {
		const splash = windowByLabel('splashscreen');
		expect(splash.url).toBe('splashscreen.html');
		expect(splash.visible).toBe(true);
		expect(splash.center).toBe(true);
		expect(splash.decorations).toBe(false);
	});
});
