// app/admin/pinjam/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon, parseQrPayload } from "@/helpers/format";
import type { Barang, Transaksi } from "@/types";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

type Mode = "scan" | "list";

export default function AdminPinjamPage({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  
  // ── State ──
  const [mode, setMode]             = useState<Mode>("scan");
  const [allAktif, setAllAktif]     = useState<Transaksi[]>([]);
  const [barang, setBarang]         = useState<Barang | null>(null);
  const [transaksiAktif, setTransaksiAktif] = useState<Transaksi | null>(null);
  const [lookErr,   setLookErr]   = useState("");
  const [manualInput, setManualInput] = useState("");

  // Scan state
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const jsqrReady = useRef(false);
  const [scanning, setScanning] = useState(false);

  // Modal state
  const [modalPinjam,  setModalPinjam]  = useState(false);
  const [modalKembali, setModalKembali] = useState(false);
  const [form, setForm] = useState({ namaPeminjam: "", ruanganPinjam: "", deadlineKembali: "", catatan: "" });
  const [saving, setSaving]       = useState(false);
  const [processing, setProcessing] = useState(false);

  // ── Load aktif ──
  const loadAktif = () =>
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF").then(setAllAktif).catch(console.error);

  useEffect(() => { 
    loadAktif(); 
    if (searchParams.get("action") === "scan") setMode("scan");
  }, [searchParams]);

  // ── jsQR script ──
  useEffect(() => {
    if (document.getElementById("jsqr-script")) { jsqrReady.current = true; return; }
    const s = document.createElement("script");
    s.id = "jsqr-script";
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);
  useEffect(() => () => stopCamera(), []);

  // ── Camera ──
  async function startCamera() {
    setBarang(null); setTransaksiAktif(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream; await v.play();
      setScanning(true); scanLoop();
    } catch { toast.error("Tidak dapat mengakses kamera"); }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  function scanLoop() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!jsqrReady.current || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop); return;
    }
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (code?.data) { stopCamera(); handleScanResult(code.data); return; }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  async function processBarang(data: Barang) {
    setBarang(data);
    if (data.status === "TERSEDIA") {
      setForm({ namaPeminjam: "", ruanganPinjam: "", deadlineKembali: "", catatan: "" });
      setModalPinjam(true);
    } else if (data.status === "DIPINJAM") {
      const trxList = await api.get<Transaksi[]>("/api/transaksi?status=AKTIF");
      const found = trxList.find(t => t.barangId === data.id);
      if (found) {
        setTransaksiAktif(found);
        setModalKembali(true);
      } else {
        setLookErr(`Barang "${data.nama}" berstatus DIPINJAM tapi transaksi tidak ditemukan`);
      }
    } else {
      setLookErr(`Barang "${data.nama}" berstatus ${data.status} — tidak dapat diproses.`);
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
        const listData = await api.get<Barang[]>(`/api/barang?search=${encodeURIComponent(kode)}`);
        if (listData.length === 1) {
          await processBarang(listData[0]);
        } else if (listData.length > 1) {
          setLookErr(`Ditemukan ${listData.length} barang dengan kata kunci "${kode}". Harap ketik nama lebih spesifik atau gunakan Kode Barang.`);
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
    if (!form.ruanganPinjam.trim()) { toast.error("Ruangan wajib diisi"); return; }
    if (!form.deadlineKembali) { toast.error("Deadline kembali wajib diisi"); return; }

    setSaving(true);
    try {
      await api.post("/api/transaksi", {
        barangId: barang.id,
        namaPeminjam: form.namaPeminjam,
        ruanganPinjam: form.ruanganPinjam,
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
      await api.post(`/api/transaksi/${trxId}/kembali`, {});
      toast.success("Barang berhasil dikembalikan!");
      setModalKembali(false); setTransaksiAktif(null); setBarang(null);
      loadAktif();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengembalian");
    } finally { setProcessing(false); }
  }

  const terlambat = allAktif.filter(t => isOverdue(t.deadlineKembali));

  return (
    <>
      {/* Mode switcher */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {([
          { key: "scan" as Mode, icon: "ti-qrcode",  label: "Scan QR" },
          { key: "list" as Mode, icon: "ti-list",     label: "Daftar Aktif" },
        ]).map(t => {
          const active = mode === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FFF" : "var(--text-secondary)",
                background: "transparent",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer",
                marginBottom: "-1px"
              }}
            >
              <i className={`ti ${t.icon}`} style={{ opacity: active ? 1 : 0.6 }} />{t.label}
              {t.key === "list" && allAktif.length > 0 && (
                <span className="badge badge-info" style={{ marginLeft: "4px", padding: "2px 8px", fontSize: 11 }}>{allAktif.length}</span>
              )}
            </button>
          );
        })}

      </div>

      {/* MODE: SCAN */}
      {mode === "scan" && (
        <div className="scan-container">
          <div className="glass" style={{ padding: 24 }}>
            <div className="scan-heading">
              <div className="scan-title">Scan QR Code Barang</div>
              <div className="scan-sub">Tersedia → form pinjam &nbsp;·&nbsp; Dipinjam → langsung kembalikan</div>
            </div>

            {lookErr && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <i className="ti ti-alert-triangle" /> {lookErr}
              </div>
            )}

            <div style={{
              position: "relative", width: "100%", aspectRatio: "4/3",
              borderRadius: 12, overflow: "hidden", background: "#000",
              border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
              marginBottom: 16, transition: "border-color .3s",
            }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "none" }} />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {!scanning && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <i className="ti ti-camera-off" style={{ fontSize: 36, color: "var(--text-muted)" }} />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
                </div>
              )}
              {scanning && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: 180, height: 180, borderRadius: 10, border: "2px solid var(--color-ok)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {!scanning
                ? <button className="btn btn-primary" onClick={startCamera}><i className="ti ti-camera" />Buka Kamera</button>
                : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" />Stop Kamera</button>
              }
            </div>

            <div style={{ marginTop: 24, padding: "16px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Atau input manual (Kode / Nama):</div>
              <form style={{ display: "flex", gap: 8 }} onSubmit={e => {
                e.preventDefault();
                if (manualInput.trim()) {
                  stopCamera();
                  handleScanResult(manualInput.trim());
                }
              }}>
                <input 
                  className="input" 
                  placeholder="Ketik kode atau nama barang..." 
                  value={manualInput} 
                  onChange={e => setManualInput(e.target.value)} 
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary"><i className="ti ti-search" />Cari</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODE: LIST */}
      {mode === "list" && (
        <>
          {terlambat.length > 0 && (
            <div className="alert alert-danger mb-16">
              <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
              <strong>{terlambat.length} barang</strong>&nbsp;sudah melewati deadline pengembalian!
            </div>
          )}

          <div className="glass">
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
                          <div className="td-name">{t.barang.nama}</div>
                          <div className="td-code">{t.barang.kodeBarang}</div>
                        </td>
                        <td className="td-sm">{t.namaPeminjam}</td>
                        <td className="td-sm">{t.ruanganPinjam}</td>
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
                              setTransaksiAktif(t);
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
                <div className="modal-preview-title">{barang.nama}</div>
                <div className="td-code">{barang.kodeBarang}</div>
              </div>
              <span className="badge badge-ok" style={{ flexShrink: 0 }}>Tersedia</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Peminjam *</label>
              <input className="input" placeholder="Nama mahasiswa/dosen/staf" value={form.namaPeminjam} onChange={e => setF("namaPeminjam", e.target.value)} autoFocus />
            </div>
            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ruangan Penggunaan *</label>
                <input className="input" placeholder="Lab 1 / R.101" value={form.ruanganPinjam} onChange={e => setF("ruanganPinjam", e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deadline Kembali *</label>
                <input type="date" className="input" value={form.deadlineKembali} onChange={e => setF("deadlineKembali", e.target.value)} />
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
      <Modal open={modalKembali} onClose={() => { setModalKembali(false); setTransaksiAktif(null); setBarang(null); }} title="Konfirmasi Pengembalian">
        {barang && transaksiAktif && (
          <>
            <div className="modal-preview">
              <div className="modal-preview-title" style={{ marginBottom: 8 }}>{barang.nama}</div>
              <div className="flex-col" style={{ gap: 5 }}>
                {[
                  { label: "Kode",     value: barang.kodeBarang },
                  { label: "Peminjam", value: transaksiAktif.namaPeminjam },
                  { label: "Dipinjam", value: fDateShort(transaksiAktif.tanggalPinjam) },
                  { label: "Deadline", value: fDateShort(transaksiAktif.deadlineKembali) },
                ].map(row => (
                  <div key={row.label} className="modal-preview-row">
                    <span className="modal-preview-label">{row.label}</span>
                    <span className="modal-preview-value" style={{ fontFamily: row.label === "Kode" ? "monospace" : undefined }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {isOverdue(transaksiAktif.deadlineKembali) && (
              <div className="alert alert-danger mb-16">
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
                Barang ini sudah melewati deadline pengembalian!
              </div>
            )}

            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Konfirmasi bahwa barang telah dikembalikan. Status akan otomatis berubah menjadi <strong>Tersedia</strong>.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModalKembali(false); setTransaksiAktif(null); setBarang(null); }}>Batal</button>
              <button className="btn btn-success" onClick={() => handleKembali(transaksiAktif.id)} disabled={processing}>
                {processing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-circle-check" />Konfirmasi Kembali</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
