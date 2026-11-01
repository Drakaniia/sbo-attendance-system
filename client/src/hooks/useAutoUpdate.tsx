import { useEffect, useRef } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { getAppSettings } from '../lib/tauri';
import { useUpdaterStore } from '../store/updater';
import { useNotification } from './useNotification';

/** Wait out startup so the check never competes with the splash / first paint. */
const STARTUP_DELAY_MS = 5_000;

/**
 * Installs a published release in the background when "Automatic updates" is
 * on. Installing never interrupts the app: the new build starts on the next
 * launch, or immediately from the Restart button in Settings.
 */
export function useAutoUpdate() {
	const notification = useNotification();
	// The provider recreates `showNotification` on every toast, so keeping it in
	// a ref stops that from restarting the startup timer (and re-checking).
	const notificationRef = useRef(notification);
	notificationRef.current = notification;

	useEffect(() => {
		// Never replace a dev build with the latest published release.
		if (import.meta.env.DEV) return;

		let cancelled = false;
		const timer = window.setTimeout(async () => {
			const settings = await getAppSettings().catch(() => null);
			if (cancelled || !settings?.autoUpdate) return;

			await useUpdaterStore.getState().checkForUpdates();
			if (cancelled) return;

			// Errors stay quiet here — an offline machine shouldn't nag at launch.
			// Settings shows the reason when the user checks manually.
			const { status, version } = useUpdaterStore.getState();
			if (status === 'ready') {
				notificationRef.current({
					title: `SEATS v${version} installed`,
					message: 'Restart the app to start the new version.',
					icon: <DownloadSimple />,
					color: 'teal',
					duration: 15_000,
				});
			}
		}, STARTUP_DELAY_MS);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, []);
}
