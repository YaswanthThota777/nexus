# Nexus AI Sim

Nexus AI Sim is a React + Vite simulation UI focused on robotics and AI training workflows.

## Stack

- React 19
- Vite 7
- Tailwind CSS 4 (via PostCSS)
- ESLint 9
- Node built-in test runner (`node --test`)
- Express API backend (`backend/`)
- WebSocket realtime updates (`/ws`)

## Requirements

- Node.js `>= 22.12.0` (validated on `22.19.0`)
- npm `>= 10`

## Quick start

```bash
npm install
npm run dev
```

App starts on `http://localhost:5173` (or next free port).

Backend service (separate terminal):

```bash
cd backend
npm install
npm run dev
```

API starts on `http://localhost:8080`.

## Scripts

- `npm run dev` — start local development server
- `npm run lint` — run ESLint
- `npm run test` — run tests in watch-capable Node test runner
- `npm run test:run` — CI-friendly one-shot tests
- `npm run build` — create production build
- `npm run check` — full quality gate (`lint + test + build`)
- `npm run dev:api` — start backend service from root
- `npm run test:api` — run backend API tests
- `npm run check:api` — backend quality gate
- `npm run check:all` — frontend + backend gates

## Reliability upgrades included

- Runtime error boundary wrapping the app root in `src/main.jsx`
- Stable build toolchain (moved from Vite beta to Vite 7)
- Deterministic test baseline in `tests/`
- Tailwind/PostCSS configuration compatible with ESM project type
- Secure API middleware (helmet, rate limiting, API key auth)
- Backend contracts implemented from `docs/API_CONTRACTS.md`
- Realtime run status events over WebSocket
- GitHub Actions CI for frontend and backend

## Notes

- ESLint currently reports two `react-hooks/exhaustive-deps` warnings in `src/App.jsx`; these are non-blocking and do not fail CI.
- For production, set `VITE_API_BASE_URL`, `VITE_API_KEY`, and backend `.env` values.

## Deployment (Docker)

Run full stack locally via Docker:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`

Environment profiles included:

- Frontend: `.env.staging`, `.env.production`
- Backend: `backend/.env.staging`, `backend/.env.production`

Use `.env` / `backend/.env` for active runtime values.
