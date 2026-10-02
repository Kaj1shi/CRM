/**
 * Products list + create modal. Deactivate/reactivate requires products.deactivate.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, ErrorText, Field, Modal, Notice, PageHeader, PrimaryButton, SecondaryButton, StatusText, inputClass } from "../components/ui";

type Product = { id: string; productCode: string; name: string; category: string; unit: string; status: string; description?: string | null };
const schema = z.object({
  name: z.string().min(2).max(160),
  category: z.enum(["FINISHED_PRODUCT", "RAW_MATERIAL", "OTHER"]),
  unit: z.enum(["KG", "TONNE", "PIECE", "OTHER"]),
  description: z.string().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

export function ProductsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => api(`/api/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
  const list = useQuery({ queryKey: ["products", search], queryFn: () => api<Product[]>(`/api/products?search=${encodeURIComponent(search)}&pageSize=50`) });
  const rows = list.data?.data ?? [];
  return (
    <section>
      <PageHeader title={messages.products} action={auth.can("products.create") ? <PrimaryButton onClick={() => setOpen(true)}>{messages.addProduct}</PrimaryButton> : undefined} />
      <input aria-label="Search products" className={`${inputClass} mb-3 max-w-sm`} placeholder="Search name or code" value={search} onChange={(event) => setSearch(event.target.value)} />
      {list.isLoading && <p>Loading products...</p>}
      {list.isError && <ErrorText>Could not load products.</ErrorText>}
      {!list.isLoading && rows.length === 0 && <Notice>{messages.emptyProducts}</Notice>}
      {rows.length > 0 && (
        <DataPanel>
          <DataTable headers={["Code", "Name", "Category", "Unit", "Status", "Action"]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium text-slate-700">{row.productCode}</td>
                <td><EntityCell name={row.name} /></td>
                <td><StatusText value={row.category} /></td>
                <td>{row.unit}</td>
                <td><StatusText value={row.status} /></td>
                <td>{auth.can("products.deactivate") && <SecondaryButton onClick={() => { const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"; if (next === "INACTIVE" && !window.confirm(`Deactivate ${row.name}?`)) return; setStatus.mutate({ id: row.id, status: next }); }}>{row.status === "ACTIVE" ? "Deactivate" : "Reactivate"}</SecondaryButton>}</td>
              </tr>
            ))}
          </DataTable>
        </DataPanel>
      )}
      {open && <ProductForm onClose={() => setOpen(false)} />}
    </section>
  );
}

function ProductForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", category: "FINISHED_PRODUCT", unit: "KG" } });
  const save = useMutation({
    mutationFn: (values: Values) => api("/api/products", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["products"] }); onClose(); },
  });
  return (
    <Modal title={messages.addProduct} onClose={onClose}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <Field label="Name"><input className={inputClass} {...form.register("name")} /></Field>
        <Field label="Category"><select className={inputClass} {...form.register("category")}><option value="FINISHED_PRODUCT">Finished product</option><option value="RAW_MATERIAL">Raw material</option><option value="OTHER">Other</option></select></Field>
        <Field label="Unit"><select className={inputClass} {...form.register("unit")}><option value="KG">Kilogram</option><option value="TONNE">Tonne</option><option value="PIECE">Piece</option><option value="OTHER">Other</option></select></Field>
        <Field label="Description"><textarea className={inputClass} {...form.register("description")} /></Field>
        <div className="flex gap-2 md:col-span-2"><PrimaryButton>{messages.save}</PrimaryButton><SecondaryButton type="button" onClick={onClose}>{messages.cancel}</SecondaryButton></div>
      </form>
    </Modal>
  );
}
