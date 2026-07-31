// components/features/barang/BarangDetailModal.tsx
// READ-ONLY shared component — no mutation actions.
// Renders Barang details + all linked Nota/SPB/Kwitansi evidence.
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { Barang, Pengeluaran } from "@/types";

interface Props {
  /** The Barang object to show, or null to close. */
  barang: Barang | null;
  onClose: () => void;
}

export default function BarangDetailModal({ barang, onClose }: Props) {
  const [detail, setDetail] = useState<Barang | null>(null);
  const [invoices, setInvoices] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!barang) {
      setDetail(null);
      setInvoices([]);
      return;
    }
    // Seed with what the caller already has (shows immediately)
    setDetail(barang);
    setInvoices([]);
    setLoading(true);
    api.get<{ barang: Barang; pengeluaran: Pengeluaran | null; pengeluarans: Pengeluaran[] }>(
      `/api/barang/${barang.id}/invoice`
    )
      .then(res => {
        setDetail(res.barang);
        const inv = res.pengeluarans?.length > 0
          ? res.pengeluarans
          : res.pengeluaran ? [res.pengeluaran] : [];
        setInvoices(inv);
      })
      .catch(() => { /* detail without invoice is acceptable */ })
      .finally(() => setLoading(false));
  }, [barang?.id]);

  const title = detail
    ? `Detail: ${detail.namaBarang || detail.kategori?.nama || "Barang"}`
    : "Detail Barang";

  return (
    <Modal open={!!barang} onClose={onClose} title={title}>
      {loading && !detail ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Mengambil data…</span>
        </div>
      ) : detail ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Kondisi alert banner */}
          {detail.kondisi !== "BAIK" && (
            <div style={{
              padding: "10px 16px", borderRadius: 8,
              background: detail.kondisi === "RUSAK_BERAT"
                ? "rgba(220,38,38,0.12)" : "rgba(234,179,8,0.10)",
              border: `1px solid ${detail.kondisi === "RUSAK_BERAT" ? "var(--color-err, #dc2626)" : "var(--color-warn, #eab308)"}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <i
                className={`ti ${detail.kondisi === "RUSAK_BERAT" ? "ti-alert-circle" : "ti-alert-triangle"}`}
                style={{ fontSize: 18, color: detail.kondisi === "RUSAK_BERAT" ? "var(--color-err, #dc2626)" : "var(--color-warn, #eab308)" }}
              />
              <div>
                <div style={{
                  fontWeight: 600, fontSize: 13,
                  color: detail.kondisi === "RUSAK_BERAT" ? "var(--color-err, #dc2626)" : "var(--color-warn, #eab308)",
                }}>
                  {detail.kondisi === "RUSAK_BERAT" ? "Rusak Berat" : "Rusak Ringan"}
                </div>
                {detail.keterangan && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {detail.keterangan}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detail grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Nama Barang",    value: detail.namaBarang },
              { label: "Kategori",       value: detail.kategori?.nama },
              { label: "Label",          value: detail.label },
              { label: "Label Aset",     value: detail.labelAset },
              { label: "Kondisi",        value: detail.kondisi?.replace(/_/g, " ") },
              { label: "Status",         value: detail.status },
              { label: "Merek",          value: detail.merek },
              { label: "Model",          value: detail.model },
              { label: "Tipe",           value: detail.tipe },
              { label: "SN",             value: detail.sn },
              { label: "Vendor",         value: detail.vendor },
              { label: "Progdi",         value: detail.progdi },
              { label: "Ruangan",        value: detail.ruangan ? `${detail.ruangan.nama} (${detail.ruangan.kode})` : null },
              { label: "Jumlah",         value: String(detail.jumlah) },
              { label: "Harga",          value: detail.harga ? `Rp ${detail.harga.toLocaleString("id-ID")}` : null },
              { label: "Pembelian Ke",   value: detail.pembelianKe ? String(detail.pembelianKe) : null },
              { label: "Tanggal Datang", value: detail.tanggalDatang ? fDateShort(detail.tanggalDatang) : null },
              { label: "Sumber/Tahun",   value: detail.sumberTahun },
            ].filter(r => r.value).map(r => (
              <div key={r.label}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>{r.label}</span>
                <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {detail.keterangan && detail.kondisi === "BAIK" && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Keterangan</span>
              <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{detail.keterangan}</span>
            </div>
          )}

          {/* ── Evidence / Nota / SPB / Kwitansi ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <i className="ti ti-receipt" style={{ fontSize: 18, color: "var(--color-info, #3b82f6)" }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Bukti Pembayaran</span>
              {loading && <div className="spinner spinner-sm" style={{ width: 14, height: 14 }} />}
              {!loading && invoices.length > 0 && (
                <span className="badge badge-info" style={{ fontSize: 11 }}>{invoices.length} dokumen</span>
              )}
            </div>

            {invoices.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {invoices.map((inv, evIdx) => {
                  const fullCode = [inv.jenisBukti, inv.nomorBukti, inv.kodePembelian]
                    .filter(Boolean).join("-");
                  return (
                    <div key={inv.id} style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      {/* Evidence header */}
                      <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {inv.jenisBukti && (
                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Jenis Bukti</span>
                            <span className="badge badge-info" style={{ fontSize: 11 }}>{inv.jenisBukti}</span>
                          </div>
                        )}
                        {inv.nomorBukti && (
                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Nomor Bukti</span>
                            <span style={{ fontWeight: 500, fontSize: 12, color: "var(--text-primary)" }}>{inv.nomorBukti}</span>
                          </div>
                        )}
                        {fullCode && (
                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Kode Lengkap</span>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-primary)" }}>{fullCode}</span>
                          </div>
                        )}
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Nominal</span>
                          <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>
                            Rp {inv.nominal.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Tanggal</span>
                          <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{fDateShort(inv.tanggal)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block" }}>Judul</span>
                          <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{inv.judul}</span>
                        </div>
                      </div>

                      {/* File attachments — horizontal scroll when > 1 */}
                      {inv.notaUrls && inv.notaUrls.length > 0 && (
                        <div style={{
                          overflowX: inv.notaUrls.length > 1 ? "auto" : "visible",
                          display: "flex", gap: 12, padding: 12,
                          scrollbarWidth: "thin",
                        }}>
                          {inv.notaUrls.map((url, fIdx) => {
                            let fileType: "image" | "pdf" | "other" = "other";
                            if (url.startsWith("data:image/")) fileType = "image";
                            else if (url.startsWith("data:application/pdf")) fileType = "pdf";
                            else {
                              const ext = url.split(".").pop()?.toLowerCase() ?? "";
                              if (["jpg","jpeg","png","gif","webp"].includes(ext)) fileType = "image";
                              else if (ext === "pdf") fileType = "pdf";
                            }
                            const minW = inv.notaUrls.length > 1 ? 280 : "100%";
                            return (
                              <div
                                key={fIdx}
                                style={{
                                  minWidth: minW,
                                  flex: inv.notaUrls.length > 1 ? "0 0 280px" : "1",
                                  borderRadius: 8, overflow: "hidden",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                }}
                              >
                                {fileType === "image" ? (
                                  <img
                                    src={url}
                                    alt={`Bukti ${evIdx + 1}-${fIdx + 1}`}
                                    style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block", background: "rgba(255,255,255,0.03)" }}
                                  />
                                ) : fileType === "pdf" ? (
                                  <>
                                    <iframe
                                      src={url}
                                      title={`PDF ${evIdx + 1}-${fIdx + 1}`}
                                      style={{ width: "100%", height: 320, border: "none" }}
                                    />
                                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                                      <a href={url} download={`nota-${evIdx + 1}-${fIdx + 1}.pdf`} className="btn btn-ghost btn-sm">
                                        <i className="ti ti-download" /> Unduh PDF
                                      </a>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ textAlign: "center", padding: 24, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                                    <a href={url} download className="btn btn-primary" target="_blank" rel="noopener">
                                      <i className="ti ti-download" /> Unduh File {fIdx + 1}
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !loading ? (
              <div style={{
                textAlign: "center", padding: 20,
                color: "var(--text-muted)", fontSize: 13,
                background: "rgba(255,255,255,0.02)", borderRadius: 8,
              }}>
                <i className="ti ti-file-off" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                Tidak ada bukti pembayaran yang terhubung dengan aset ini.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
