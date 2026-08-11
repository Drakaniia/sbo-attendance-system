/**
 * Unwrapped paginated response shape returned by the Tauri IPC commands.
 * The old `{ success, data, message, ... }` HTTP envelope is gone — the
 * pagination fields live next to `data` exactly as the HTTP version's.
 */
export type PaginatedResult<T> = {
	data: T;
	next: number;
	prev: number;
	totalPages: number;
	total: number;
};
