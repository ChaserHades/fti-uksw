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
 * Extracts the purchase group code from an asset label.
 * Example: extractPurchaseCodeFromAssetLabel("LAP-MAC-072026-001") -> "072026-001"
 */
export function extractPurchaseCodeFromAssetLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const parts = label.split("-");
  if (parts.length >= 2) {
    const suffix = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
    if (suffix.match(/^\d{6}-\d{3}$/)) {
      return suffix;
    }
  }
  return null;
}
