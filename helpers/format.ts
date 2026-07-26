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

export function fDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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
  const d = new Date(deadline);
  const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
  return new Date() > targetTime;
}

export function isDueSoon(deadline: string | Date): boolean {
  const d = new Date(deadline);
  const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
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

/** Parse QR payload (handles JSON {id,kode,nama} or plain kode string) */
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

export function terbilang(angka: number): string {
  const words = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
  ];

  if (angka < 0) return "Minus " + terbilang(Math.abs(angka));
  if (angka === 0) return "Nol";
  
  if (angka < 12) return words[angka];
  if (angka < 20) return terbilang(angka - 10) + " Belas";
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + " Puluh" + (angka % 10 !== 0 ? " " + terbilang(angka % 10) : "");
  if (angka < 200) return "Seratus" + (angka - 100 !== 0 ? " " + terbilang(angka - 100) : "");
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " Ratus" + (angka % 100 !== 0 ? " " + terbilang(angka % 100) : "");
  if (angka < 2000) return "Seribu" + (angka - 1000 !== 0 ? " " + terbilang(angka - 1000) : "");
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " Ribu" + (angka % 1000 !== 0 ? " " + terbilang(angka % 1000) : "");
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + " Juta" + (angka % 1000000 !== 0 ? " " + terbilang(angka % 1000000) : "");
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + " Miliar" + (angka % 1000000000 !== 0 ? " " + terbilang(angka % 1000000000) : "");
  if (angka < 1000000000000000) return terbilang(Math.floor(angka / 1000000000000)) + " Triliun" + (angka % 1000000000000 !== 0 ? " " + terbilang(angka % 1000000000000) : "");

  return "";
}
