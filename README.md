# SEATS — SBO Attendance System

A desktop attendance-tracking application for student organizations (SBOs), built with
[Tauri v2](https://tauri.app). **SEATS** = **S**BO **E**vent **A**ttendance **T**racking **S**ystem.

## Features

- **Events** — create, edit, and manage events with time-in/time-out attendance scanning
- **Attendance** — real-time check-in/check-out per event, with student search and filtering
- **Students** — manage the student roster, including bulk import from Excel (`.xlsx`) files
- **Reports** — attendance stats, trends, course/year distributions, leaderboards, hourly/daily
  heatmaps, and CSV export
- **Dashboard** — overview stats, recent activity, and attendance trends
- **Settings** — kiosk mode, database backup/restore, and reset-all

## Architecture

The app has two workspaces:

```
sbo-attendance-system/
├── client/      # React 19 + TypeScript + Vite frontend (webview)
└── src-tauri/   # Rust backend — Tauri shell + SQLite + local HTTP API
```

At startup, the Rust side opens the SQLite database (`seats.db` in the app data directory),
runs migrations, and spawns an in-process [axum](https://github.com/tokio-rs/axum) HTTP
server on `127.0.0.1:8000`. The React frontend calls that API with axios
(`http://127.0.0.1:8000/api/v1/*`) and uses Tauri commands for native operations
(DB backup/restore, file dialogs, Excel import). A `server-ready` event lets the splash
screen transition as soon as the API is listening.

```
┌───────────────────────────┐         ┌────────────────────────────────┐
│  client/ (React webview)  │  axios  │  src-tauri/ (Rust)             │
│  ──────────────────────── │ ◄─────► │  ┌──────────────────────────┐  │
│  pages → components       │  :8000  │  │ axum API (api/routes/)   │  │
│  api/ (axios wrappers)    │         │  │ db/ (SQLite + queries)   │  │
│  lib/tauri.ts (commands)  │  Tauri  │  └──────────────────────────┘  │
└───────────────────────────┘   IPC   └────────────────────────────────┘
```

## Prerequisites

- [Bun](https://bun.sh) (package manager + script runner)
- [Rust](https://www.rust-lang.org/tools/install) stable (MSRV 1.80)
- Tauri v2 system dependencies for your OS — see the
  [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Getting started

```bash
bun install          # installs @tauri-apps/cli at the root
cd client && bun install
cd .. && bun run dev # = client: bun run tauri dev
```

The first build compiles the Rust backend and may take several minutes.

## Building for production

```bash
bun run build        # = client: bun run tauri build
```

Artifacts are written to `src-tauri/target/release/`.

## Scripts

| Script           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `bun run dev`    | Run the app in development (Tauri + Vite + Rust) |
| `bun run build`  | Build the production desktop bundle              |
| `bun run test`   | Placeholder — no test suite wired up yet         |

## Repository layout

```
client/            # React frontend (see client/README.md)
src-tauri/
├── src/
│   ├── api/       # axum HTTP layer (routes/, server.rs, error.rs)
│   ├── db/        # SQLite connection, migrations, query modules
│   ├── commands.rs# Tauri commands (backup/restore/import/kiosk)
│   └── main.rs / lib.rs / state.rs
├── capabilities/  # Tauri v2 capability/permission manifests
└── tauri.conf.json
```

## License

ISC (see root `package.json`).
