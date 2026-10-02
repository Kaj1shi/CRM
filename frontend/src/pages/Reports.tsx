/**
 * Operational + management reports. Headers/cells are formatted for display;
 * CSV/Excel/PDF export downloads base64 from the same report endpoints.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, downloadBase64 } from "../lib/api";
import { useAuth } from "../lib/auth";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, Field, PageHeader, PrimaryButton, StatusText, inputClass } from "../components/ui";

type Report = { title: string; generatedAt: string; rows?: Record<string, unknown>[]; totals?: Record<string, number>; file?: { filename: string; contentType: string; base64: string } };
const operational = ["clients", "suppliers", "transactions"] as const;
const management = ["quantities", "purchasing"] as const;

const headerLabels: Record<string, string> = {
  code: "Code",
  name: "Name",
  location: "Location",
  status: "Status",
  frequency: "Frequency",
  totalKg: "Total kg",
  transactionCode: "Code",
  transactionDate: "Date",
  transactionType: "Type",
  product: "Product",
  quantityKg: "Quantity kg",
  party: "Party",
  clientsCount: "Clients",
  suppliersCount: "Suppliers",
  purchasedKg: "Purchased kg",
  suppliedKg: "Supplied kg",
};

const statusKeys = new Set(["status", "frequency", "transactionType", "activity", "category", "role"]);
const entityKeys = new Set(["name", "party", "product"]);

function cellValue(header: string, value: unknown) {
  if (value == null || value === "") return "—";
  const text = String(value);
  if (statusKeys.has(header)) return <StatusText value={text} />;
  if (entityKeys.has(header)) return <EntityCell name={text} />;
  if (header.toLowerCase().includes("kg") && !Number.isNaN(Number(value))) {
    return <span className="inline-flex rounded-md bg-[#e8f7ef] px-2.5 py-1 text-xs font-medium text-[#0f6b45]">{Number(value).toLocaleString()} kg</span>;
  }
  return text;
}

export function ReportsPage() {
  const auth = useAuth();
  const kinds = [...operational, ...(auth.can("reports.management") ? management : [])];
  const [kind, setKind] = useState<(typeof kinds)[number]>("clients");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const report = useQuery({ queryKey: ["report", kind, query.toString()], queryFn: () => api<Report>(`/api/reports/${kind}?${query}`) });
  const rows = report.data?.data.rows ?? [];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  async function exportReport(format: "csv" | "xlsx" | "pdf") {
    const params = new URLSearchParams(query);
    params.set("format", format);
    const result = await api<Report>(`/api/reports/${kind}?${params}`);
    const file = result.data.file;
    if (file) downloadBase64(file.filename, file.contentType, file.base64);
  }
  return (
    <section>
      <PageHeader title={messages.reports} />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Report"><select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>{kinds.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        <Field label="From"><input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field label="To"><input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
      </div>
      {auth.can("reports.export") && <div className="mb-4 flex gap-2"><PrimaryButton onClick={() => void exportReport("csv")}>CSV</PrimaryButton><PrimaryButton onClick={() => void exportReport("xlsx")}>Excel</PrimaryButton><PrimaryButton onClick={() => void exportReport("pdf")}>PDF</PrimaryButton></div>}
      {report.isLoading && <p>Preparing report...</p>}
      {rows.length > 0 && (
        <DataPanel>
          <DataTable headers={headers.map((header) => headerLabels[header] ?? header.replaceAll(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()))}>
            {rows.map((row, index) => (
              <tr key={index}>
                {headers.map((header) => <td key={header}>{cellValue(header, row[header])}</td>)}
              </tr>
            ))}
          </DataTable>
        </DataPanel>
      )}
      {report.data?.data.totals && <p className="mt-3 text-sm">Totals: {Object.entries(report.data.data.totals).map(([key, value]) => `${headerLabels[key] ?? key} ${value}`).join(" · ")}</p>}
    </section>
  );
}
