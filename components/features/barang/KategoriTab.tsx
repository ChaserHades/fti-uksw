// components/features/barang/KategoriTab.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Kategori } from "@/types";

/** CRUD tab for managing Kategori (asset categories) */
export default function KategoriTab() {
  const [list, setList] = useState<Kategori[]>([]);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Kategori | null>(null);
  const [form, setForm] = useState({ nama: "", keterangan: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = () => api.get<{ data: Kategori[] }>("/api/kategori?limit=all").then(res => setList(res.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  function openAdd() {
    setSelected(null);
    setForm({ nama: "", keterangan: "" });
    setModal(true);
  }

  function openEdit(k: Kategori) {
    setSelected(k);
    setForm({ nama: k.nama, keterangan: k.keterangan ?? "" });
    setModal(true);
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
      setModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/kategori/${confirmDel.id}`);
      toast.success("Dihapus");
      load();
    } catch {
      toast.error("Gagal — mungkin masih ada barang di kategori ini");
    } finally {
      setIsDeleting(false);
      setConfirmDel(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Tambah Kategori
        </button>
      </div>

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Kategori</th>
              <th>Deskripsi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <i className="ti ti-category-minus" style={{ fontSize: 28 }} />
                    Belum ada kategori
                  </div>
                </td>
              </tr>
            ) : list.map((k, i) => (
              <tr key={k.id}>
                <td className="td-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td className="td-name">{k.nama}</td>
                <td>{k.keterangan ?? "-"}</td>
                <td>
                  <div className="action-row">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(k)}>
                      <i className="ti ti-edit" />
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => setConfirmDel({ id: k.id, nama: k.nama })}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${confirmDel?.nama}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Kategori" : "Tambah Kategori"}>
        <div className="form-group">
          <label className="form-label">Nama Kategori *</label>
          <input className="input" placeholder="Komputer…" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>
    </>
  );
}
