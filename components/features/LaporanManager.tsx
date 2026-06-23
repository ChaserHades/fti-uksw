// app/admin/laporan/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { Pengeluaran } from "@/types";

type JenisFilter = "" | "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";

const EMPTY = { judul: "", deskripsi: "", nominal: "", tanggal: "", jenis: "PEMBELIAN_ASET" };
const jenisLabel: Record<string, string> = {
  PEMBELIAN_ASET: "Pembelian Aset",
  MAINTENANCE: "Maintenance",
  LAINNYA: "Lainnya",
};
const jenisBadge: Record<string, string> = {
  PEMBELIAN_ASET: "badge-info",
  MAINTENANCE: "badge-warn",
  LAINNYA: "badge-muted",
};

export default function LaporanManager({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  const [list,    setList]    = useState<Pengeluaran[]>([]);
  const [filter,  setFilter]  = useState<JenisFilter>("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [nota,    setNota]    = useState<File | null>(null);
  const [saving,  setSaving]  = useState(false);

  const load = () => {
    const params = filter ? `?jenis=${filter}` : "";
    api.get<Pengeluaran[]>(`/api/pengeluaran${params}`).then(setList).catch(console.error);
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (searchParams.get("action") === "add" && role === "ADMIN") {
      setModal(true);
    }
  }, [searchParams, role]);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.judul.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.nominal || parseFloat(form.nominal) <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!form.tanggal) { toast.error("Tanggal wajib diisi"); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("judul", form.judul);
      fd.append("deskripsi", form.deskripsi);
      fd.append("nominal", form.nominal);
      fd.append("tanggal", form.tanggal);
      fd.append("jenis", form.jenis);
      if (nota) fd.append("nota", nota);

      const res = await fetch("/api/pengeluaran", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast.success("Pengeluaran berhasil dicatat");
      setModal(false);
      setForm(EMPTY);
      setNota(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, judul: string) {
    if (!confirm(`Hapus pengeluaran "${judul}"?`)) return;
    try {
      await api.delete(`/api/pengeluaran/${id}`);
      toast.success("Pengeluaran dihapus");
      load();
    } catch { toast.error("Gagal menghapus"); }
  }

  function exportCSV() {
    const headers = ["Judul", "Jenis", "Nominal (Rp)", "Tanggal", "Deskripsi", "Pencatat"];
    const rows = list.map(p => [
      p.judul,
      jenisLabel[p.jenis] ?? p.jenis,
      p.nominal.toString(),
      fDateShort(p.tanggal),
      p.deskripsi ?? "",
      p.user.name ?? p.user.email,
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `laporan-pengeluaran-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  }

  const totalNominal = list.reduce((sum, p) => sum + p.nominal, 0);

  return (
    <>
      <PageHeader title="Laporan Pengeluaran" subtitle="Catat pembelian aset, maintenance, dan pengeluaran lainnya">
        {role === "ADMIN" && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setNota(null); setModal(true); }}>
            <i className="ti ti-plus" /> Input Pengeluaran
          </button>
        )}
      </PageHeader>

      {/* Filters & Export */}
      <div className="glass filter-bar mb-16">
        <div style={{ flex: "0 1 180px", minWidth: 150 }}>
          <LiquidSelect
            value={filter}
            onChange={val => setFilter(val as JenisFilter)}
            options={[
              { value: "", label: "Semua Jenis" },
              { value: "PEMBELIAN_ASET", label: "Pembelian Aset" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "LAINNYA", label: "Lainnya" }
            ]}
          />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-16">
        {[
          { label: "Total Pengeluaran", value: list.length,                                                   badge: "badge-info" },
          { label: "Total Nominal",     value: `Rp ${totalNominal.toLocaleString("id-ID")}`,                  badge: "badge-warn" },
          { label: "Pembelian Aset",    value: list.filter(p => p.jenis === "PEMBELIAN_ASET").length,          badge: "badge-ok" },
        ].map(s => (
          <div key={s.label} className="glass summary-badge-row">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Judul</th>
                <th style={{ width: "14%" }}>Jenis</th>
                <th style={{ width: "16%" }}>Nominal</th>
                <th style={{ width: "12%" }}>Tanggal</th>
                <th style={{ width: "14%" }}>Pencatat</th>
                <th style={{ width: "8%" }}>Nota</th>
                {role === "ADMIN" && <th style={{ width: "14%" }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="ti ti-file-off" style={{ fontSize: 28 }} />
                      Belum ada data pengeluaran
                    </div>
                  </td>
                </tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="td-name">{p.judul}</div>
                    {p.deskripsi && <div className="td-code">{p.deskripsi}</div>}
                  </td>
                  <td><span className={`badge ${jenisBadge[p.jenis]}`}>{jenisLabel[p.jenis]}</span></td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                    Rp {p.nominal.toLocaleString("id-ID")}
                  </td>
                  <td className="td-sm">{fDateShort(p.tanggal)}</td>
                  <td className="td-sm">{p.user.name ?? "—"}</td>
                  <td>
                    {p.notaUrl ? (
                      <a href={p.notaUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-icon btn-sm" title="Lihat Nota">
                        <i className="ti ti-file-check" />
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  {role === "ADMIN" && (
                    <td>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id, p.judul)} title="Hapus">
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Pengeluaran */}
      <Modal open={modal} onClose={() => setModal(false)} title="Input Pengeluaran">
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Judul *</label>
            <input className="input" placeholder="Pembelian Keyboard" value={form.judul} onChange={e => setF("judul", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jenis *</label>
            <LiquidSelect
              value={form.jenis}
              onChange={val => setF("jenis", val)}
              options={[
                { value: "PEMBELIAN_ASET", label: "Pembelian Aset" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "LAINNYA", label: "Lainnya" }
              ]}
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nominal (Rp) *</label>
            <input type="number" className="input" placeholder="0" value={form.nominal} onChange={e => setF("nominal", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tanggal *</label>
            <input type="date" className="input" value={form.tanggal} onChange={e => setF("tanggal", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={e => setF("deskripsi", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Upload Nota / Receipt <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
          <input type="file" className="input" accept="image/*,.pdf" onChange={e => setNota(e.target.files?.[0] ?? null)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <>
              <i className="ti ti-check" />Simpan</>}
          </button>
        </div>
      </Modal>
    </>
  );
}
