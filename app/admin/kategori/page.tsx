"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { KategoriBarang } from "@/types";

export default function KategoriPage() {
  const [list, setList]     = useState<KategoriBarang[]>([]);
  const [modal, setModal]   = useState(false);
  const [selected, setSelected] = useState<KategoriBarang | null>(null);
  const [form, setForm]     = useState({ nama: "", deskripsi: "" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get<KategoriBarang[]>("/api/kategori").then(setList).catch(console.error);
  useEffect(() => { load(); }, []);

  function openAdd()  { setSelected(null); setForm({ nama: "", deskripsi: "" }); setModal(true); }
  function openEdit(k: KategoriBarang) {
    setSelected(k); setForm({ nama: k.nama, deskripsi: k.deskripsi ?? "" }); setModal(true);
  }

  async function handleSave() {
    if (!form.nama) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/api/kategori/${selected.id}`, form);
        toast.success("Kategori diperbarui");
      } else {
        await api.post("/api/kategori", form);
        toast.success("Kategori ditambahkan");
      }
      setModal(false); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus kategori "${nama}"?`)) return;
    try {
      await api.delete(`/api/kategori/${id}`);
      toast.success("Dihapus"); load();
    } catch { toast.error("Gagal — mungkin masih ada barang di kategori ini"); }
  }

  return (
    <>
      <PageHeader title="Kategori Barang" subtitle="Klasifikasi aset FTI UKSW">
        <button className="btn btn-primary" onClick={openAdd}><i className="ti ti-plus" /> Tambah</button>
      </PageHeader>

      <div className="glass">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Nama Kategori</th><th>Deskripsi</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><i className="ti ti-category-minus" style={{ fontSize: 28 }} />Belum ada kategori</div></td></tr>
            ) : list.map((k, i) => (
              <tr key={k.id}>
                <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{k.nama}</td>
                <td>{k.deskripsi ?? "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(k)}><i className="ti ti-edit" /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(k.id, k.nama)}><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Kategori" : "Tambah Kategori"}>
        <div className="form-group">
          <label className="form-label">Nama Kategori *</label>
          <input className="input" placeholder="Komputer, Proyektor…" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
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
