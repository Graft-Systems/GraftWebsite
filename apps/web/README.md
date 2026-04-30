# Graft Frontend (Next.js)

Primary website and tool UI for Graft Systems.

## What this app does

- Renders marketing pages and `/tool` upload workflow.
- Sends estimate uploads to Django backend (`/api/estimate`).
- Displays prediction history batches, including per-batch total predicted weight.

## Read this first

For full clone-to-run setup (especially for a new engineer/agent), see:

- `../backend/PredictionTool/HANDOFF.md`

## Local setup

From `frontend/`:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

Backend default URL expected by this frontend: `http://127.0.0.1:8080`

## Environment variables

Copy `frontend/.env.local.example` to `.env.local`.

Required values:

```env
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080
```

- `BACKEND_URL` is used by Next.js server-side rewrites.
- `NEXT_PUBLIC_BACKEND_URL` is used by client-side uploads/history requests in `/tool`.

## Backend dependency notes

- This frontend assumes Django backend endpoints exist at:
  - `POST /api/estimate`
  - `GET /api/estimate/history`
  - `DELETE /api/estimate/history/:batch_id`
  - `POST /api/contact`
- Upload inference is CSV-independent by design (no CSV enrichment on uploads).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build production bundle |
| `npm run start` | Start built app |
| `npm run lint` | Run ESLint |
