# SEATS — Client (frontend)

React 19 + TypeScript + Vite frontend for **SEATS**, the SBO Attendance System desktop app.
This is the webview side of a Tauri v2 application; the Rust backend lives in [`../src-tauri`](../src-tauri).

## Stack

- **React 19** + **react-router-dom 7**
- **Vite 7** + TypeScript 5.8
- **Mantine 8** + Tailwind CSS 3 (UI)
- **@tanstack/react-query** (server state)
- **zustand** (client state), **react-hook-form** + **zod** (forms/validation)
- **framer-motion** (animation), **recharts** (charts)
- **date-fns** / **dayjs** (dates)

## Getting started

Requires [Bun](https://bun.sh) and the Rust toolchain (see the [root README](../README.md) for full prerequisites). From the repository root:

```bash
bun run dev        # = cd client && bun run tauri dev
```

To run just the Vite development server (frontend only, without the Tauri window):

```bash
bun install
bun run dev
```

The browser preview is useful for inspecting the UI, but data features require the SEATS desktop app because the frontend communicates with Rust through Tauri IPC.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Vite development server |
| `bun run build` | Type-check and build the frontend |
| `bun run typecheck` | Run the TypeScript project check |
| `bun run lint` | Run ESLint |
| `bun run format:check` | Verify Prettier formatting |
| `bun run preview` | Preview the production build |
| `bun run tauri` | Run a Tauri CLI command, such as `bun run tauri dev` |

## Project layout

```text
src/
├── api/          # Typed frontend wrappers around Tauri IPC commands
├── components/   # Shared UI, charts, reports, forms, buttons, and modals
├── constants/    # Query keys and navigation definitions
├── hooks/        # Shared React hooks
├── lib/          # Tauri IPC bridge, routing, validation, and utilities
├── pages/        # Route-level pages (Dashboard/, Settings/, SingleEvent/, …)
├── store/        # Zustand stores (theme, student filters)
└── types/        # Shared TypeScript types (attendance, events, students, …)
```

The frontend invokes Rust commands through [`src/lib/ipc.ts`](src/lib/ipc.ts). Native operations such as database backup/restore, student import, kiosk mode, and Excel exports are implemented in [`../src-tauri/src/commands`](../src-tauri/src/commands).
