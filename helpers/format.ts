// helpers/format.ts

export function fDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function isOverdue(deadline: string | Date): boolean {
  const str = deadline instanceof Date ? deadline.toISOString() : deadline;
  const dateOnly = str.split("T")[0]; 
  const targetTime = new Date(`${dateOnly}T18:00:00+07:00`);
  return new Date() > targetTime;
}

export function isDueSoon(deadline: string | Date): boolean {
  const str = deadline instanceof Date ? deadline.toISOString() : deadline;
  const dateOnly = str.split("T")[0];
  const targetTime = new Date(`${dateOnly}T18:00:00+07:00`);
  const diff = targetTime.getTime() - Date.now();
  return diff > 0 && diff <= 86_400_000;
}

export function initials(name?: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Parse QR payload — handles JSON {id,kode,nama} or plain kode string */
export function parseQrPayload(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    // Prefer kode (the unique identifier used in DB)
    if (parsed?.kode && typeof parsed.kode === "string") return parsed.kode;
    // Fallback to id
    if (parsed?.id && typeof parsed.id === "string") return parsed.id;
  } catch { /* plain string */ }
  return trimmed;
}
