"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { parseQrPayload } from "@/helpers/format";
import { useQrScanner } from "@/hooks/useQrScanner";
import type { Barang } from "@/types";
import ConfirmModal from "@/components/ConfirmModal";

/** Scan QR untuk recovery dan read-only */
export default function ScanRegisterSection() {
  const [scannedKode, setScannedKode] = useState("");
  const [scanState, setScanState] = useState<"ACTIVE" | "RECOVERABLE" | "EXPIRED" | "AMBIGUOUS" | "NOT_FOUND" | null>(null);
  const [foundBarang, setFoundBarang] = useState<Barang | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  async function handleScanResult(raw: string) {
    const kode = parseQrPayload(raw);
    setScannedKode(kode);
    try {
      const res = await fetch(`/api/barang/recovery?kode=${encodeURIComponent(kode)}`);
      const data = await res.json();

      if (res.ok) {
        setScanState(data.state);
        setFoundBarang(data.item || null);
        setDeadline(data.deadline || null);

        if (data.state === "ACTIVE") {
          toast.success(`Barang "${data.item.kategori?.nama || data.item.namaBarang || data.item.label}" masih terdaftar.`);
        } else if (data.state === "RECOVERABLE") {
          toast.success("Barang terhapus ditemukan (dapat dipulihkan).");
        }
      } else {
        toast.error(data.error || "Gagal memproses QR");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    }
  }

  const { videoRef, canvasRef, scanning, startCamera, stopCamera } = useQrScanner(handleScanResult);

  const handleStartCamera = async () => {
    setScannedKode("");
    setFoundBarang(null);
    setScanState(null);
    setDeadline(null);
    try {
      await startCamera();
    } catch {
      toast.error("Tidak dapat mengakses kamera");
    }
  };

  const handleRestore = async () => {
    if (!foundBarang) return;
    setSaving(true);
    const toastId = toast.loading("Memulihkan...");
    try {
      await api.put(`/api/barang/${foundBarang.id}/restore`, {});
      toast.success("Barang berhasil dipulihkan", { id: toastId });
      setScanState("ACTIVE"); // Update local state so it appears active again
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal memulihkan", { id: toastId });
    } finally {
      setSaving(false);
      setConfirmRestore(false);
    }
  };

  const renderRemainingTime = () => {
    if (!deadline) return null;
    const now = Date.now();
    const diffMs = deadline - now;
    if (diffMs <= 0) return "Batas pemulihan berakhir";

    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (d > 0) return `${d} hari ${h} jam`;
    return `${h} jam ${m} menit`;
  };

  return (
    <div className="scan-container">
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading">
          <div className="scan-title">Scan QR / Barcode Aset</div>
        </div>

        {/* Camera viewport */}
        <div style={{
          position: "relative", width: "100%", aspectRatio: "3/2", borderRadius: 10,
          overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 16,
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

        {/* Camera controls */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!scanning
            ? <button className="btn btn-primary" onClick={handleStartCamera}><i className="ti ti-camera" /> Buka Kamera</button>
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" /> Stop Kamera</button>}
          {scannedKode && !scanning && (
            <button className="btn btn-ghost" onClick={() => { setScannedKode(""); setFoundBarang(null); setScanState(null); handleStartCamera(); }}>
              <i className="ti ti-refresh" /> Scan Ulang
            </button>
          )}
        </div>

        {/* Found result */}
        {scannedKode && !scanning && (
          <div style={{ marginTop: 14 }}>
            {scanState === "ACTIVE" && foundBarang && (
              <div className="alert alert-info">
                <i className="ti ti-check" /> Barang <strong>{foundBarang.kategori?.nama || foundBarang.namaBarang}</strong> ({foundBarang.labelAset || foundBarang.label}) masih terdaftar.
              </div>
            )}

            {scanState === "RECOVERABLE" && foundBarang && (
              <div className="alert alert-warn" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><i className="ti ti-alert-triangle" /> Barang ini telah dihapus tetapi masih dapat dipulihkan.</div>
                <div><strong>Nama:</strong> {foundBarang.namaBarang}</div>
                <div><strong>Sisa Waktu:</strong> {renderRemainingTime()}</div>
                <button className="btn btn-primary" onClick={() => setConfirmRestore(true)} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                  Pulihkan Barang
                </button>
              </div>
            )}

            {scanState === "EXPIRED" && foundBarang && (
              <div className="alert alert-error">
                <i className="ti ti-x" /> Periode pemulihan untuk barang ini telah berakhir. Barang tidak dapat dipulihkan lagi.
              </div>
            )}

            {scanState === "AMBIGUOUS" && (
              <div className="alert alert-error">
                <i className="ti ti-alert-circle" /> Terdapat beberapa barang yang menggunakan label ini di riwayat. Tidak dapat memulihkan secara otomatis.
              </div>
            )}

            {scanState === "NOT_FOUND" && (
              <div className="alert alert-error">
                <i className="ti ti-x" /> QR tidak dikenali sebagai data barang yang pernah tersimpan.
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmRestore}
        title="Pulihkan Barang"
        message={`Apakah Anda yakin ingin memulihkan barang "${foundBarang?.namaBarang || foundBarang?.label}"?`}
        confirmLabel="Pulihkan Barang"
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(false)}
        isLoading={saving}
      />
    </div>
  );
}
