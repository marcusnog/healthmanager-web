# HealthManager (frontend)

Next.js 16.2.5 App Router + React 19 — CRM médico multi-tenant.

## Two repos

| Repo | Path |
|------|------|
| Frontend (this one) | `C:\Users\Marcus Nogueira\Documents\healthmanager-web` |
| Backend | `C:\Users\Marcus Nogueira\Documents\HealthManager` |

## Commands

```bash
npm install
npm run dev                        # local dev at :3000
npm run build
npm run lint
npm run test                       # Vitest + Testing Library (unit)
npm run test:watch                 # Vitest watch mode
npm run test:e2e                   # Playwright (mocked API)
npm run test:e2e:real              # Playwright (real backend, starts .NET in memory)
npm run generate:api               # regenerates src/generated/ from backend openapi.json
```

Before first E2E run: `npx playwright install chromium`.

## Project structure

```
src/
  app/portal/          # App Router pages
  components/          # Shared components (crm-workspace, portal-workspace)
  generated/           # OpenAPI-generated client (do not edit)
  lib/                 # Utilities, helpers
  modules/             # Feature modules
    auth/              # login, JWT session
    dashboard/         # clinic dashboard metrics
    doctors/           # CRUD doctors
    financial/         # receivables + payments
    patients/          # CRUD patients + documents
    scheduling/        # appointment board
    settings/          # clinic settings
  providers/           # React context providers
  services/            # API service layer
  test/                # test helpers
  types/               # shared types
tests/
  e2e/                 # Playwright tests (mocked API)
  e2e-real/            # Playwright tests (real backend)
```

## Key conventions

- `@/` path alias maps to `./src` (configured in tsconfig.json)
- OpenAPI client lives in `src/generated/` — never edit by hand. Regenerate via `npm run generate:api` pointing to the backend's `docs/openapi.json`
- Backend proxy: `/backend/*` rewrites to `API_PROXY_TARGET` (default `http://127.0.0.1:8080`) — see `next.config.ts`
- Vitest: jsdom environment, coverage excludes `src/generated/` and `src/app/`
- Two Playwright configs: `playwright.config.ts` (mocked) and `playwright.real.config.ts` (real backend — starts .NET API in-memory automatically)
- Tailwind v4 with `@tailwindcss/postcss` (new config system, no `tailwind.config.js`)
- Zod v4 + React Hook Form + `@hookform/resolvers` for forms
- `@tanstack/react-query` for data fetching

## Visual design rules

See `CLAUDE.md` for full design system — no glassmorphism, no gradients, no generic AI aesthetic. B2B SaaS style with neutral background, subtle borders, moderate radius, sober typography, clear hierarchy.
