# Database

The Prisma schema is `backend/prisma/schema.prisma`. The initial migration is `backend/prisma/migrations/20260928153000_init`.

Primary keys are UUIDs. Human codes are unique. Email is unique. Indexes cover codes, names, phones, statuses, categories, foreign keys, transaction type and date, and audit user, action, entity, entity id, and created time.

## Enums

`UserRole`, `UserStatus`, `EntityStatus`, `ClientStatus`, `ClientType`, `SupplierType`, `ProductCategory`, `ProductUnit`, `TransactionType`, `TransactionStatus`, `AuditAction`.

## Main tables

- Role, Permission, RolePermission, User
- RefreshToken and PasswordResetToken store hashes, expiry, and revocation or use
- Location, Client, Supplier, Product
- Transaction, including optional `reversesTransactionId`
- AuditLog, Setting, CodeSequence

The party check on `transactions` requires a purchase to have `client_id` and a null `supplier_id`, and a supply to have the opposite.

Deleting a client, supplier, or product in the API sets status to `INACTIVE`. The row stays. Reversing a transaction sets status to `REVERSED` and later totals skip that row.

`quantityKg` is null for Piece and Other. `inputQuantity` and `inputUnit` keep what the person entered.

Settings keys are `inactive_after_days` (30), `dormant_after_days` (90), `max_quantity_kg_warning` (100000), `factory_name`, `timezone`, and the code prefixes.

Frequency uses the median gap between unique dates. Fewer than 3 dates is `INSUFFICIENT_DATA`. Up to 3 days is `MULTIPLE_PER_WEEK`, 9 is `WEEKLY`, 18 is `BIWEEKLY`, 40 is `MONTHLY`, and anything longer is `IRREGULAR`. The dates 2, 9, 16, and 23 September 2026 are weekly.

Activity is Active inside `inactive_after_days`, At risk until `dormant_after_days`, then Dormant. The label does not overwrite `Client.status`.
