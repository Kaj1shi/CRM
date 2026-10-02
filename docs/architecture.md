# Architecture

Factory CRM is one NestJS API and one React application. They share a PostgreSQL database through Prisma. There are no microservices.

```text
Browser -- HTTPS JSON and cookies --> NestJS API -- Prisma --> PostgreSQL
```

The API lives in `backend/src` and uses the global prefix `/api`. Domain modules are auth, users, roles, locations, clients, suppliers, products, transactions, dashboard, reports, audit, settings, and search. Business rules live in services. Controllers validate input with class-validator. The web app repeats the same checks with Zod on the main forms.

Permissions are rows in `Permission` and `RolePermission`. Guards read the signed-in user's role and reject the request when the permission is missing. The three roles are ADMIN, MANAGER, and STAFF.

A client purchase stores a client and an empty supplier. A supplier supply stores a supplier and an empty client. The transaction service and a Postgres check constraint both reject every other combination.

Weight is stored in `quantityKg`. One tonne is saved as 1,000 kilograms. Piece and Other stay in their entered unit and are left out of tonne totals.

Frequency and activity are calculated from transaction dates. They are not columns. Client status remains the stored value `ACTIVE`, `INACTIVE`, or `DORMANT`.

Dates are stored in UTC. `transactionDate` is a date. The interface formats dates in `Africa/Kampala` as `28 Sep 2026`.

Codes come from a locked `CodeSequence` row: `CL-`, `SUP-`, `TXN-`, and product prefixes `PRD`, `MAT`, and `OTH`.
