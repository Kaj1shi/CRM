/**
 * Clients & suppliers list + profile screens.
 * Both parties share PartyListPage / PartyForm / PartyProfile; only API paths and labels differ.
 * Create forms open in Modal. Soft delete = deactivate (DELETE on API).
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError, api, type PageMeta } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatKg } from "../lib/format";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, ErrorText, Field, Modal, Notice, PageHeader, PrimaryButton, SecondaryButton, StatusText, inputClass } from "../components/ui";

type Location = { id: string; name: string; district?: string | null; distanceKm?: number | null };
type Party = {
  id: string; name: string; phone?: string | null; email?: string | null; contactPerson?: string | null;
  status: string; clientType?: string; supplierType?: string; distanceKm?: number | null; notes?: string | null;
  locationId?: string | null; location?: Location | null; frequency: string; activity: string;
  totalQuantityKg: number; transactionCount: number; averageQuantityKg: number; lastTransactionDate?: string | null;
  quantityThisMonthKg: number; quantityThisYearKg: number; clientCode?: string; supplierCode?: string;
};
type PartyList = { data: Party[]; meta?: PageMeta };
type Txn = { id: string; transactionCode: string; transactionDate: string; quantityKg: number | string | null; product: { name: string }; status: string };

const schema = z.object({
  name: z.string().min(2).max(160),
  contactPerson: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  locationId: z.string().optional(),
  distanceKm: z.coerce.number().min(0).optional(),
  kind: z.string().optional(),
  notes: z.string().max(2000).optional(),
  confirmDuplicate: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ClientsPage() { return <PartyListPage kind="clients" />; }
export function SuppliersPage() { return <PartyListPage kind="suppliers" />; }
export function ClientProfilePage() { return <PartyProfile kind="clients" />; }
export function SupplierProfilePage() { return <PartyProfile kind="suppliers" />; }

function PartyListPage({ kind }: { kind: "clients" | "suppliers" }) {
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const query = new URLSearchParams({ page: String(page), pageSize: "25", search, ...(status ? { status } : {}) });
  const list = useQuery({ queryKey: [kind, query.toString()], queryFn: () => api<Party[]>(`/api/${kind}?${query}`) });
  const rows = (list.data as (PartyList & { data: Party[] }) | undefined)?.data ?? [];
  const meta = (list.data as PartyList | undefined)?.meta;
  const title = kind === "clients" ? messages.clients : messages.suppliers;
  const canCreate = auth.can(kind === "clients" ? "clients.create" : "suppliers.create");
  return (
    <section>
      <PageHeader title={title} action={canCreate ? <PrimaryButton onClick={() => setOpen(true)}>{kind === "clients" ? messages.addClient : messages.addSupplier}</PrimaryButton> : undefined} />
      <div className="mb-3 flex flex-wrap gap-2">
        <input aria-label={`Search ${title}`} className={`${inputClass} max-w-sm`} placeholder="Search name, code, phone, or email" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        <select aria-label="Status" className={inputClass + " max-w-40"} value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          {kind === "clients" && <option value="DORMANT">Dormant</option>}
        </select>
      </div>
      {list.isLoading && <p>Loading {title.toLowerCase()}...</p>}
      {list.isError && <ErrorText>Could not load {title.toLowerCase()}.</ErrorText>}
      {!list.isLoading && rows.length === 0 && <Notice>{kind === "clients" ? messages.emptyClients : messages.emptySuppliers} {canCreate && "Use the button above to add the first record."}</Notice>}
      {rows.length > 0 && (
        <DataPanel>
          <DataTable headers={["Code", "Name", "Location", "Status", "Activity", "Frequency", "Last transaction"]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link className="font-medium text-blue-700" to={`/${kind}/${row.id}`}>{row.clientCode ?? row.supplierCode}</Link></td>
                <td><EntityCell name={row.name} detail={row.location?.name ?? undefined} /></td>
                <td>{row.location?.name ?? "—"}</td>
                <td><StatusText value={row.status} /></td>
                <td><StatusText value={row.activity} /></td>
                <td><StatusText value={row.frequency} /></td>
                <td>{formatDate(row.lastTransactionDate)}</td>
              </tr>
            ))}
          </DataTable>
        </DataPanel>
      )}
      {meta && meta.pageCount > 1 && <div className="mt-3 flex gap-2"><SecondaryButton disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</SecondaryButton><span className="self-center text-sm">Page {meta.page} of {meta.pageCount}</span><SecondaryButton disabled={page >= meta.pageCount} onClick={() => setPage((value) => value + 1)}>Next</SecondaryButton></div>}
      {open && <PartyForm kind={kind} onClose={() => setOpen(false)} />}
    </section>
  );
}

function PartyForm({ kind, onClose }: { kind: "clients" | "suppliers"; onClose: () => void }) {
  const queryClient = useQueryClient();
  const locations = useQuery({ queryKey: ["locations"], queryFn: () => api<Location[]>("/api/locations") });
  const [warning, setWarning] = useState("");
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", confirmDuplicate: false } });
  const save = useMutation({
    mutationFn: (values: FormValues) => api(`/api/${kind}`, { method: "POST", body: JSON.stringify(payload(kind, values)) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: [kind] }); onClose(); },
    onError: (error) => { if (error instanceof ApiError) setWarning(error.message); },
  });
  return (
    <Modal title={kind === "clients" ? messages.addClient : messages.addSupplier} onClose={onClose}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <Field label="Name"><input className={inputClass} {...form.register("name")} /></Field>
        <Field label="Contact person"><input className={inputClass} {...form.register("contactPerson")} /></Field>
        <Field label="Phone"><input className={inputClass} {...form.register("phone")} /></Field>
        <Field label="Email"><input className={inputClass} type="email" {...form.register("email")} /></Field>
        <Field label="Location"><select className={inputClass} {...form.register("locationId")}><option value="">Select a location</option>{(locations.data?.data ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Distance (km)"><input className={inputClass} type="number" min={0} step="0.1" {...form.register("distanceKm")} /></Field>
        <Field label={kind === "clients" ? "Client type" : "Supplier type"}>
          <select className={inputClass} {...form.register("kind")}>
            {(kind === "clients" ? ["INDIVIDUAL","BUSINESS","DISTRIBUTOR","WHOLESALER","RETAILER","OTHER"] : ["INDIVIDUAL","BUSINESS","FARMER","DISTRIBUTOR","MANUFACTURER","OTHER"]).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea className={inputClass} {...form.register("notes")} /></Field>
        <ErrorText>{form.formState.errors.name?.message}</ErrorText>
        {warning && <Notice>{warning} <label className="ml-2"><input type="checkbox" {...form.register("confirmDuplicate")} /> Save anyway</label></Notice>}
        <div className="flex gap-2 md:col-span-2"><PrimaryButton disabled={save.isPending}>{save.isPending ? messages.saving : messages.save}</PrimaryButton><SecondaryButton type="button" onClick={onClose}>{messages.cancel}</SecondaryButton></div>
      </form>
    </Modal>
  );
}

function payload(kind: "clients" | "suppliers", values: FormValues) {
  return {
    name: values.name,
    contactPerson: values.contactPerson || undefined,
    phone: values.phone || undefined,
    email: values.email || undefined,
    locationId: values.locationId || undefined,
    distanceKm: values.distanceKm,
    notes: values.notes || undefined,
    confirmDuplicate: values.confirmDuplicate,
    ...(kind === "clients" ? { clientType: values.kind || "BUSINESS" } : { supplierType: values.kind || "BUSINESS" }),
  };
}

function PartyProfile({ kind }: { kind: "clients" | "suppliers" }) {
  const { id = "" } = useParams();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const party = useQuery({ queryKey: [kind, id], queryFn: () => api<Party>(`/api/${kind}/${id}`) });
  const history = useQuery({ queryKey: [kind, id, "tx"], queryFn: () => api<Txn[]>(`/api/${kind}/${id}/transactions`) });
  const row = party.data?.data;
  const deactivate = useMutation({
    mutationFn: () => api(`/api/${kind}/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [kind, id] }),
  });
  const reactivate = useMutation({
    mutationFn: () => api(`/api/${kind}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [kind, id] }),
  });
  if (!row) return <p>Loading profile...</p>;
  const canStatus = auth.can(kind === "clients" ? "clients.deactivate" : "suppliers.deactivate");
  return (
    <section className="space-y-4">
      <PageHeader title={row.name} action={<Link className="text-sm text-blue-700" to={`/${kind}`}>Back to list</Link>} />
      <p className="text-sm text-slate-600">{row.clientCode ?? row.supplierCode} · {row.location?.name ?? "No location"} · {row.distanceKm ?? "—"} km</p>
      <div className="flex flex-wrap gap-2"><StatusText value={row.status} /><StatusText value={row.activity} /><StatusText value={row.frequency} /></div>
      <Notice>{messages.activityNote} Stored status stays separate from this activity label.</Notice>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded border bg-white p-3"><p className="text-xs text-slate-500">Total quantity</p><p className="text-xl">{formatKg(row.totalQuantityKg)}</p></article>
        <article className="rounded border bg-white p-3"><p className="text-xs text-slate-500">Transactions</p><p className="text-xl">{row.transactionCount}</p></article>
        <article className="rounded border bg-white p-3"><p className="text-xs text-slate-500">This year</p><p className="text-xl">{formatKg(row.quantityThisYearKg)}</p></article>
      </div>
      <p className="text-sm">Average {formatKg(row.averageQuantityKg)} · This month {formatKg(row.quantityThisMonthKg)} · Last {formatDate(row.lastTransactionDate)}</p>
      {canStatus && row.status !== "INACTIVE" && <SecondaryButton onClick={() => { if (window.confirm(`Deactivate ${row.name}? The record stays in history.`)) deactivate.mutate(); }}>Deactivate</SecondaryButton>}
      {canStatus && row.status !== "ACTIVE" && <PrimaryButton onClick={() => reactivate.mutate()}>Reactivate</PrimaryButton>}
      <div className="mt-4">
        <DataPanel title="Transaction history">
          <DataTable headers={["Date", "Code", "Product", "Quantity", "Status"]}>
            {(history.data?.data ?? []).map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.transactionDate)}</td>
                <td className="font-medium">{item.transactionCode}</td>
                <td>{item.product.name}</td>
                <td>{formatKg(item.quantityKg === null ? null : Number(item.quantityKg))}</td>
                <td><StatusText value={item.status} /></td>
              </tr>
            ))}
          </DataTable>
        </DataPanel>
      </div>
    </section>
  );
}
