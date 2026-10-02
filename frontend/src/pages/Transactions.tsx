/**
 * Transactions list + record modal. Reverse sets status REVERSED (admin/manager);
 * reversed rows stay in history but leave quantity totals.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatKg } from "../lib/format";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, ErrorText, Field, Modal, Notice, PageHeader, PrimaryButton, SecondaryButton, StatusText, inputClass } from "../components/ui";

type Option = { id: string; name: string };
type Txn = { id: string; transactionCode: string; transactionDate: string; transactionType: string; quantityKg: number | string | null; inputQuantity: number | string; inputUnit: string; status: string; referenceNumber?: string | null; client?: { name: string } | null; supplier?: { name: string } | null; product: { name: string }; recordedBy: { fullName: string } };
const schema = z.object({
  transactionType: z.enum(["CLIENT_PURCHASE", "SUPPLIER_SUPPLY"]),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.enum(["KG", "TONNE", "PIECE", "OTHER"]),
  transactionDate: z.string().min(10),
  referenceNumber: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
  acknowledgeLargeQuantity: z.boolean().optional(),
});
type Values = z.infer<typeof schema>;

export function TransactionsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const reverse = useMutation({
    mutationFn: (id: string) => api(`/api/transactions/${id}/reverse`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
  const [type, setType] = useState("");
  const list = useQuery({ queryKey: ["transactions", type], queryFn: () => api<Txn[]>(`/api/transactions?pageSize=50${type ? `&transactionType=${type}` : ""}`) });
  const rows = list.data?.data ?? [];
  return (
    <section>
      <PageHeader title={messages.transactions} action={auth.can("transactions.create") ? <PrimaryButton onClick={() => setOpen(true)}>{messages.recordTransaction}</PrimaryButton> : undefined} />
      <select aria-label="Transaction type" className={`${inputClass} mb-3 max-w-xs`} value={type} onChange={(event) => setType(event.target.value)}>
        <option value="">All types</option><option value="CLIENT_PURCHASE">Client purchase</option><option value="SUPPLIER_SUPPLY">Supplier supply</option>
      </select>
      {list.isLoading && <p>Loading transactions...</p>}
      {!list.isLoading && rows.length === 0 && <Notice>{messages.emptyTransactions}</Notice>}
      {rows.length > 0 && (
        <DataPanel>
          <DataTable headers={["Date", "Code", "Party", "Type", "Product", "Quantity", "Status", "Recorded by", "Correction"]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.transactionDate)}</td>
                <td className="font-medium text-slate-700">{row.transactionCode}</td>
                <td><EntityCell name={row.client?.name ?? row.supplier?.name ?? "—"} /></td>
                <td><StatusText value={row.transactionType} /></td>
                <td>{row.product.name}</td>
                <td><span className="inline-flex rounded-md bg-[#e8f7ef] px-2.5 py-1 text-xs font-medium text-[#0f6b45]">{row.inputUnit === "KG" || row.inputUnit === "TONNE" ? formatKg(Number(row.quantityKg)) : `${row.inputQuantity} ${row.inputUnit}`}</span></td>
                <td><StatusText value={row.status} /></td>
                <td>{row.recordedBy.fullName}</td>
                <td>{auth.can("transactions.reverse") && row.status === "RECORDED" ? <SecondaryButton onClick={() => { if (window.confirm(`Reverse ${row.transactionCode}? It stays in history and leaves the totals.`)) reverse.mutate(row.id); }}>Reverse</SecondaryButton> : "—"}</td>
              </tr>
            ))}
          </DataTable>
        </DataPanel>
      )}
      {open && <RecordForm onClose={() => setOpen(false)} />}
    </section>
  );
}

function RecordForm({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const clients = useQuery({ queryKey: ["clients", "options"], queryFn: () => api<Option[]>("/api/clients?pageSize=100") });
  const suppliers = useQuery({ queryKey: ["suppliers", "options"], queryFn: () => api<Option[]>("/api/suppliers?pageSize=100") });
  const products = useQuery({ queryKey: ["products", "options"], queryFn: () => api<Option[]>("/api/products?pageSize=100&status=ACTIVE") });
  const [warning, setWarning] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { transactionType: "CLIENT_PURCHASE", unit: "KG", transactionDate: today, quantity: 1 } });
  const type = form.watch("transactionType");
  const unit = form.watch("unit");
  const save = useMutation({
    mutationFn: (values: Values) => api("/api/transactions", { method: "POST", body: JSON.stringify({ ...values, clientId: values.transactionType === "CLIENT_PURCHASE" ? values.clientId : undefined, supplierId: values.transactionType === "SUPPLIER_SUPPLY" ? values.supplierId : undefined }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["transactions"] }); onClose(); },
    onError: (error) => { if (error instanceof ApiError) setWarning(error.message); },
  });
  return (
    <Modal title={messages.recordTransaction} onClose={onClose}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <Field label="Type"><select className={inputClass} {...form.register("transactionType")}><option value="CLIENT_PURCHASE">Client purchase</option><option value="SUPPLIER_SUPPLY">Supplier supply</option></select></Field>
        {type === "CLIENT_PURCHASE" ? <Field label="Client"><select className={inputClass} {...form.register("clientId")}><option value="">Select client</option>{(clients.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field> : <Field label="Supplier"><select className={inputClass} {...form.register("supplierId")}><option value="">Select supplier</option>{(suppliers.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
        <Field label="Product"><select className={inputClass} {...form.register("productId")}><option value="">Select product</option>{(products.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Quantity"><input className={inputClass} type="number" min="0.001" step="0.001" {...form.register("quantity")} /></Field>
        <Field label="Unit"><select className={inputClass} {...form.register("unit")}><option value="KG">Kilogram</option><option value="TONNE">Tonne</option><option value="PIECE">Piece</option><option value="OTHER">Other</option></select></Field>
        <Field label="Date"><input className={inputClass} type="date" {...form.register("transactionDate")} /></Field>
        <Field label="Reference"><input className={inputClass} {...form.register("referenceNumber")} /></Field>
        <Field label="Notes"><textarea className={inputClass} {...form.register("notes")} /></Field>
        {unit === "TONNE" && <p className="text-sm text-slate-600 md:col-span-2">{messages.tonneHint}</p>}
        {warning && <Notice>{warning} <label className="ml-2"><input type="checkbox" {...form.register("acknowledgeLargeQuantity")} /> Confirm this quantity</label></Notice>}
        <ErrorText>{form.formState.errors.productId?.message || form.formState.errors.quantity?.message}</ErrorText>
        {auth.can("transactions.create") && <div className="flex gap-2 md:col-span-2"><PrimaryButton disabled={save.isPending}>{messages.save}</PrimaryButton><SecondaryButton type="button" onClick={onClose}>{messages.cancel}</SecondaryButton></div>}
      </form>
    </Modal>
  );
}
