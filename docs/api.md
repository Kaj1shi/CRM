# API

Base path: `/api`.

Success responses are `{ success: true, data, message? }`. List routes that already return `data` and `message` also include `meta` with `page`, `pageSize`, `total`, and `pageCount`. Page size is 25, 50, or 100.

Errors are `{ success: false, message, errors? }`. Production responses omit stack traces, SQL, and file paths.

Unsafe methods need the `x-csrf-token` header to match the `csrf_token` cookie. Protected methods also need `Authorization: Bearer <access token>`.

## Auth

- `GET /auth/csrf`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `GET /health` is public

## Records

- Locations: `GET /locations`, `POST /locations`, `PATCH /locations/:id`
- Clients and suppliers: list, create, get, patch, `PATCH /:id/status`, `DELETE /:id` (deactivate), `GET /:id/transactions`, `GET /:id/summary`
- Products: list, create, get, patch, status, deactivate
- Transactions: list, create, get, patch notes and reference, `POST /:id/reverse`, `GET /transactions/summary`
- Dashboard: `/dashboard/summary`, `/dashboard/recent-transactions`, `/dashboard/purchase-trends`, `/dashboard/alerts`
- Reports: `/reports/clients`, `/reports/suppliers`, `/reports/transactions`, `/reports/quantities`, `/reports/purchasing`. Add `format=csv|xlsx|pdf` to download. The file is returned as base64 with a filename and content type.
- Users: list, create, patch, `PATCH /users/:id/status`
- Roles: `GET /roles`
- Audit: `GET /audit-logs`
- Settings: `GET /settings`, `PATCH /settings` with `{ values }`
- Search: `GET /search?q=` with at least 2 characters

List filters include search, status, location, type, category, date range, sort, and pagination. Report filters include date range, party, product, location, type, and status.

A duplicate client or supplier name, phone, or email returns a conflict until the request includes `confirmDuplicate: true`. A weight above the warning threshold returns a conflict until `acknowledgeLargeQuantity: true`.
