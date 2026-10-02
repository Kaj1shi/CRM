/**
 * Factory CRM — HTTP client (used by auth, Shell search, and all pages)
 *
 * Access JWT: in-memory only. Refresh + CSRF: HTTP-only cookies with credentials.
 * Unsafe methods auto-load CSRF and send `x-csrf-token`. Throws ApiError on failure.
 * User request: section comments for future developers.
 */

export type PageMeta = { page: number; pageSize: number; total: number; pageCount: number };
type Envelope<T> = { success: boolean; data: T; message?: string; errors?: Record<string, string>; warnings?: string[]; meta?: PageMeta };

// --- In-memory session (restored after reload via POST /api/auth/refresh) ---
let accessToken: string | null = null;
let csrfToken: string | null = null;

export function setSession(token: string | null, csrf: string | null) {
  accessToken = token;
  csrfToken = csrf;
}

export class ApiError extends Error {
  errors?: Record<string, string>;
  constructor(message: string, errors?: Record<string, string>) {
    super(message);
    this.errors = errors;
  }
}

async function loadCsrf() {
  const response = await fetch("/api/auth/csrf", { credentials: "include" });
  const body = (await response.json()) as Envelope<{ csrfToken: string }>;
  csrfToken = body.data.csrfToken;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<Envelope<T>> {
  const method = options.method ?? "GET";
  if (method !== "GET" && method !== "HEAD" && !csrfToken) await loadCsrf();

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (csrfToken && method !== "GET" && method !== "HEAD") headers.set("x-csrf-token", csrfToken);

  const response = await fetch(path, { ...options, headers, credentials: "include" });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || body.success === false) throw new ApiError(body.message ?? "Request failed.", body.errors);
  return body;
}

/** Browser download helper for report export payloads (CSV / Excel / PDF). */
export function downloadBase64(filename: string, contentType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
