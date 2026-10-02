# Factory CRM

Factory CRM records client purchases and supplier supplies for one factory. Staff get a short transaction screen. Managers and administrators get search, dashboards, reports, and account controls.

See [docs/CODEMAP.md](docs/CODEMAP.md) for a short map of the codebase for future developers.

## Features

- Clients, suppliers, products, and locations, with generated codes
- Purchases and supplies stored in kilograms, including tonne conversion
- Computed purchase frequency and activity labels
- Dashboard totals and charts from recorded transactions
- CSV, Excel, and PDF reports
- Administrator, manager, and staff permissions checked on the server
- Audit log for sign-in, changes, deactivation, role changes, password changes, and exports
- Soft deactivation of parties and products, and administrator reversal of transactions

## Stack

- API: Node.js, TypeScript, NestJS, Prisma, PostgreSQL
- Web app: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts
- Passwords: Argon2id. Access token in memory. Refresh token in an HTTP-only cookie.

## Prerequisites

- Node.js 22
- npm
- PostgreSQL 16, either the Docker Compose service in this repository or a reachable Supabase Postgres URL

## Setup

```bash
docker compose up -d
cp .env.example backend/.env
```

Put real values in `backend/.env`. The example file contains names and placeholders only. For the local Docker database:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/factory_crm?sslmode=disable
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/factory_crm?sslmode=disable
```

Supabase is the intended hosted Postgres database. Prisma uses the Postgres connection string, not the REST URL. If the dashboard provides a pooler URL, use that as `DATABASE_URL` and the direct URL as `DIRECT_URL`. The direct host `db.<project-ref>.supabase.co` is IPv6-only; a machine without an IPv6 route cannot open that session. The server-only secret key is not used by Prisma or the React app.

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The web app is at http://localhost:5175 and proxies `/api` to http://localhost:3000.

## Development accounts

The seed runs only when `NODE_ENV` is not `production`. It creates fictional accounts on `example.com`:

| Email | Role | Password |
| --- | --- | --- |
| admin@example.com | ADMIN | ChangeMe123! |
| manager@example.com | MANAGER | ChangeMe123! |
| staff@example.com | STAFF | ChangeMe123! |

These accounts are for local development. Do not use them in production. Outside development, seeded users are marked to change their password, and the seed command refuses to run.

The seed also loads 5 locations, 10 clients, 5 suppliers, 5 products, and 32 transactions.

## Commands

```bash
cd backend && npm test
cd backend && npm run test:e2e
cd backend && npm run build
cd backend && npm run lint
cd frontend && npm run build
cd frontend && npm test
cd frontend && npm run test:e2e
```

## Production

Build the API with `npm run build` in `backend` and start it with `npm run start:prod`. Build the web app with `npm run build` in `frontend` and serve `frontend/dist` behind the same site or a host that proxies `/api`. Set `NODE_ENV=production`, long random JWT secrets, `FRONTEND_URL`, and a reachable `DATABASE_URL`. Cookies are marked secure in production.

## Security

Every protected route checks a permission on the server. Hiding a button is not the control. Responses do not include password hashes or tokens. Login is rate-limited and accounts lock after repeated failures. Forgot-password always returns the same message. Details are in `docs/security.md`.

## Documentation

- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/security.md`
- `docs/deployment.md`
# CRM
