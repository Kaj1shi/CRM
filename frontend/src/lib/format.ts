/**
 * Display helpers for Kampala dates and kilogram/tonne weights.
 * Used by Dashboard, Parties, Transactions, Admin tables.
 */
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function kampalaParts(value: string, withTime: boolean) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } : {}),
    timeZone: "Africa/Kampala",
  }).formatToParts(new Date(value));
}

/** Format as "28 Sep 2026" in Africa/Kampala (fixed month list avoids ICU "Sept"). */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const parts = kampalaParts(value, false);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${day} ${months[month - 1]} ${year}`;
}

/** Format as "28 Sep 2026, 21:45:03" in Africa/Kampala (for audit logs). */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parts = kampalaParts(value, true);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const second = parts.find((part) => part.type === "second")?.value ?? "00";
  return `${day} ${months[month - 1]} ${year}, ${hour}:${minute}:${second}`;
}

/** Server stores kg; show tonnes when value ≥ 1000. */
export function formatKg(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${Math.round((value / 1000) * 1000) / 1000} tonnes`;
  return `${value} kg`;
}
