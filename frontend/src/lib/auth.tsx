/**
 * Factory CRM — auth context (wrapped around App in main.tsx)
 *
 * Restores session via POST /api/auth/refresh; login/logout update in-memory tokens.
 * `can(permission)` feeds Shell nav and route Guards. API still enforces RBAC.
 * User request: comments for future developers.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setSession } from "./api";

export type SessionUser = { id: string; fullName: string; email: string; role: "ADMIN" | "MANAGER" | "STAFF"; permissions: string[]; mustChangePassword: boolean };
type AuthState = { user: SessionUser | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; can: (permission: string) => boolean };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Access token is memory-only — refresh cookie restores the session after reload.
  useEffect(() => {
    void (async () => {
      try {
        const refreshed = await api<{ accessToken: string; csrfToken: string; user: SessionUser }>("/api/auth/refresh", { method: "POST" });
        setSession(refreshed.data.accessToken, refreshed.data.csrfToken);
        setUser(refreshed.data.user);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const result = await api<{ accessToken: string; csrfToken: string; user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(result.data.accessToken, result.data.csrfToken);
    setUser(result.data.user);
  }

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* The session may already have ended. */ }
    setSession(null, null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, login, logout, can: (permission) => Boolean(user?.permissions.includes(permission)) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
