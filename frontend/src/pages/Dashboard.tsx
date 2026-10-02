/**
 * Dashboard: summary cards, Recharts trends, recent transactions, inactivity alerts.
 * Data from /api/dashboard/*. Totals exclude REVERSED transactions on the server.
 */
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageCheck, ArrowUpFromLine, Package, Receipt, Truck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { formatDate, formatKg } from "../lib/format";
import { messages } from "../messages";
import { DataPanel, DataTable, EntityCell, StatusText } from "../components/ui";

type Summary = { totalClients: number; activeClients: number; totalSuppliers: number; activeSuppliers: number; totalProducts: number; transactionsThisMonth: number; quantityPurchasedThisMonthKg: number; quantitySuppliedThisMonthKg: number };
type Trends = { months: { month: string; purchasedKg: number; suppliedKg: number; transactions: number }[]; locations: { name: string; count: number }[]; frequency: { name: string; count: number }[] };
type Recent = { id: string; transactionDate: string; transactionCode: string; transactionType: string; quantityKg: number | null; client?: { name: string } | null; supplier?: { name: string } | null; product: { name: string }; recordedBy: { fullName: string } }[];

const tones = {
  emerald: { panel: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-[#fffcf8]", icon: "bg-emerald-600 text-white", label: "text-emerald-800", value: "text-emerald-950", detail: "text-emerald-700/80" },
  teal: { panel: "border-teal-200/80 bg-gradient-to-br from-teal-50 to-[#fffcf8]", icon: "bg-teal-600 text-white", label: "text-teal-800", value: "text-teal-950", detail: "text-teal-700/80" },
  lime: { panel: "border-lime-200/80 bg-gradient-to-br from-lime-50 to-[#fffcf8]", icon: "bg-lime-600 text-white", label: "text-lime-800", value: "text-lime-950", detail: "text-lime-700/80" },
  sky: { panel: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-[#fffcf8]", icon: "bg-sky-600 text-white", label: "text-sky-800", value: "text-sky-950", detail: "text-sky-700/80" },
  amber: { panel: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-[#fffcf8]", icon: "bg-amber-500 text-white", label: "text-amber-900", value: "text-amber-950", detail: "text-amber-800/80" },
  stone: { panel: "border-stone-200 bg-gradient-to-br from-stone-100 to-[#fffcf8]", icon: "bg-stone-600 text-white", label: "text-stone-700", value: "text-stone-900", detail: "text-stone-600" },
} as const;

type Tone = keyof typeof tones;

export function DashboardPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => api<Summary>("/api/dashboard/summary") });
  const trends = useQuery({ queryKey: ["trends"], queryFn: () => api<Trends>("/api/dashboard/purchase-trends") });
  const recent = useQuery({ queryKey: ["recent"], queryFn: () => api<Recent>("/api/dashboard/recent-transactions") });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: () => api<{ inactiveClients: { name: string; clientCode: string }[]; note: string }>("/api/dashboard/alerts") });
  const cards = summary.data?.data;
  const rows = recent.data?.data ?? [];
  return (
    <section>
      <h1 className="text-4xl font-medium tracking-tight">{messages.dashboard}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card featured tone="emerald" icon={PackageCheck} label="Purchased this month" value={formatKg(cards?.quantityPurchasedThisMonthKg)} />
        <Card tone="teal" icon={ArrowUpFromLine} label="Supplied this month" value={formatKg(cards?.quantitySuppliedThisMonthKg)} />
        <Card tone="lime" icon={Receipt} label="Transactions this month" value={cards?.transactionsThisMonth} />
        <Card tone="sky" icon={Users} label="Total clients" value={cards?.totalClients} detail={`${cards?.activeClients ?? "—"} active`} />
        <Card tone="amber" icon={Truck} label="Suppliers" value={cards?.totalSuppliers} detail={`${cards?.activeSuppliers ?? "—"} active`} />
        <Card tone="stone" icon={Package} label="Products" value={cards?.totalProducts} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Chart title="Quantity purchased over time"><ResponsiveContainer width="100%" height={240} debounce={300}><LineChart data={trends.data?.data.months ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="purchasedKg" stroke="#059669" /></LineChart></ResponsiveContainer></Chart>
        <Chart title="Quantity supplied over time"><ResponsiveContainer width="100%" height={240} debounce={300}><LineChart data={trends.data?.data.months ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="suppliedKg" stroke="#0d9488" /></LineChart></ResponsiveContainer></Chart>
        <Chart title="Transactions by month"><ResponsiveContainer width="100%" height={240} debounce={300}><BarChart data={trends.data?.data.months ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="transactions" fill="#65a30d" /></BarChart></ResponsiveContainer></Chart>
        <Chart title="Clients by location"><ResponsiveContainer width="100%" height={240} debounce={300}><BarChart data={trends.data?.data.locations ?? []}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#0284c7" /></BarChart></ResponsiveContainer></Chart>
      </div>
      <div className="mt-6">
        <DataPanel title="Recent transactions">
          <DataTable headers={["#", "Party", "Code", "Type", "Product", "Quantity", "Date", "Recorded by"]}>
            {rows.map((row, index) => {
              const party = row.client?.name ?? row.supplier?.name ?? "—";
              return (
                <tr key={row.id}>
                  <td className="text-slate-500">{index + 1}</td>
                  <td><EntityCell name={party} detail={row.transactionCode} /></td>
                  <td className="font-medium text-slate-700">{row.transactionCode}</td>
                  <td><StatusText value={row.transactionType === "CLIENT_PURCHASE" ? "CLIENT_PURCHASE" : "SUPPLIER_SUPPLY"} /></td>
                  <td>{row.product.name}</td>
                  <td><span className="inline-flex rounded-md bg-[#e8f7ef] px-2.5 py-1 text-xs font-medium text-[#0f6b45]">{formatKg(row.quantityKg)}</span></td>
                  <td>{formatDate(row.transactionDate)}</td>
                  <td>{row.recordedBy.fullName}</td>
                </tr>
              );
            })}
          </DataTable>
        </DataPanel>
      </div>
      <aside className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <h2 className="font-medium">Alerts</h2>
        <p className="mt-1 text-slate-700">{alerts.data?.data.note ?? messages.activityNote}</p>
        <ul className="mt-2 list-disc pl-5">{(alerts.data?.data.inactiveClients ?? []).map((item) => <li key={item.clientCode}>{item.name} ({item.clientCode}) has no recent purchase.</li>)}</ul>
      </aside>
    </section>
  );
}

function Card({ label, value, detail, featured, tone, icon: Icon }: { label: string; value?: string | number; detail?: string; featured?: boolean; tone: Tone; icon: typeof Users }) {
  const colors = tones[tone];
  return (
    <article className={`rounded-xl border p-4 ${colors.panel} ${featured ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs tracking-[0.12em] uppercase ${colors.label}`}>{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${colors.icon}`}>
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <p className={`mt-3 font-medium tracking-tight ${colors.value} ${featured ? "text-5xl" : "text-3xl"}`}>{value ?? "—"}</p>
      {detail ? <p className={`mt-2 text-sm ${colors.detail}`}>{detail}</p> : null}
    </article>
  );
}

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-[#fffcf8] p-4"><h2 className="mb-3 text-sm font-medium text-slate-700">{title}</h2><div className="h-[240px] w-full">{children}</div></article>;
}
