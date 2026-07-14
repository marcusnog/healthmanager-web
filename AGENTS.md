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
npm ci                             # CI — faster, respects lockfile
npm run dev                        # local dev at :3000
npm run build
npm run lint                       # ESLint (eslint, not next lint)
npm run test                       # Vitest + Testing Library (unit, includes --coverage)
npm run test:watch                 # Vitest watch mode
npm run test:e2e                   # Playwright (mocked API)
npm run test:e2e:real              # Playwright (real backend, starts .NET in memory)
npm run generate:api               # regenerates src/generated/ from backend openapi.json
```

Before first E2E run: `npx playwright install chromium`.

`generate:api` reads `../HealthManager/docs/openapi.json` (sibling backend repo) via `openapi-typescript-codegen` with `--client fetch`. The backend repo must be at the expected path.

## Project structure

```
src/
  app/
    layout.tsx          # Root layout
    page.tsx            # Login / redirect
    portal/             # Patient portal route (separate layout)
  components/
    crm-workspace.tsx   # Main CRM shell (auth, routing, layout)
    portal-workspace.tsx# Patient portal shell
    ui/                 # Primitives: Avatar, Modal, Field, EmptyState, StatusBadge
  generated/            # OpenAPI-generated client (do not edit)
  lib/
    auth-session.ts     # Clinic auth: localStorage healthmanager.auth, auto-refresh
    portal-session.ts   # Patient portal auth: localStorage healthmanager.portal
    cn.ts               # className combiner
    formatters.ts       # CPF/phone masks, BRL currency, date, file size
  modules/              # Feature modules
    auth/               # login-panel
    availabilities/     # doctor-availability-manager
    dashboard/          # summary-cards, dashboard-right-rail
    doctors/            # doctor-roster
    financial/          # financial-overview
    health-insurances/  # health-insurance-manager
    patients/           # patient-list
    scheduling/         # appointment-board
    settings/           # settings-panel
    specialties/        # specialty-manager
  providers/
    app-provider.tsx    # QueryClientProvider (staleTime 30s, skip retry on 401)
  services/
    api.ts              # Generated client config + custom fetch for expenses/summary
    portal-api.ts       # Portal-specific API calls
  test/
    render.tsx          # renderWithProviders(ui) — wraps in QueryClientProvider
  types/
    app.ts              # AuthSession, ClinicRole, SessionState
tests/
  e2e/                  # Playwright tests (mocked API)
  e2e-real/             # Playwright tests (real backend)
```

## Key conventions

- `@/` path alias maps to `./src` (configured in tsconfig.json)
- OpenAPI client in `src/generated/` — never edit by hand. Regenerate via `npm run generate:api`.
- Hand-written API wrappers in `src/services/api.ts` extend the generated client for custom endpoints (expenses, financial summary)
- Backend proxy: `/backend/*` rewrites to `API_PROXY_TARGET` (default `http://127.0.0.1:8080`) — see `next.config.ts`
- Vitest: jsdom environment, `vitest.setup.ts` adds `@testing-library/jest-dom` + `<dialog>` polyfill; coverage excludes `src/generated/` and `src/app/`
- Two Playwright configs: `playwright.config.ts` (mocked) and `playwright.real.config.ts` (real backend — starts .NET API in-memory automatically)
- Tailwind v4 with `@tailwindcss/postcss` (no `tailwind.config.js`)
- Zod v4 + React Hook Form + `@hookform/resolvers` for forms
- `@tanstack/react-query` for data fetching
- `src/providers/app-provider.tsx`: QueryClient with `staleTime: 30000`, no retry on 401, no refetch on window focus
- `auth:unauthorized` event dispatched on 401 — components should listen and redirect to login
- Two auth sessions: clinic (`localStorage healthmanager.auth`, with JWT refresh) and patient portal (`localStorage healthmanager.portal`, no refresh)
- Test wrapper: `renderWithProviders(ui)` from `src/test/render.tsx`
- Linting: ESLint with `eslint-config-next/core-web-vitals` + `typescript`; ignores `.next/`, `src/generated/`, coverage, playwright reports
- No CI workflow yet — add one in `.github/workflows/` when ready

## Environment variables

| Variable | Required? | Default | Purpose |
|----------|-----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | No | `/backend` | API base URL (overrides dev proxy) |
| `API_PROXY_TARGET` | No | `http://127.0.0.1:8080` | Backend dev server for `next.config.ts` rewrites |

## Visual design rules

See `CLAUDE.md` for full design system — no glassmorphism, no gradients, no generic AI aesthetic. B2B SaaS style with neutral background, subtle borders, moderate radius, sober typography, clear hierarchy.

## API contract

Backend publishes `docs/openapi.json` and canonical specs in `spec/` (backend/spec/entities.yaml, state-machines.yaml, business-rules.yaml, auth-flow.yaml, api-endpoints.yaml). Frontend regenerates client via `npm run generate:api` (`openapi-typescript-codegen --client fetch`). When backend changes request/response, update openapi.json and regenerate.

Before making frontend changes that touch entity fields, state transitions, or API contracts, read the relevant spec in `../HealthManager/spec/` first.
