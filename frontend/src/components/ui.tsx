/**
 * Shared UI primitives for list pages and forms.
 * Prefer these over one-off markup so tables/modals stay consistent.
 * Styles for `.data-panel` / `.data-table` live in index.css.
 */
import { cloneElement, isValidElement, useEffect, useId, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";

// --- Page chrome & buttons ---
export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><h1 className="text-4xl font-medium tracking-tight">{title}</h1>{action}</div>;
}
export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-md bg-emerald-600 px-3.5 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60 ${props.className ?? ""}`} />;
}
export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-md border border-slate-300 bg-[#fffcf8] px-3.5 py-2 text-sm hover:bg-slate-50 ${props.className ?? ""}`} />;
}

/** Label + control with linked htmlFor (avoids wrapping selects so Playwright labels stay clean). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children;
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-medium text-slate-700">{label}</label>
      <div className="mt-1">{control}</div>
    </div>
  );
}
export const inputClass = "w-full rounded-md border border-slate-300 bg-[#fffcf8] px-3 py-2";

// --- Status / category pills (keys match Prisma enums and report field values) ---
const tones: Record<string, string> = {
  ACTIVE: "bg-[#e8f7ef] text-[#0f6b45]",
  RECORDED: "bg-[#e8f7ef] text-[#0f6b45]",
  INACTIVE: "bg-[#f1efeb] text-[#5c574f]",
  REVERSED: "bg-[#fdebec] text-[#9f2f2d]",
  DORMANT: "bg-[#fff1e0] text-[#9a5b12]",
  AT_RISK: "bg-[#fff1e0] text-[#9a5b12]",
  WEEKLY: "bg-[#e8f1fe] text-[#1d4f91]",
  BIWEEKLY: "bg-[#efe8ff] text-[#5b3d9a]",
  MONTHLY: "bg-[#e7f6f2] text-[#0f6b5c]",
  MULTIPLE_PER_WEEK: "bg-[#efe8ff] text-[#5b3d9a]",
  IRREGULAR: "bg-[#f1efeb] text-[#5c574f]",
  INSUFFICIENT_DATA: "bg-[#f1efeb] text-[#5c574f]",
  CLIENT_PURCHASE: "bg-[#e8f7ef] text-[#0f6b45]",
  SUPPLIER_SUPPLY: "bg-[#e8f1fe] text-[#1d4f91]",
  FINISHED_PRODUCT: "bg-[#e7f6f2] text-[#0f6b5c]",
  RAW_MATERIAL: "bg-[#fff1e0] text-[#9a5b12]",
  OTHER: "bg-[#f1efeb] text-[#5c574f]",
  ADMIN: "bg-[#efe8ff] text-[#5b3d9a]",
  MANAGER: "bg-[#e8f1fe] text-[#1d4f91]",
  STAFF: "bg-[#f1efeb] text-[#5c574f]",
};

export function StatusText({ value }: { value: string }) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium capitalize ${tones[value] ?? "bg-[#e8f1fe] text-[#1d4f91]"}`}>{label}</span>;
}

const avatarTones = ["bg-[#dbeafe] text-[#1d4f91]", "bg-[#dcfce7] text-[#0f6b45]", "bg-[#fae8ff] text-[#5b3d9a]", "bg-[#ffedd5] text-[#9a5b12]", "bg-[#e0e7ff] text-[#3730a3]", "bg-[#ccfbf1] text-[#0f766e]"];

/** Name cell with stable-color initials avatar (used in data tables). */
export function EntityCell({ name, detail }: { name: string; detail?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
  const tone = avatarTones[Math.abs([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % avatarTones.length];
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-semibold ${tone}`}>{initials}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-slate-800">{name}</span>
        {detail ? <span className="block truncate text-xs text-slate-500">{detail}</span> : null}
      </span>
    </span>
  );
}

// --- Data tables (panel chrome + header/body layout) ---
export function DataPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="data-panel">
      {title ? <div className="data-panel__title">{title}</div> : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table className="data-table">
      <thead>
        <tr>{headers.map((heading) => <th key={heading}>{heading}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm" role="status">{children}</p>;
}
export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-700" role="alert">{children}</p>;
}

/** Modal overlay for create forms (clients, suppliers, products, transactions, users). */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-[#2c2825]/45 backdrop-blur-[2px]" aria-label="Close dialog" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative z-10 max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-[#fffcf8] p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="text-xl font-medium tracking-tight text-slate-900">{title}</h2>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close" onClick={onClose}>
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
