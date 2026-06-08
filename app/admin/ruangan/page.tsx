// app/admin/ruangan/page.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Ruangan } from "@/types";

const EMPTY = { kode: "", nama: "", gedung: "", lantai: "", kapasitas: "" };

export default function RuanganPage() {
  const [list, setList]         = useState<Ruangan[]>([]);
  const [modal, setModal]       = useState(false);
  const [selected, setSelected] = useState<Ruangan | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const load = () =>
    api.get<Ruangan[]>("/api/ruangan").then(setList).catch(console.error);

  useEffect(() => { load(); }, []);

  function openAdd() { setSelected(null); setForm(EMPTY); setModal(true); }
  function openEdit(r: Ruangan) {
    setSelected(r);
    setForm({
      kode: r.kode, nama: r.nama,
      gedung: r.gedung ?? "", lantai: r.lantai ?? "",
      kapasitas: r.kapasitas?.toString() ?? "",
    });
    setModal(true);
  }

  async function handleSave() {
    if (!form.kode || !form.nama) { toast.error("Kode dan nama wajib diisi"); return; }
    setSaving(true);
    const body = { ...form, kapasitas: form.kapasitas ? Number(form.kapasitas) : null };
    try {
      if (selected) {
        await api.put(`/api/ruangan/${selected.id}`, body);
        toast.success("Ruangan diperbarui");
      } else {
        await api.post("/api/ruangan", body);
        toast.success("Ruangan ditambahkan");
      }
      setModal(false); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus ruangan "${nama}"?`)) return;
    try {
      await api.delete(`/api/ruangan/${id}`);
      toast.success("Ruangan dihapus"); load();
    } catch { toast.error("Gagal — mungkin masih ada barang di ruangan ini"); }
  }

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader title="Manajemen Ruangan" subtitle="Lokasi penyimpanan aset FTI">
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Tambah Ruangan
        </button>
      </PageHeader>

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th><th>Nama</th><th>Gedung</th>
              <th>Lantai</th><th>Kapasitas</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <i className="ti ti-building-off" style={{ fontSize: 28 }} />
                    Belum ada ruangan
                  </div>
                </td>
              </tr>
            ) : list.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>{r.kode}</td>
                <td style={{ color: "var(--text-primary)" }}>{r.nama}</td>
                <td>{r.gedung ?? "—"}</td>
                <td>{r.lantai ?? "—"}</td>
                <td>{r.kapasitas ?? "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(r)}>
                      <i className="ti ti-edit" />
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(r.id, r.nama)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Ruangan" : "Tambah Ruangan"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Kode Ruangan *</label>
            <input className="input" placeholder="LAB1" value={form.kode} onChange={(e) => setF("kode", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Kapasitas</label>
            <input type="number" className="input" placeholder="30" value={form.kapasitas} onChange={(e) => setF("kapasitas", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Ruangan *</label>
          <input className="input" placeholder="Lab Komputer 1" value={form.nama} onChange={(e) => setF("nama", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Gedung</label>
            <input className="input" placeholder="A" value={form.gedung} onChange={(e) => setF("gedung", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Lantai</label>
            <input className="input" placeholder="1" value={form.lantai} onChange={(e) => setF("lantai", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>
    </>
  );
}
