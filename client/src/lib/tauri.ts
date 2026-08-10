import { invoke } from '@tauri-apps/api/core';

// The Tauri IPC bridge is only available inside a Tauri webview.
// In browser previews (localhost:5173 opened in a regular browser) the
// @tauri-apps/api/core module loads but `invoke` is undefined.
function assertTauri(): void {
	if (typeof invoke !== 'function') {
		throw new Error(
			'This feature requires the SEATS desktop app — it is not available in a browser preview.',
		);
	}
}

/** Copy the SQLite database to a user-chosen file path. */
export async function backupDb(destination: string): Promise<void> {
	assertTauri();
	return invoke('backup_db', { destination });
}

/** Replace the current database with one chosen by the user. */
export async function restoreDb(source: string): Promise<void> {
	assertTauri();
	return invoke('restore_db', { source });
}

/** Get the current database file path (display-only). */
export async function getDbPath(): Promise<string> {
	assertTauri();
	return invoke('get_db_path');
}

/** Toggle fullscreen / kiosk mode. */
export async function setKiosk(enabled: boolean): Promise<void> {
	assertTauri();
	return invoke('set_kiosk', { enabled });
}

/**
 * Open a native file picker and import students from CSV/XLSX.
 * Returns the number of records imported.
 */
export async function importStudentsFile(): Promise<number> {
	assertTauri();
	return invoke('import_students_file');
}
