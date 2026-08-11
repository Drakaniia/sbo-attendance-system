import { ipc } from './ipc';

/** Persisted app preferences (settings.json in the data folder). */
export type AppSettings = {
	kiosk: boolean;
	autoStart: boolean;
};

/** Copy the SQLite database to a user-chosen file path. */
export async function backupDb(destination: string): Promise<void> {
	return ipc<void>('backup_db', { destination });
}

/** Replace the current database with one chosen by the user. */
export async function restoreDb(source: string): Promise<void> {
	return ipc<void>('restore_db', { source });
}

/** Get the current database file path (display-only). */
export async function getDbPath(): Promise<string> {
	return ipc<string>('get_db_path');
}

/** Toggle fullscreen / kiosk mode and persist it across launches. */
export async function setKiosk(enabled: boolean): Promise<void> {
	return ipc<void>('set_kiosk', { enabled });
}

/** Read the persisted app preferences. */
export async function getAppSettings(): Promise<AppSettings> {
	return ipc<AppSettings>('get_app_settings');
}

/** Turn auto-start with Windows on/off and persist the preference. */
export async function setAutoStart(enabled: boolean): Promise<void> {
	return ipc<void>('set_auto_start', { enabled });
}

/**
 * Open a native file picker and import students from CSV/XLSX.
 * Returns the number of records imported.
 */
export async function importStudentsFile(): Promise<number> {
	return ipc<number>('import_students_file');
}
