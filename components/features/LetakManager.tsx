// components/features/LetakManager.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { parseQrPayload } from "@/helpers/format";
import ConfirmModal from "@/components/ConfirmModal";
import { useQrScanner } from "@/hooks/useQrScanner";
import type { Letak, Barang } from "@/types";

const EMPTY = { kode: "", nama: "", lantai: "" };

interface RuanganWithCount extends Letak { _count?: { barang: number }; }

export default function RuanganManager({ role = "ADMIN" }: { role?: string }) {
  const [list, setList]         = useState<RuanganWithCount[]>([]);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<"form" | "pindah" | null>(null);
  const [selected, setSelected] = useState<Letak | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const [confirmDel, setConfirmDel] = useState<{ id: string, nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pindah barang state
  const [pindahBarang, setPindahBarang]   = useState<Barang | null>(null);
  const [pindahTarget, setPindahTarget]   = useState("");
  const [pindahSaving, setPindahSaving]   = useState(false);
  const [kodeInput,    setKodeInput]      = useState("");

  // QR Scanner hook for pindah barang
  function handleQrScanResult(raw: string) {
    const kode = parseQrPayload(raw);
    setKodeInput(kode);
    lookupBarang(kode);
  }
  const { videoRef, canvasRef, scanning, startCamera: rawStartCamera, stopCamera } = useQrScanner(handleQrScanResult);

  const load = () =>
    api.get<RuanganWithCount[]>("/api/letak?include=count").then(setList).catch(console.error);

  useEffect(() => { load(); }, []);



  // ── CRUD Letak ──
  function openAdd() { setSelected(null); setForm(EMPTY); setModal("form"); }
  function openEdit(r: Letak) {
    setSelected(r);
    setForm({ kode: r.kode, nama: r.nama, lantai: r.lantai ?? "" });
    setModal("form");
  }

  async function handleSave() {
    if (!form.kode || !form.nama) { toast.error("Kode dan nama wajib diisi"); return; }
    setSaving(true);
    const body = { ...form };
    try {
      if (selected) { await api.put(`/api/letak/${selected.id}`, body); toast.success("Letak diperbarui"); }
      else { await api.post("/api/letak", body); toast.success("Letak ditambahkan"); }
      setModal(null); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  function handleDelete(id: string, nama: string) {
    setConfirmDel({ id, nama });
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try { await api.delete(`/api/letak/${confirmDel.id}`); toast.success("Letak dihapus"); load(); }
    catch { toast.error("Gagal — mungkin masih ada barang di ruangan ini"); }
    finally { setIsDeleting(false); setConfirmDel(null); }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Pindah Barang ──
  function openPindah() {
    setPindahBarang(null); setPindahTarget(""); setKodeInput("");
    setModal("pindah");
  }

  async function lookupBarang(kode: string) {
    if (!kode.trim()) return;
    try {
      const b = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode.trim())}`);
      setPindahBarang(b);
      setPindahTarget(b.letakId ?? "");
      toast.success(`Ditemukan: ${b.nama}`);
    } catch {
      toast.error(`Barang dengan kode "${kode}" tidak ditemukan`);
    }
  }

  async function handlePindah() {
    if (!pindahBarang) return;
    if (!pindahTarget) { toast.error("Pilih ruangan tujuan"); return; }
    if (pindahTarget === pindahBarang.letakId) { toast.error("Letak sama — tidak ada perubahan"); return; }
    setPindahSaving(true);
    try {
      await api.put(`/api/barang/${pindahBarang.id}`, { letakId: pindahTarget });
      toast.success(`"${pindahBarang.nama}" dipindahkan ke ruangan baru`);
      setModal(null); setPindahBarang(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindahkan");
    } finally { setPindahSaving(false); }
  }

  // Camera wrapper for pindah
  async function startCamera() {
    try { await rawStartCamera(); }
    catch { toast.error("Tidak dapat mengakses kamera"); }
  }

  const filtered = list.filter(r => 
    r.nama.toLowerCase().includes(search.toLowerCase()) || 
    r.kode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="glass filter-bar mb-16">
        <div className="search-wrap" style={{ flex: "1 1 200px" }}>
          <i className="ti ti-search search-icon" />
          <input 
            className="input" 
            placeholder="Cari ruangan..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <button className="btn btn-ghost" onClick={openPindah}>
          <i className="ti ti-arrows-exchange" /> Pindah Barang
        </button>
        {role === "ADMIN" && (
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="ti ti-plus" /> Tambah Letak
          </button>
        )}
      </div>

      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th><th>Nama</th>
                <th>Lantai</th><th>Jml Barang</th>
                {role === "ADMIN" && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><i className="ti ti-building-off" style={{ fontSize: 28 }} />Belum ada ruangan</div></td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td className="td-mono td-bold">{r.kode}</td>
                  <td className="td-name">{r.nama}</td>
                  <td>{r.lantai ?? "—"}</td>
                  <td>
                    <span className="badge badge-info">{r._count?.barang ?? 0}</span>
                  </td>
                  {role === "ADMIN" && (
                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(r)}><i className="ti ti-edit" /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(r.id, r.nama)}><i className="ti ti-trash" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Letak"
        message={`Apakah Anda yakin ingin menghapus ruangan "${confirmDel?.nama}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      {/* Modal CRUD Letak */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Letak" : "Tambah Letak"}>
        <div className="form-group">
          <label className="form-label">Kode Letak *</label>
          <input className="input" placeholder="LAB1" value={form.kode} onChange={e => setF("kode", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Nama Letak *</label>
          <input className="input" placeholder="Lab Komputer 1" value={form.nama} onChange={e => setF("nama", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Lantai</label>
          <input className="input" placeholder="1" value={form.lantai} onChange={e => setF("lantai", e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>

      {/* Modal Pindah Barang */}
      <Modal open={modal === "pindah"} onClose={() => { setModal(null); stopCamera(); }} title="Pindah Barang ke Letak Lain">
        <div className="scan-heading" style={{ marginBottom: 14 }}>
          <div className="scan-sub">Scan QR atau input kode barang manual, lalu pilih ruangan tujuan.</div>
        </div>

        {/* Camera area (small) */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "3/2", borderRadius: 10, overflow: "hidden", background: "#000", border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`, marginBottom: 12 }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "none" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-camera-off" style={{ fontSize: 28, color: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
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
                <div className="td-code">{pindahBarang.label} · Letak saat ini: <strong>{pindahBarang.letak?.kode ?? "Tidak ada"}</strong></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Letak Tujuan *</label>
              <LiquidSelect
                value={pindahTarget}
                onChange={setPindahTarget}
                options={[
                  { value: "", label: "— Pilih ruangan —" },
                  ...list.map(r => ({
                    value: r.id,
                    label: `${r.kode} — ${r.nama} ${r.id === pindahBarang.letakId ? "(saat ini)" : ""}`
                  }))
                ]}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(null); stopCamera(); }}>Batal</button>
              <button className="btn btn-primary" onClick={handlePindah} disabled={pindahSaving}>
                {pindahSaving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memindahkan…</> : <><i className="ti ti-arrows-exchange" />Pindahkan</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
