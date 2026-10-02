/**
 * Factory CRM — route map (imported by main.tsx)
 *
 * Public routes: login / forgot / reset.
 * Authenticated routes sit under Shell; Guard checks session permissions
 * (same keys as backend ROLE_PERMISSIONS). No API schema changes here.
 *
 * User request: add comments so future developers understand each section.
 */
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./layouts/Shell";
import { useAuth } from "./lib/auth";
import { AuditPage, SettingsPage, UsersPage } from "./pages/Admin";
import { DashboardPage } from "./pages/Dashboard";
import { ForgotPage, LoginPage, ResetPage } from "./pages/Login";
import { ClientProfilePage, ClientsPage, SupplierProfilePage, SuppliersPage } from "./pages/Parties";
import { ProductsPage } from "./pages/Products";
import { ReportsPage } from "./pages/Reports";
import { TransactionsPage } from "./pages/Transactions";

const queryClient = new QueryClient();

/** Client-side permission gate; API still enforces the same keys. */
function Guard({ permission, children }: { permission: string; children: ReactNode }) {
  const auth = useAuth();
  if (!auth.can(permission)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const auth = useAuth();
  if (!auth.ready) return <p className="p-6">Loading Factory CRM...</p>;

  // --- Public routes (no session) ---
  if (!auth.user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // --- Authenticated app (sidebar + header via Shell) ---
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Guard permission="dashboard.view"><DashboardPage /></Guard>} />
        <Route path="/clients" element={<Guard permission="clients.view"><ClientsPage /></Guard>} />
        <Route path="/clients/:id" element={<Guard permission="clients.view"><ClientProfilePage /></Guard>} />
        <Route path="/suppliers" element={<Guard permission="suppliers.view"><SuppliersPage /></Guard>} />
        <Route path="/suppliers/:id" element={<Guard permission="suppliers.view"><SupplierProfilePage /></Guard>} />
        <Route path="/products" element={<Guard permission="products.view"><ProductsPage /></Guard>} />
        <Route path="/transactions" element={<Guard permission="transactions.view"><TransactionsPage /></Guard>} />
        <Route path="/reports" element={<Guard permission="reports.operational"><ReportsPage /></Guard>} />
        <Route path="/users" element={<Guard permission="users.manage"><UsersPage /></Guard>} />
        <Route path="/audit" element={<Guard permission="audit.view"><AuditPage /></Guard>} />
        <Route path="/settings" element={<Guard permission="settings.manage"><SettingsPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}
