/**
 * Factory CRM — authenticated chrome (sidebar + header)
 *
 * Used as the parent route element in App.tsx. Nav links are filtered by
 * `auth.can(permission)`. Collapse animates width; labels hide when collapsed.
 * Global search hits GET /api/search. User request: section comments for maintainers.
 */
import { useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, FileBarChart, LayoutDashboard, LogOut, Menu, Package, ScrollText, Search, Settings, Truck, UserCog, Users } from "lucide-react";
import { messages } from "../messages";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

/** Hamburger ↔ X glyph for the collapse control. */
function CollapseGlyph({ close }: { close: boolean }) {
  const bar = "nav-toggle-bar absolute left-0 top-1/2 h-[1.5px] w-full rounded-full bg-current";
  return (
    <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
      <span className={bar} style={{ transform: close ? "translateY(-50%) rotate(45deg)" : "translateY(calc(-50% - 5px))" }} />
      <span className={bar} style={{ transform: "translateY(-50%)", opacity: close ? 0 : 1 }} />
      <span className={bar} style={{ transform: close ? "translateY(-50%) rotate(-45deg)" : "translateY(calc(-50% + 5px))" }} />
    </span>
  );
}

// Primary nav: permission keys must match backend ROLE_PERMISSIONS.
const links: { to: string; label: string; permission: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { to: "/", label: messages.dashboard, permission: "dashboard.view", icon: LayoutDashboard },
  { to: "/clients", label: messages.clients, permission: "clients.view", icon: Users },
  { to: "/suppliers", label: messages.suppliers, permission: "suppliers.view", icon: Truck },
  { to: "/products", label: messages.products, permission: "products.view", icon: Package },
  { to: "/transactions", label: messages.transactions, permission: "transactions.view", icon: ArrowLeftRight },
  { to: "/reports", label: messages.reports, permission: "reports.operational", icon: FileBarChart },
  { to: "/users", label: messages.users, permission: "users.manage", icon: UserCog },
  { to: "/audit", label: messages.audit, permission: "audit.view", icon: ScrollText },
  { to: "/settings", label: messages.settings, permission: "settings.manage", icon: Settings },
];

export function Shell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop icon rail
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ clients: { id: string; name: string }[]; suppliers: { id: string; name: string }[]; transactions: { id: string; transactionCode: string }[] } | null>(null);
  const showLabels = open || !collapsed;

  async function onSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) { setResults(null); return; }
    const response = await api<typeof results>("/api/search?q=" + encodeURIComponent(value));
    setResults(response.data);
  }

  return (
    <div className="min-h-dvh">
      <a className="skip-link" href="#content">Skip to content</a>
      {/* Fixed sidebar: width animation stays smooth even when dashboard charts reflow */}
      <aside className={`${open ? "fixed inset-y-0 left-0 z-30 flex w-60" : "hidden"} sidebar-width md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:h-dvh ${collapsed && !open ? "md:w-[4.5rem]" : "md:w-60"} h-dvh flex-col overflow-hidden bg-emerald-700 text-white`}>
        <div className="flex h-full w-60 shrink-0 flex-col py-5">
          <div className="mb-6 px-3">
            <div className="flex h-8 items-center pr-14">
              <p className={`sidebar-label truncate text-2xl font-medium leading-none text-white ${showLabels ? "opacity-100 delay-100" : "opacity-0 delay-0"}`}>{messages.appName}</p>
            </div>
            <div className={`sidebar-fold grid ${showLabels ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 overflow-hidden">
                <p className="pt-1 text-xs tracking-[0.14em] text-emerald-100 uppercase">Kampala</p>
              </div>
            </div>
          </div>
          <nav className="space-y-1 px-3" aria-label="Primary">
            {links.filter((link) => auth.can(link.permission)).map((link) => {
              const Icon = link.icon;
              return (
                <NavLink key={link.to} to={link.to} end={link.to === "/"} title={link.label} aria-label={link.label} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center overflow-hidden rounded-md text-sm text-white ${isActive ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}>
                  <span className="grid h-10 w-12 shrink-0 place-items-center">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className={`sidebar-label whitespace-nowrap ${showLabels ? "opacity-100 delay-75" : "opacity-0 delay-0"}`}>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="absolute top-5 right-5 z-10">
          <button type="button" className="nav-toggle grid h-8 w-8 place-items-center rounded-md text-white hover:bg-white/10" aria-label={open ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={open ? true : !collapsed} onClick={() => { if (open) setOpen(false); else setCollapsed((value) => !value); }}>
            <CollapseGlyph close={showLabels} />
          </button>
        </div>
      </aside>

      <div className={`sidebar-offset min-w-0 ${collapsed ? "md:pl-[4.5rem]" : "md:pl-60"}`}>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/80 bg-[#f6f4ef]/90 px-4 py-3 backdrop-blur-md md:px-8">
          <button className="rounded-md border border-slate-300 px-2 py-2 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} strokeWidth={1.75} /></button>
          <div className="relative w-full max-w-xl">
            <Search className="absolute top-2.5 left-3 text-slate-400" size={16} strokeWidth={1.75} />
            <input aria-label={messages.search} className="w-full rounded-md border border-slate-300 bg-white/80 py-2 pr-3 pl-9" placeholder="Search code, name, or reference" value={query} onChange={(event) => void onSearch(event.target.value)} />
            {results && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-[#fffcf8] p-2 text-sm">
                {results.clients.map((item) => <button key={item.id} className="block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => { setResults(null); navigate(`/clients/${item.id}`); }}>{item.name}</button>)}
                {results.suppliers.map((item) => <button key={item.id} className="block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => { setResults(null); navigate(`/suppliers/${item.id}`); }}>{item.name}</button>)}
                {results.transactions.map((item) => <button key={item.id} className="block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => { setResults(null); navigate("/transactions"); }}>{item.transactionCode}</button>)}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{auth.user?.fullName}</span>
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={() => void auth.logout()}><LogOut size={16} strokeWidth={1.75} />{messages.logout}</button>
          </div>
        </header>
        <main id="content" className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  const trail = parts.length ? parts.map((part) => part.replaceAll("-", " ")) : ["dashboard"];
  return <p className="mb-4 text-sm text-slate-500">{trail.join(" / ")}</p>;
}
