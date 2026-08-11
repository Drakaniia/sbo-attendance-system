import { useEffect, useState } from 'react';
import { ArrowsOut, Check, Desktop } from '@phosphor-icons/react';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
	backupDb,
	getAppSettings,
	getDbPath,
	restoreDb,
	setAutoStart,
	setKiosk,
} from '../lib/tauri';
import { useNotification } from './useNotification';
import { deleteAllData } from '../api/settings';

export type SettingsActions = {
	dbPath: string;
	backingUp: boolean;
	restoring: boolean;
	kioskEnabled: boolean;
	autoStartEnabled: boolean;
	version: string;
	resetOpen: boolean;
	setResetOpen: (open: boolean) => void;
	resetting: boolean;
	handleBackup: () => Promise<void>;
	handleRestore: () => Promise<void>;
	handleKioskToggle: (enabled: boolean) => Promise<void>;
	handleAutoStartToggle: (enabled: boolean) => Promise<void>;
	handleResetAll: () => Promise<void>;
	handleCopyPath: () => Promise<void>;
};

export function useSettingsActions(): SettingsActions {
	const notification = useNotification();
	const [dbPath, setDbPath] = useState<string>('...');
	const [backingUp, setBackingUp] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [kioskEnabled, setKioskEnabled] = useState(false);
	const [autoStartEnabled, setAutoStartEnabled] = useState(false);
	const [version, setVersion] = useState<string>('...');
	const [resetOpen, setResetOpen] = useState(false);
	const [resetting, setResetting] = useState(false);

	// ── Load initial data ─────────────────────────────
	useEffect(() => {
		getDbPath()
			.then(setDbPath)
			.catch(() => setDbPath('Unknown'));

		// Persisted display & startup preferences.
		getAppSettings()
			.then((s) => {
				setKioskEnabled(s.kiosk);
				setAutoStartEnabled(s.autoStart);
			})
			.catch(() => {});

		// Attempt to read package version from the Tauri app
		const appVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null;
		setVersion(appVer ?? '0.1.0');
	}, []);

	// ── Backup ────────────────────────────────────────
	const handleBackup = async () => {
		try {
			const path = await save({
				defaultPath: 'seats-backup.db',
				filters: [{ name: 'SQLite Database', extensions: ['db'] }],
			});
			if (!path) return; // user cancelled

			setBackingUp(true);
			await backupDb(path);
			notification({
				title: 'Backup created',
				message: `Database saved to ${path}`,
				icon: <Check />,
				color: 'teal',
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			notification({
				title: 'Backup failed',
				message: msg,
			});
		} finally {
			setBackingUp(false);
		}
	};

	// ── Restore ───────────────────────────────────────
	const handleRestore = async () => {
		try {
			const path = await open({
				multiple: false,
				filters: [{ name: 'SQLite Database', extensions: ['db'] }],
			});
			if (!path) return; // user cancelled

			// Confirm before destructive action
			const confirmed = window.confirm(
				'This will replace ALL current data with the backup file.\n\nAre you sure you want to continue?'
			);
			if (!confirmed) return;

			setRestoring(true);
			await restoreDb(path as string);
			notification({
				title: 'Database restored',
				message: 'The app will reload with the restored data.',
				icon: <Check />,
				color: 'teal',
			});
			// Reload the page so all queries refetch against the new DB
			window.location.reload();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			notification({
				title: 'Restore failed',
				message: msg,
			});
		} finally {
			setRestoring(false);
		}
	};

	// ── Kiosk ─────────────────────────────────────────
	const handleKioskToggle = async (enabled: boolean) => {
		try {
			await setKiosk(enabled);
			setKioskEnabled(enabled);
			notification({
				title: enabled ? 'Kiosk mode on' : 'Kiosk mode off',
				message: enabled ? 'Press Escape to exit fullscreen' : 'Window restored to normal size',
				icon: enabled ? <ArrowsOut /> : <Desktop />,
				color: 'teal',
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			notification({
				title: 'Kiosk toggle failed',
				message: msg,
			});
		}
	};

	// ── Auto-start with Windows ──────────────────────
	const handleAutoStartToggle = async (enabled: boolean) => {
		try {
			await setAutoStart(enabled);
			setAutoStartEnabled(enabled);
			notification({
				title: enabled ? 'Auto-start enabled' : 'Auto-start disabled',
				message: enabled
					? 'SEATS will open automatically when Windows starts'
					: 'SEATS will no longer start with Windows',
				icon: <Check />,
				color: 'teal',
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			notification({
				title: 'Auto-start toggle failed',
				message: msg,
			});
		}
	};

	// ── Delete all data ──────────────────────────────
	const handleResetAll = async () => {
		setResetting(true);
		try {
			const summary = await deleteAllData();
			setResetOpen(false);
			notification({
				title: 'All data cleared',
				message: `Removed ${summary.students} students, ${summary.events} events, and ${summary.attendance} attendance records.`,
				icon: <Check />,
				color: 'teal',
			});
			// Reload so every page refetches against the empty database
			window.location.reload();
		} catch (err) {
			// Axios errors are rejected as plain objects ({ status, message }),
			// so read .message off either shape.
			const msg =
				(err as { message?: string } | null)?.message ??
				(err instanceof Error ? err.message : String(err));
			notification({
				title: 'Reset failed',
				message: msg,
			});
		} finally {
			setResetting(false);
		}
	};

	// ── Copy path ─────────────────────────────────────
	const handleCopyPath = async () => {
		try {
			await navigator.clipboard.writeText(dbPath);
			notification({
				title: 'Copied',
				message: 'Database path copied to clipboard',
				icon: <Check />,
				color: 'teal',
			});
		} catch {
			// Clipboard API unavailable — ignore
		}
	};

	return {
		dbPath,
		backingUp,
		restoring,
		kioskEnabled,
		autoStartEnabled,
		version,
		resetOpen,
		setResetOpen,
		resetting,
		handleBackup,
		handleRestore,
		handleKioskToggle,
		handleAutoStartToggle,
		handleResetAll,
		handleCopyPath,
	};
}
