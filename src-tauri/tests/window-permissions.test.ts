import { describe, expect, test } from 'bun:test';

// The `decorations: false` window in tauri.conf.json uses a custom titlebar
// (WindowTitlebar.tsx) that calls direct Tauri window APIs.  Every single
// API that the titlebar invokes **must** be listed in the capabilities
// permissions, otherwise the call silently fails — making minimize,
// maximise, close, fullscreen and drag all non-functional.

function readCapabilities(): string[] | null {
	try {
		const raw = require('fs').readFileSync(
			require('path').resolve(__dirname, '../capabilities/default.json'),
			'utf-8',
		);
		const caps = JSON.parse(raw);
		return caps.permissions ?? null;
	} catch {
		return null;
	}
}

describe('window-control permissions', () => {
	function permissions(): string[] {
		const p = readCapabilities();
		if (!p) throw new Error('Could not read capabilities/default.json');
		return p;
	}

	const required = [
		'core:window:allow-minimize', // minimize button
		'core:window:allow-maximize', // maximise button / restore
		'core:window:allow-unmaximize', // restore from maximised
		'core:window:allow-close', // close button
		'core:window:allow-set-fullscreen', // kiosk fullscreen in Settings
		'core:window:allow-is-maximized', // read state for kiosk fullscreen
		'core:window:allow-is-fullscreen', // read state for kiosk fullscreen
	];

	for (const perm of required) {
		test(`capability "${perm}" is granted`, () => {
			const granted = permissions();
			expect(granted).toContain(perm);
		});
	}

	test('capabilities file can be read', () => {
		expect(permissions()).toBeArray();
	});
});
