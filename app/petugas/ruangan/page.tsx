// app/petugas/ruangan/page.tsx
// Teknisi: pindah barang antar ruangan via QR/manual. Tidak bisa CRUD ruangan.
"use client";
import { useEffect, useState, useRef } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { parseQrPayload } from "@/helpers/format";
import type { Ruangan, Barang } from "@/types";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

interface RuanganWithCount extends Ruangan { _count?: { barang: number }; }

export default function TeknisiRuanganPage() {
  const [list, setList]               = useState<RuanganWithCount[]>([]);
  const [modal, setModal]             = useState(false);
  const [pindahBarang, setPindahBarang] = useState<Barang | null>(null);
  const [pindahTarget, setPindahTarget] = useState("");
  const [pindahSaving, setPindahSaving] = useState(false);
  const [kodeInput, setKodeInput]     = useState("");

  // Camera state
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const jsqrReady = useRef(false);
  const [scanning, setScanning] = useState(false);

  const load = () =>
    api.get<RuanganWithCount[]>("/api/ruangan?include=count").then(setList).catch(console.error);

  useEffect(() => { load(); }, []);

  // jsQR script
  useEffect(() => {
    if (document.getElementById("jsqr-script")) { jsqrReady.current = true; return; }
    const s = document.createElement("script");
    s.id = "jsqr-script"; s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);
  useEffect(() => () => stopCamera(), []);

  // ── Pindah Barang ──
  function openPindah() {
    setPindahBarang(null); setPindahTarget(""); setKodeInput("");
    setModal(true);
  }

  async function lookupBarang(kode: string) {
    if (!kode.trim()) return;
    try {
      const b = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode.trim())}`);
      setPindahBarang(b);
      setPindahTarget(b.ruanganId ?? "");
      toast.success(`Ditemukan: ${b.nama}`);
    } catch {
      toast.error(`Barang dengan kode "${kode}" tidak ditemukan`);
    }
  }

  async function handlePindah() {
    if (!pindahBarang) return;
    if (!pindahTarget) { toast.error("Pilih ruangan tujuan"); return; }
    if (pindahTarget === pindahBarang.ruanganId) { toast.error("Ruangan sama — tidak ada perubahan"); return; }
    setPindahSaving(true);
    try {
      await api.put(`/api/barang/${pindahBarang.id}`, { ruanganId: pindahTarget });
      toast.success(`"${pindahBarang.nama}" dipindahkan ke ruangan baru`);
      setModal(false); setPindahBarang(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindahkan");
    } finally { setPindahSaving(false); }
  }

  // Camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current!; v.srcObject = stream; await v.play();
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
    if (code?.data) {
      stopCamera();
      const kode = parseQrPayload(code.data);
      setKodeInput(kode);
      lookupBarang(kode);
      return;
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  return (
    <>
      <PageHeader title="Ruangan" subtitle="Lihat daftar ruangan dan pindahkan barang antar ruangan">
        <button className="btn btn-primary" onClick={openPindah}>
          <i className="ti ti-arrows-exchange" /> Pindah Barang
        </button>
      </PageHeader>

      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th><th>Nama</th><th>Gedung</th>
                <th>Lantai</th><th>Kapasitas</th><th>Jml Barang</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><i className="ti ti-building-off" style={{ fontSize: 28 }} />Belum ada ruangan</div></td></tr>
              ) : list.map(r => (
                <tr key={r.id}>
                  <td className="td-mono td-bold">{r.kode}</td>
                  <td className="td-name">{r.nama}</td>
                  <td>{r.gedung ?? "—"}</td>
                  <td>{r.lantai ?? "—"}</td>
                  <td>{r.kapasitas ?? "—"}</td>
                  <td>
                    <span className="badge badge-info">{r._count?.barang ?? 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pindah Barang */}
      <Modal open={modal} onClose={() => { setModal(false); stopCamera(); }} title="Pindah Barang ke Ruangan Lain">
        <div className="scan-heading" style={{ marginBottom: 14 }}>
          <div className="scan-sub">Scan QR atau input kode barang manual, lalu pilih ruangan tujuan.</div>
        </div>

        {/* Camera area */}
        <div style={{
          position: "relative", width: "100%", aspectRatio: "3/2",
          borderRadius: 10, overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 12,
        }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "none" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-camera-off" style={{ fontSize: 28, color: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
            </div>
          )}
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 140, height: 140, borderRadius: 10, border: "2px solid var(--color-ok)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {!scanning
            ? <button className="btn btn-primary btn-sm" onClick={startCamera}><i className="ti ti-camera" />Scan QR</button>
            : <button className="btn btn-ghost btn-sm" onClick={stopCamera}><i className="ti ti-camera-off" />Stop</button>
          }
        </div>

        <div className="form-group">
          <label className="form-label">Atau input kode manual</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Kode barang" value={kodeInput} onChange={e => setKodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") lookupBarang(kodeInput); }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => lookupBarang(kodeInput)} style={{ flexShrink: 0 }}>
              <i className="ti ti-search" />Cari
            </button>
          </div>
        </div>

        {pindahBarang && (
          <>
            <div className="modal-preview-with-icon" style={{ marginBottom: 14 }}>
              <div className="qa-card-icon" style={{ width: 36, height: 36 }}>
                <i className="ti ti-box" style={{ fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="modal-preview-title">{pindahBarang.nama}</div>
                <div className="td-code">{pindahBarang.kodeBarang} · Ruangan saat ini: <strong>{pindahBarang.ruangan?.kode ?? "Tidak ada"}</strong></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ruangan Tujuan *</label>
              <select className="select" value={pindahTarget} onChange={e => setPindahTarget(e.target.value)}>
                <option value="">— Pilih ruangan —</option>
                {list.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.kode} — {r.nama} {r.id === pindahBarang.ruanganId ? "(saat ini)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(false); stopCamera(); }}>Batal</button>
              <button className="btn btn-primary" onClick={handlePindah} disabled={pindahSaving}>
                {pindahSaving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memindahkan…</> : <><i className="ti ti-arrows-exchange" />Pindahkan</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
