export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizePhone(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function duplicateWarnings(
  candidate: { name: string; phone?: string | null; email?: string | null },
  existing: {
    name: string;
    phone?: string | null;
    email?: string | null;
    code: string;
  }[],
): string[] {
  const name = normalizeName(candidate.name);
  const phone = normalizePhone(candidate.phone);
  const email = candidate.email?.trim().toLowerCase();
  const warnings: string[] = [];
  for (const row of existing) {
    const sameEmail =
      Boolean(email) && row.email?.trim().toLowerCase() === email;
    const samePhone = phone.length >= 7 && normalizePhone(row.phone) === phone;
    const sameName = normalizeName(row.name) === name;
    if (sameEmail || samePhone || sameName) {
      warnings.push(`Possible duplicate found: ${row.code} ${row.name}.`);
    }
  }
  return [...new Set(warnings)];
}
