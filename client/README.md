# SEATS — Client (frontend)

React 19 + TypeScript + Vite frontend for **SEATS**, the SBO Attendance System desktop app.
This is the webview side of a Tauri v2 application; the backend lives in [`../src-tauri`](../src-tauri).

## Stack

- **React 19** + **react-router-dom 7**
- **Vite 7** + TypeScript 5.8
- **Mantine 8** + Tailwind CSS 3 (UI)
- **@tanstack/react-query** (server state) + **axios** (API calls)
- **zustand** (client state), **react-hook-form** + **zod** (forms/validation)
- **framer-motion** (animation), **recharts** (charts)
- **date-fns** / **dayjs** (dates)

## Getting started

Requires [Bun](https://bun.sh) and the Rust toolchain (see the root README for the full
prerequisites). From the repository root:

```bash
bun run dev        # = cd client && bun run tauri dev
```

To run just the Vite dev server (frontend only, no Tauri window):

```bash
bun install
bun run dev        # plain `vite` — the API at 127.0.0.1:8000 must be up separately
```

## Scripts

| Script        | Description                                   |
| ------------- | --------------------------------------------- |
| `bun run dev` | Start the Vite dev server                     |
| `bun run build` | Type-check (`tsc -b`) and production build  |
| `bun run lint` | ESLint                                        |
| `bun run preview` | Preview the production build              |
| `bun run tauri` | Tauri CLI passthrough (e.g. `tauri build`)  |

## Project layout

```
src/
├── api/          # axios wrappers per domain (attendance, dashboard, events, reports, …)
├── components/   # shared UI (ui/, charts/, reports/, forms/, buttons/, modals/)
├── constants/    # query keys, nav definitions
├── hooks/        # shared hooks (useNotification, …)
├── lib/          # utilities (tauri bridge, date helpers, validation schemas)
├── modals/       # dialog components (CreateEventModal, EditAttendanceModal, …)
├── pages/        # route-level pages (Dashboard/, Settings/, SingleEvent/, …)
├── store/        # zustand stores (theme, studentsFilter)
└── types/        # shared TypeScript types (api-response, event, student, …)
```

The frontend communicates with the in-process Rust API over HTTP at
`http://127.0.0.1:8000/api/v1` (see `src/api/axiosInstance.ts`), plus Tauri commands for
native operations such as DB backup/restore and file import (`src/lib/tauri.ts`).
