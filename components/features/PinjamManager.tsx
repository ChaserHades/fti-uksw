// components/features/PinjamManager.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon, parseQrPayload } from "@/helpers/format";
import { useQrScanner } from "@/hooks/useQrScanner";
import type { Barang, Peminjaman } from "@/types";

type Mode = "scan" | "list";

export default function AdminPinjamPage({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  // ── State ──
  const [mode, setMode]                 = useState<Mode>("list");
  const [modalScanner, setModalScanner] = useState(false);
  const [allAktif, setAllAktif]     = useState<Peminjaman[]>([]);
  const [barang, setBarang]         = useState<Barang | null>(null);
  const [peminjamanAktif, setPeminjamanAktif] = useState<Peminjaman | null>(null);
  const [lookErr,   setLookErr]   = useState("");
  const [manualInput, setManualInput] = useState("");

  const [search, setSearch]     = useState("");
  const [cursor, setCursor]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // QR Scanner hook
  const { videoRef, canvasRef, scanning, startCamera: rawStartCamera, stopCamera } = useQrScanner(handleScanResult);

  // Modal state
  const [modalPinjam,  setModalPinjam]  = useState(false);
  const [modalKembali, setModalKembali] = useState(false);
  const [form, setForm] = useState({ namaPeminjam: "", ruanganTujuan: "", deadlineKembali: "", catatan: "" });
  const [saving, setSaving]       = useState(false);
  const [processing, setProcessing] = useState(false);

  // ── Load aktif ──
  const loadAktif = useCallback((reset = true) => {
    const cur = reset ? null : cursor;
    const params = new URLSearchParams();
    params.set("status", "AKTIF");
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (cur) params.set("cursor", cur);

    if (!reset) setLoadingMore(true);
    api.get<{ data: Peminjaman[]; nextCursor: string | null }>(`/api/peminjaman?${params}`)
      .then(res => {
        if (reset) setAllAktif(res.data);
        else setAllAktif(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, cursor]);

  useEffect(() => { 
    loadAktif(true); 
    const action = searchParams.get("action");
    if (action === "scan") setModalScanner(true);
    else if (action === "list") setMode("list");
  }, [searchParams, search]);

  // ── Camera wrapper ──
  async function startCamera() {
    setBarang(null); setPeminjamanAktif(null);
    try { await rawStartCamera(); }
    catch { toast.error("Tidak dapat mengakses kamera"); }
  }

  async function processBarang(data: Barang) {
    setBarang(data);
    if (data.status === "TERSEDIA") {
      setForm({ namaPeminjam: "", ruanganTujuan: "", deadlineKembali: "", catatan: "" });
      setModalScanner(false);
      stopCamera();
      setModalPinjam(true);
    } else if (data.status === "DIPINJAM") {
      const res = await api.get<{ data: Peminjaman[]; nextCursor: string | null }>("/api/peminjaman?status=AKTIF");
      const trxList = res.data;
      const found = trxList.find(t => t.barangId === data.id);
      if (found) {
        setPeminjamanAktif(found);
        setModalScanner(false);
        stopCamera();
        setModalKembali(true);
      } else {
        setLookErr(`Barang "${data.kategori?.nama}" berstatus DIPINJAM tapi peminjaman tidak ditemukan`);
      }
    } else {
      setLookErr(`Barang "${data.kategori?.nama}" berstatus ${data.status} dan tidak dapat diproses.`);
    }
  }

  async function handleScanResult(raw: string) {
    const kode = parseQrPayload(raw);
    setLookErr(""); setBarang(null);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      await processBarang(data);
    } catch {
      try {
        const res = await api.get<{ data: Barang[]; nextCursor: string | null }>(`/api/barang?search=${encodeURIComponent(kode)}`);
        const listData = res.data;
        if (listData.length === 1) {
          await processBarang(listData[0]);
        } else if (listData.length > 1) {
          setLookErr(`Ditemukan ${listData.length} barang dengan kata kunci "${kode}". Harap ketik kata kunci lebih spesifik atau gunakan Kode Barang.`);
        } else {
          setLookErr(`Barang "${kode}" tidak ditemukan.`);
        }
      } catch {
        setLookErr(`Barang "${kode}" tidak ditemukan.`);
      }
    }
  }

  // ── Actions ──
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handlePinjam() {
    if (!barang) return;
    if (!form.namaPeminjam.trim()) { toast.error("Nama peminjam wajib diisi"); return; }
    if (!form.ruanganTujuan.trim()) { toast.error("Ruangan wajib diisi"); return; }
    if (!form.deadlineKembali) { toast.error("Deadline kembali wajib diisi"); return; }

    setSaving(true);
    try {
      await api.post("/api/peminjaman", {
        barangId: barang.id,
        namaPeminjam: form.namaPeminjam,
        ruanganTujuan: form.ruanganTujuan,
        deadlineKembali: form.deadlineKembali,
        catatan: form.catatan || null,
      });
      toast.success("Barang berhasil dipinjamkan!");
      setModalPinjam(false); setBarang(null);
      loadAktif();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pinjam");
    } finally { setSaving(false); }
  }

  async function handleKembali(trxId: string) {
    setProcessing(true);
    try {
      await api.post(`/api/peminjaman/${trxId}/kembali`, {});
      toast.success("Barang berhasil dikembalikan!");
      setModalKembali(false); setPeminjamanAktif(null); setBarang(null);
      loadAktif();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengembalian");
    } finally { setProcessing(false); }
  }

  const terlambat = allAktif.filter(t => isOverdue(t.deadlineKembali));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        {/* Mode switcher */}
        <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
              fontWeight: 600,
              color: "#FFF",
              background: "transparent",
              border: "none", borderBottom: "2px solid #FFF",
              whiteSpace: "nowrap", flexShrink: 0,
              marginBottom: "-1px"
            }}
          >
            <i className="ti ti-list" />Daftar Peminjaman Aktif
            {allAktif.length > 0 && (
              <span className="badge badge-info" style={{ marginLeft: "4px", padding: "2px 8px", fontSize: 11 }}>{allAktif.length}</span>
            )}
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={() => { setModalScanner(true); }}>
          <i className="ti ti-qrcode" /> Scan Peminjaman
        </button>
      </div>

      {/* Modal Scanner */}
      <Modal open={modalScanner} onClose={() => { setModalScanner(false); stopCamera(); }} title="Scan QR Code Barang">
        <div className="scan-heading" style={{ marginBottom: 14 }}>
          <div className="scan-sub">Scan QR atau input kode barang manual untuk memproses peminjaman/pengembalian.</div>
        </div>

        {lookErr && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <i className="ti ti-alert-triangle" /> {lookErr}
          </div>
        )}

        <div style={{
          position: "relative", width: "100%", aspectRatio: "3/2",
          borderRadius: 10, overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 16, transition: "border-color .3s",
        }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "scaleX(-1)" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-camera-off" style={{ fontSize: 28, color: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!scanning
            ? <button className="btn btn-primary" onClick={startCamera}><i className="ti ti-camera" />Buka Kamera</button>
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" />Stop Kamera</button>
          }
        </div>

        <div className="form-group" style={{ marginTop: 24, padding: "16px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <label className="form-label">Atau input manual (Kode / Kategori):</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              className="input" 
              placeholder="Ketik kode atau kategori barang..." 
              value={manualInput} 
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && manualInput.trim()) { stopCamera(); handleScanResult(manualInput.trim()); } }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => { if (manualInput.trim()) { stopCamera(); handleScanResult(manualInput.trim()); } }}>
              <i className="ti ti-search" />Cari
            </button>
          </div>
        </div>
      </Modal>

      {/* MODE: LIST AKTIF */}
      {mode === "list" && (
        <>
          {terlambat.length > 0 && (
            <div className="alert alert-danger mb-16">
              <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
              <strong>{terlambat.length} barang</strong>&nbsp;sudah melewati deadline pengembalian!
            </div>
          )}

          <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>
            <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
              <div className="search-wrap" style={{ flex: "1 1 300px", minWidth: 250, margin: 0 }}>
                <i className="ti ti-search search-icon" />
                <input
                  className="input"
                  placeholder="Cari peminjam atau barang..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Barang</th><th>Peminjam</th><th>Ruangan</th>
                    <th>Deadline</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allAktif.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <i className="ti ti-circle-check" style={{ fontSize: 28, color: "var(--color-ok)" }} />
                        Tidak ada peminjaman aktif
                      </div>
                    </td></tr>
                  ) : allAktif.map(t => {
                    const late = isOverdue(t.deadlineKembali);
                    const soon = !late && isDueSoon(t.deadlineKembali);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="td-name">{t.barang.kategori?.nama}</div>
                          <div className="td-code">{t.barang.label}</div>
                        </td>
                        <td className="td-sm">{t.namaPeminjam}</td>
                        <td className="td-sm">{t.ruanganTujuan}</td>
                        <td className="td-sm">{fDateShort(t.deadlineKembali)}</td>
                        <td>
                          <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}>
                            {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setBarang(t.barang);
                              setPeminjamanAktif(t);
                              setModalKembali(true);
                            }}
                          >
                            <i className="ti ti-circle-check" />Kembalikan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cursor && (
              <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button className="btn btn-ghost" onClick={() => loadAktif(false)} disabled={loadingMore}>
                  {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Pinjam */}
      <Modal open={modalPinjam} onClose={() => { setModalPinjam(false); setBarang(null); }} title="Form Peminjaman">
        {barang && (
          <>
            <div className="modal-preview-with-icon">
              <div className="qa-card-icon" style={{ width: 40, height: 40 }}>
                <i className="ti ti-box" style={{ fontSize: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="modal-preview-title">{barang.kategori?.nama}</div>
                <div className="td-code">{barang.label}</div>
              </div>
              <span className="badge badge-ok" style={{ flexShrink: 0 }}>Tersedia</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Peminjam *</label>
              <input className="input" placeholder="Nama mahasiswa/dosen/staf" value={form.namaPeminjam} onChange={e => setF("namaPeminjam", e.target.value)} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Ruangan Penggunaan *</label>
                <input className="input" placeholder="Lab 1 / R.101" value={form.ruanganTujuan} onChange={e => setF("ruanganTujuan", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline Kembali *</label>
                <input type="date" max="9999-12-31" className="input" value={form.deadlineKembali} onChange={e => setF("deadlineKembali", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <input className="input" placeholder="Keperluan / keterangan" value={form.catatan} onChange={e => setF("catatan", e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModalPinjam(false); setBarang(null); }}>Batal</button>
              <button className="btn btn-primary" onClick={handlePinjam} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-check" />Konfirmasi Pinjam</>}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Kembali */}
      <Modal open={modalKembali} onClose={() => { setModalKembali(false); setPeminjamanAktif(null); setBarang(null); }} title="Peringatan Status Barang">
        {barang && peminjamanAktif && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ 
              width: 72, height: 72, borderRadius: "50%", background: "rgba(255, 171, 0, 0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" 
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 36, color: "var(--color-warn)" }} />
            </div>
            
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Barang Masih Dipinjam!
            </h3>
            
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24, lineHeight: 1.5, padding: "0 16px" }}>
              Sistem mencatat bahwa <strong>{barang.kategori?.nama}</strong> ({barang.label || barang.labelAset}) saat ini masih dalam status peminjaman oleh <strong style={{ color: "var(--text-primary)" }}>{peminjamanAktif.namaPeminjam}</strong>.
            </p>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Tgl Pinjam</span>
                <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}>{fDateShort(peminjamanAktif.tanggalPinjam)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Batas Kembali</span>
                <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}>{fDateShort(peminjamanAktif.deadlineKembali)}</span>
              </div>
              {isOverdue(peminjamanAktif.deadlineKembali) && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", color: "var(--color-danger)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 16 }} /> Melewati batas waktu pengembalian!
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setModalKembali(false); setPeminjamanAktif(null); setBarang(null); }}>
                Tutup
              </button>
              <button className="btn btn-success" style={{ flex: 1.5 }} onClick={() => handleKembali(peminjamanAktif.id)} disabled={processing}>
                {processing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-check" /> Tandai Dikembalikan</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
