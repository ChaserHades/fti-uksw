/**
 * Centralized utility for handling Purchase Group and Evidence Codes.
 */

/**
 * Builds a purchase group general code.
 * Example: buildPurchaseCode(new Date("2026-07-26"), 1) -> "072026-001"
 */
export function buildPurchaseCode(date: Date | string, pembelianKe: number): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const nnn = String(pembelianKe).padStart(3, "0");
  return `${mm}${yyyy}-${nnn}`;
}

/**
 * Builds a full evidence code for display/UI.
 * Example: buildEvidenceDisplayCode("SPB", "03/290-12", "072026-001") -> "SPB-03/290-12-072026-001"
 */
export function buildEvidenceDisplayCode(
  jenisBukti: string | null | undefined,
  nomorBukti: string | null | undefined,
  purchaseCode: string | null | undefined
): string {
  const parts = [];
  if (jenisBukti?.trim()) parts.push(jenisBukti.trim().toUpperCase());
  if (nomorBukti?.trim()) parts.push(nomorBukti.trim());
  if (purchaseCode?.trim()) parts.push(purchaseCode.trim());
  
  // Jika tidak ada data yang bisa dibentuk, kembalikan string kosong atau fallback
  if (parts.length === 0) return "UNKNOWN-EVIDENCE";
  
  return parts.join("-");
}

/**
 * Mengekstrak kode Purchase Group dari label aset.
 * Mendukung format lama (LAP-APP-072026-001) dan format baru (LAP-APP-072026-001-002).
 * Selalu mengambil MMYYYY-NNN (bukan asset-sequence suffix).
 * Contoh:
 *   LAP-APP-072026-001     → 072026-001
 *   LAP-APP-072026-001-002 → 072026-001
 */
export function extractPurchaseCodeFromAssetLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const parts = label.split("-");
  // Cari indeks bagian MMYYYY (6 digit angka)
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = `${parts[i - 1]}-${parts[i]}`;
    if (candidate.match(/^\d{6}-\d{3}$/)) {
      return candidate;
    }
  }
  return null;
}
