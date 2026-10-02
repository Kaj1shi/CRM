# Deployment

1. Create a Postgres database that the API host can reach. On Supabase, copy the session pooler URL into `DATABASE_URL` and the direct URL into `DIRECT_URL` when migrations must avoid the transaction pooler.
2. Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `BACKEND_URL`, `PORT`, and `NODE_ENV=production` in the server environment. Keep `SUPABASE_SECRET_KEY` on the server only if a later feature needs it.
3. Run `npx prisma migrate deploy` from `backend`. Do not run the seed in production.
4. Build and start the API: `npm run build` then `npm run start:prod`.
5. Build the web app with `npm run build` in `frontend` and serve `frontend/dist`.
6. Terminate TLS in front of both apps. Production cookies are marked secure.
7. Create the first administrator through a controlled database insert or a one-off script that hashes the password with Argon2id. Do not copy the development accounts.

Docker Compose in this repository starts a local Postgres 16 database named `factory_crm` on port 5432. It is the offline fallback, not the production topology.

Rotate any database password or API key that has appeared in a chat, ticket, or shell history before pointing the app at that project.
