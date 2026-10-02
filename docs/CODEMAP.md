# Factory CRM — code map

Short guide for developers continuing this codebase. Prefer this map plus the file-header comments in source over reverse-engineering from scratch.

## Layout

| Path | Role |
|------|------|
| `backend/` | NestJS REST API (`/api`), Prisma, Postgres |
| `frontend/` | React SPA (Vite), talks to `/api` via proxy in dev |
| `docs/` | Architecture, API, security, deployment notes |
| `docker-compose.yml` | Local Postgres 16 |

## Backend (`backend/src`)

| Area | Where to look |
|------|----------------|
| Bootstrap | `main.ts`, `app.module.ts` |
| Auth / sessions | `auth/` — Argon2id, JWT access, refresh cookie, CSRF |
| RBAC | `common/permissions.ts` + `common/guards/*` |
| Domain rules | `common/quantity.ts`, `frequency.ts`, `activity.ts`, `codes.service.ts` |
| Parties | `clients/`, `suppliers/`, `locations/` |
| Stock movements | `transactions/` (CLIENT_PURCHASE / SUPPLIER_SUPPLY) |
| Insights | `dashboard/`, `reports/` |
| Admin | `users/`, `roles/`, `settings/`, `audit/` |
| Schema | `backend/prisma/schema.prisma` + migrations |

**Guard order:** Throttler → CSRF → JWT → Permissions.

**Response shape:** success `{ success: true, data }` · error `{ success: false, message, errors? }`.

## Frontend (`frontend/src`)

| Area | Where to look |
|------|----------------|
| Entry / routes | `main.tsx`, `App.tsx` |
| Session + HTTP | `lib/auth.tsx`, `lib/api.ts` |
| Layout | `layouts/Shell.tsx` |
| Shared UI | `components/ui.tsx`, `index.css` |
| Copy | `messages.ts` |
| Pages | `pages/*` — one module per business area |

**Security on the client:** access token in memory only; refresh + CSRF cookies with `credentials: "include"`.

## Product rules worth remembering

- Soft deactivate parties/products (no hard delete of business history).
- Transaction reverse = status `REVERSED`, excluded from totals.
- Weight stored as `quantityKg` (1 tonne = 1000 kg); PIECE/OTHER leave kg null.
- Frequency and activity are computed labels, not replacements for stored status.
- Dates display in `Africa/Kampala`.

## How to extend safely

1. Add or change Prisma fields in a migration; keep seed non-production.
2. Mirror new permission keys in `permissions.ts` and frontend Guards/nav.
3. Reuse `DataPanel` / `DataTable` / `Modal` / `StatusText` for new screens.
4. Keep user-facing English strings in `messages.ts` when practical.
