# Security

Passwords are hashed with Argon2id. The access token lasts 15 minutes and is returned in the JSON body. The React app keeps it in memory. The refresh token is a random value stored only as a SHA-256 hash and sent in an HTTP-only cookie scoped to `/api/auth`. Logout revokes it. Refresh rotates it.

Login allows 5 attempts per minute. Five failed passwords lock the account for 15 minutes. The failure message does not say whether the email exists. Forgot-password returns one generic message. In development the reset link is written to the server log. There is no live email delivery.

A double-submit cookie supplies CSRF protection. The cookie is readable by the browser and the matching header is required on POST, PATCH, and DELETE.

Guards run in this order: throttle, CSRF, JWT, permission. Staff cannot manage users, assign roles, change settings, open the audit screen, change party or product status, or reverse transactions. Managers cannot manage users, assign roles, or change settings. Managers can read the audit log. Staff can export operational reports. Management quantity and purchasing reports require the management permission.

Direct object access is allowed when the caller's role includes the permission. There is no per-record ownership split because this is one factory.

Audit details, old values, and new values strip password, hash, and token fields. Logs redact authorization, cookie, password, token, and set-cookie headers.

Helmet is enabled. CORS allows `FRONTEND_URL` with credentials. Validation rejects unexpected fields.

The development seed is rejected when `NODE_ENV=production`.
