/// <reference types="vite/client" />

// Injected at runtime by the Tauri host if available; falls back to '0.1.0' in the UI.
declare const __APP_VERSION__: string | undefined;
