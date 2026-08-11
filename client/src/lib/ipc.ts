import { invoke } from '@tauri-apps/api/core';

type IpcRejection = {
	message?: string;
	errorCode?: string;
};

/**
 * Typed wrapper around Tauri `invoke`.
 *
 * Normalizes rejections to `Error` instances that carry the optional
 * `errorCode` the scan page uses to distinguish duplicate scans from real
 * errors — the same `{ message, errorCode }` shape the old axios
 * interceptor produced.
 */
export async function ipc<T>(
	command: string,
	args?: Record<string, unknown>,
	opts?: { signal?: AbortSignal }
): Promise<T> {
	// The IPC bridge is only available inside the Tauri webview. The Tauri CLI
	// injects `window.__TAURI_INTERNALS__` into the webview — `invoke` itself is
	// always a function once this module loads, so checking it can't detect a
	// browser. Without the injected global, `invoke` would throw a raw TypeError.
	if (typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === 'undefined') {
		throw new Error(
			'This feature requires the SEATS desktop app — it is not available in a browser preview.'
		);
	}

	// Abort early if the query was cancelled (e.g. component unmounted).
	if (opts?.signal?.aborted) {
		throw new DOMException('The operation was aborted', 'AbortError');
	}

	try {
		return await invoke<T>(command, args);
	} catch (error) {
		if (typeof error === 'string') {
			throw new Error(error);
		}
		const payload = error as IpcRejection;
		const err = new Error(payload?.message ?? 'Unknown error');
		if (payload?.errorCode) {
			Object.assign(err, { errorCode: payload.errorCode });
		}
		throw err;
	}
}
