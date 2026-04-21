# frontend-cinematic

A second, parallel Next.js frontend for Graft Systems — the cinematic rebuild. Lives alongside [`frontend/`](../frontend/), which keeps shipping untouched.

## What this is

- **Next.js 15 / App Router / TypeScript / Tailwind** — same base stack as `frontend/`
- Pre-wired for cinema: Framer Motion, GSAP + `@gsap/react`, Lenis (smooth scroll), Three.js + React Three Fiber + Drei
- Shadcn-ready (clsx, tailwind-merge, cva, lucide-react, Radix primitives)
- **API parity with `frontend/`** — identical `/api/:path*` → Django rewrite, identical env var names. No backend changes required to run either frontend.

## Run locally

```bash
cd frontend-cinematic
cp .env.local.example .env.local   # edit BACKEND_URL if your Django runs elsewhere
npm install
npm run dev                         # http://localhost:3000
```

Backend (Django) runs the same way as before — see [`backend/README.md`](../backend/README.md). Default is `http://127.0.0.1:8080`.

> Only run one frontend at a time locally (both want port 3000). To run both side by side: `PORT=3001 npm run dev` in one of them.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start built server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Swapping to this on Vercel

See [SWAP.md](./SWAP.md). Short version: change **Vercel Project Settings → General → Root Directory** from `frontend` to `frontend-cinematic`, redeploy. Env vars and build commands stay identical.

## Structure

```
frontend-cinematic/
├── app/                 # App Router pages
│   ├── layout.tsx
│   ├── page.tsx         # placeholder hero
│   └── globals.css
├── components/          # (empty — build as we go)
├── hooks/
├── lib/
│   └── utils.ts         # cn() helper
├── public/
├── next.config.mjs      # /api/* → Django rewrite (same as frontend/)
├── tailwind.config.ts   # minimal theme, dark-first, tokens via CSS vars
├── tsconfig.json
└── package.json
```

## Notes

- Theme and type system are intentionally minimal. Colors, fonts, motion language all get defined once the creative brief comes back.
- Uses `@/*` path alias.
- `prefers-reduced-motion` is respected globally in `app/globals.css`.
