/**
 * Admin screens: users (create/role/status/password), audit log, settings.
 * Requires users.manage / audit.view / settings.manage respectively.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, type PageMeta } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, Field, Modal, PageHeader, PrimaryButton, SecondaryButton, StatusText, inputClass } from "../components/ui";

type UserRow = { id: string; fullName: string; email: string; role: string; status: string };
type AuditRow = { id: string; action: string; entity: string; details?: string | null; createdAt: string; user?: { fullName: string } | null };
const userSchema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/), role: z.enum(["ADMIN", "MANAGER", "STAFF"]) });
type UserValues = z.infer<typeof userSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/api/users") });
  const [open, setOpen] = useState(false);
  const form = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: { role: "STAFF" } });
  const create = useMutation({
    mutationFn: (values: UserValues) => api("/api/users", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["users"] }); setOpen(false); form.reset(); },
  });
  async function setStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    await api(`/api/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }
  async function assignRole(id: string, role: string) {
    await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }
  async function resetPassword(id: string) {
    const password = window.prompt("Temporary password (letter and number, at least 8 characters)");
    if (!password) return;
    await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ password }) });
  }
  return (
    <section>
      <PageHeader title={messages.users} action={<PrimaryButton onClick={() => setOpen((value) => !value)}>Add user</PrimaryButton>} />
      {open && (
        <Modal title="Add user" onClose={() => setOpen(false)}>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
            <Field label="Full name"><input className={inputClass} {...form.register("fullName")} /></Field>
            <Field label="Email"><input className={inputClass} type="email" {...form.register("email")} /></Field>
            <Field label="Temporary password"><input className={inputClass} type="password" {...form.register("password")} /></Field>
            <Field label="Role"><select className={inputClass} {...form.register("role")}><option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></Field>
            <div className="flex gap-2 md:col-span-2">
              <PrimaryButton>Create user</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setOpen(false)}>{messages.cancel}</SecondaryButton>
            </div>
          </form>
        </Modal>
      )}
      <DataPanel>
        <DataTable headers={["Name", "Email", "Role", "Status", "Actions"]}>
          {(users.data?.data ?? []).map((user) => (
            <tr key={user.id}>
              <td><EntityCell name={user.fullName} detail={user.email} /></td>
              <td>{user.email}</td>
              <td>
                <select aria-label={`Role for ${user.fullName}`} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" value={user.role} onChange={(event) => void assignRole(user.id, event.target.value)}>
                  <option>ADMIN</option>
                  <option>MANAGER</option>
                  <option>STAFF</option>
                </select>
              </td>
              <td><StatusText value={user.status} /></td>
              <td className="space-x-2">
                <SecondaryButton onClick={() => void setStatus(user.id, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</SecondaryButton>
                <SecondaryButton onClick={() => void resetPassword(user.id)}>Reset password</SecondaryButton>
              </td>
            </tr>
          ))}
        </DataTable>
      </DataPanel>
    </section>
  );
}

export function AuditPage() {
  const [action, setAction] = useState("");
  const logs = useQuery({ queryKey: ["audit", action], queryFn: () => api<AuditRow[]>(`/api/audit-logs?pageSize=50${action ? `&action=${action}` : ""}`) });
  const meta = (logs.data as { meta?: PageMeta } | undefined)?.meta;
  return (
    <section>
      <PageHeader title={messages.audit} />
      <select aria-label="Audit action" className={`${inputClass} mb-3 max-w-xs`} value={action} onChange={(event) => setAction(event.target.value)}>
        <option value="">All actions</option>
        {["LOGIN","LOGOUT","CREATE","UPDATE","DEACTIVATE","REACTIVATE","ROLE_CHANGE","PASSWORD_CHANGE","REPORT_EXPORT"].map((item) => <option key={item}>{item}</option>)}
      </select>
      <p className="mb-2 text-sm text-slate-600">{meta ? `${meta.total} records` : "Loading audit records..."}</p>
      <DataPanel>
        <DataTable headers={["When", "User", "Action", "Entity", "Details"]}>
          {(logs.data?.data ?? []).map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.createdAt)}</td>
              <td>{row.user?.fullName ?? "—"}</td>
              <td><StatusText value={row.action} /></td>
              <td>{row.entity}</td>
              <td>{row.details}</td>
            </tr>
          ))}
        </DataTable>
      </DataPanel>
    </section>
  );
}

export function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<Record<string, string | number>>("/api/settings") });
  const [values, setValues] = useState<Record<string, string>>({});
  const current = settings.data?.data ?? {};
  const keys = Object.keys(current);
  async function save(event: FormEvent) {
    event.preventDefault();
    const payload: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(values)) payload[key] = Number.isFinite(Number(value)) && value.trim() !== "" && typeof current[key] === "number" ? Number(value) : value;
    await api("/api/settings", { method: "PATCH", body: JSON.stringify({ values: payload }) });
    await settings.refetch();
    setValues({});
  }
  return (
    <section>
      <PageHeader title={messages.settings} />
      <form className="grid max-w-xl gap-3" onSubmit={(event) => void save(event)}>
        {keys.map((key) => (
          <Field key={key} label={key.replaceAll("_", " ")}>
            <input className={inputClass} value={values[key] ?? String(current[key] ?? "")} onChange={(event) => setValues((previous) => ({ ...previous, [key]: event.target.value }))} />
          </Field>
        ))}
        <PrimaryButton>Save settings</PrimaryButton>
      </form>
    </section>
  );
}
