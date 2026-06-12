// app/petugas/kembali/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue } from "@/helpers/format";
import type { Barang, Transaksi } from "@/types";

type Mode = "scan" | "list";

export default function KembaliPage() {
  const [mode, setMode]           = useState<Mode>("scan");
  const [kodeInput, setKodeInput] = useState("");
  const [looking,   setLooking]   = useState(false);
  const [lookErr,   setLookErr]   = useState("");
  const [preview,   setPreview]   = useState<{ barang: Barang; transaksi: Transaksi } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Daftar semua aktif (mode list)
  const [list, setList] = useState<Transaksi[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadList = () =>
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF")
      .then(setList)
      .catch(console.error);

  useEffect(() => {
    if (mode === "list") loadList();
    else inputRef.current?.focus();
  }, [mode]);

  // ── Lookup barang by kode lalu cari transaksi aktifnya ───────────────────
  async function lookupScan(kode: string) {
    const k = kode.trim();
    if (!k) return;
    setLooking(true);
    setLookErr("");
    setPreview(null);
    try {
      // 1. Lookup barang
      const barang = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(k)}`);
      if (barang.status !== "DIPINJAM") {
        setLookErr(`Barang ini berstatus "${barang.status}" — tidak perlu dikembalikan.`);
        return;
      }
      // 2. Cari transaksi AKTIF barang ini
      const transaksiList = await api.get<Transaksi[]>(`/api/transaksi?status=AKTIF`);
      const transaksi = transaksiList.find(t => t.barangId === barang.id);
      if (!transaksi) {
        setLookErr("Transaksi aktif untuk barang ini tidak ditemukan.");
        return;
      }
      setPreview({ barang, transaksi });
      setModalOpen(true);
    } catch (e: unknown) {
      setLookErr(e instanceof Error ? e.message : "Barang tidak ditemukan");
    } finally {
      setLooking(false);
    }
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookupScan(kodeInput);
  }

  // ── Konfirmasi kembali ────────────────────────────────────────────────────
  async function handleKembali(id: string) {
    setProcessing(id);
    try {
      await api.post(`/api/transaksi/${id}/kembali`, {});
      toast.success("Barang berhasil dikembalikan!");
      setModalOpen(false);
      setPreview(null);
      setKodeInput("");
      if (mode === "list") loadList();
      else inputRef.current?.focus();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
    } finally {
      setProcessing(null);
    }
  }

  const terlambat = list.filter(t => isOverdue(t.deadlineKembali));

  return (
    <>
      <PageHeader title="Kembalikan Barang" sub="Scan QR Code atau cari dari daftar peminjaman aktif" />

      {/* ── Mode switcher ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["scan", "list"] as Mode[]).map(m => (
          <button
            key={m}
            className={`btn btn-sm ${mode === m ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode(m)}
          >
            <i className={`ti ${m === "scan" ? "ti-qrcode" : "ti-list"}`} />
            {m === "scan" ? "Scan QR" : "Lihat Daftar"}
          </button>
        ))}
      </div>

      {/* ── MODE: SCAN ── */}
      {mode === "scan" && (
        <div style={{ maxWidth: 520 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18, margin: "0 auto 12px",
                background: "rgba(65,90,119,0.4)", border: "1px solid var(--glass-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="ti ti-arrow-bar-to-up" style={{ fontSize: 34, color: "var(--ds-mist)" }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                Scan QR untuk Pengembalian
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Setelah scan, konfirmasi pengembalian — data otomatis terupdate
              </div>
            </div>

            <form onSubmit={handleScanSubmit}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Kode Barang</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={inputRef}
                    className="input"
                    placeholder="Scan QR atau ketik kode…"
                    value={kodeInput}
                    onChange={e => { setKodeInput(e.target.value); setLookErr(""); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupScan(kodeInput); } }}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={looking || !kodeInput.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {looking
                      ? <div className="spinner" style={{ width: 14, height: 14 }} />
                      : <i className="ti ti-search" style={{ fontSize: 16 }} />
                    }
                  </button>
                </div>
              </div>
            </form>

            {lookErr && (
              <div className="alert alert-danger" style={{ marginTop: 8 }}>
                <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
                {lookErr}
              </div>
            )}

            {!preview && !lookErr && !looking && (
              <div style={{ textAlign: "center", padding: "16px 0 4px", color: "var(--text-muted)", fontSize: 12 }}>
                Menunggu scan…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODE: LIST ── */}
      {mode === "list" && (
        <>
          {terlambat.length > 0 && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
              <strong>{terlambat.length} barang</strong>&nbsp;sudah melewati deadline pengembalian!
            </div>
          )}

          <div className="glass">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Barang</th>
                    <th style={{ width: "18%" }}>Peminjam</th>
                    <th style={{ width: "18%" }}>Ruangan</th>
                    <th style={{ width: "14%" }}>Tgl Pinjam</th>
                    <th style={{ width: "14%" }}>Deadline</th>
                    <th style={{ width: "14%" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <i className="ti ti-circle-check" style={{ fontSize: 32, color: "var(--color-ok)" }} />
                          Tidak ada barang yang sedang dipinjam
                        </div>
                      </td>
                    </tr>
                  ) : list.map(t => {
                    const late = isOverdue(t.deadlineKembali);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
                        </td>
                        <td>
                          <div style={{ color: "var(--text-primary)", fontSize: 13 }}>{t.namaPeminjam}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.user.name ?? t.user.email}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{t.ruanganPinjam}</td>
                        <td style={{ fontSize: 12 }}>{fDateShort(t.tanggalPinjam)}</td>
                        <td>
                          <span style={{
                            fontSize: 12,
                            color: late ? "var(--color-err)" : "inherit",
                            fontWeight: late ? 600 : 400,
                          }}>
                            {fDateShort(t.deadlineKembali)}{late && " ⚠"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${late ? "btn-danger" : "btn-success"}`}
                            onClick={() => { setPreview({ barang: t.barang, transaksi: t }); setModalOpen(true); }}
                            disabled={processing === t.id}
                          >
                            <i className="ti ti-arrow-bar-to-up" />
                            Kembalikan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal konfirmasi pengembalian ── */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPreview(null); if (mode === "scan") setKodeInput(""); }}
        title="Konfirmasi Pengembalian"
        maxWidth={440}
      >
        {preview && (
          <>
            {/* Detail barang */}
            <div style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 16,
              background: "rgba(65,90,119,0.25)", border: "1px solid var(--glass-border)",
            }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                {preview.barang.nama}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { label: "Kode",      value: preview.barang.kodeBarang },
                  { label: "Peminjam",  value: preview.transaksi.namaPeminjam },
                  { label: "Ruangan",   value: preview.transaksi.ruanganPinjam },
                  { label: "Dipinjam",  value: fDateShort(preview.transaksi.tanggalPinjam) },
                  { label: "Deadline",  value: fDateShort(preview.transaksi.deadlineKembali) },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted)", width: 70, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ color: "var(--text-secondary)", fontFamily: row.label === "Kode" ? "monospace" : undefined }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isOverdue(preview.transaksi.deadlineKembali) && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
                Barang ini sudah melewati deadline pengembalian!
              </div>
            )}

            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Konfirmasi bahwa barang telah dikembalikan. Status akan otomatis berubah menjadi <strong>Tersedia</strong>.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setModalOpen(false); setPreview(null); if (mode === "scan") setKodeInput(""); }}
              >
                Batal
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleKembali(preview.transaksi.id)}
                disabled={!!processing}
              >
                {processing
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</>
                  : <><i className="ti ti-circle-check" />Konfirmasi Kembali</>
                }
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}