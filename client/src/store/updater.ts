import { create } from 'zustand';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

interface UpdaterState {
	status: UpdateStatus;
	/** Version of the release being downloaded / installed. */
	version: string | null;
	/** Download progress, 0–100. Null while the package size is unknown. */
	progress: number | null;
	error: string | null;
	checkForUpdates: () => Promise<void>;
	restart: () => Promise<void>;
}

/** The IPC bridge only exists inside the Tauri webview (the dev mock fakes it). */
const isDesktop = () =>
	typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== 'undefined';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Update lifecycle shared by the launch-time auto check and the Settings card.
 *
 * `downloadAndInstall` verifies the bundle against the public key baked into
 * tauri.conf.json, so a tampered download is rejected before anything runs.
 * The app is never relaunched from here — the installed build starts on the
 * next launch, or when the user presses Restart in Settings.
 */
export const useUpdaterStore = create<UpdaterState>((set, get) => ({
	status: 'idle',
	version: null,
	progress: null,
	error: null,

	checkForUpdates: async () => {
		const { status } = get();
		// Already running (repeat click, or StrictMode's double effect).
		if (status === 'checking' || status === 'downloading') return;

		set({ status: 'checking', version: null, progress: null, error: null });

		let update: Update | null = null;
		try {
			update = await check();
			if (!update) {
				set({ status: 'up-to-date' });
				return;
			}

			set({ status: 'downloading', version: update.version, progress: 0 });

			let received = 0;
			let total: number | null = null;

			await update.downloadAndInstall((event) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? null;
				} else if (event.event === 'Progress') {
					received += event.data.chunkLength;
					set({
						progress: total ? Math.min(99, Math.round((received / total) * 100)) : null,
					});
				} else {
					set({ progress: 100 });
				}
			});

			set({ status: 'ready', progress: 100 });
		} catch (err) {
			// Release the backend resource if the download or install failed.
			await update?.close().catch(() => {});
			set({ status: 'error', error: messageOf(err) });
		}
	},

	restart: async () => {
		if (!isDesktop()) return;
		await relaunch();
	},
}));
