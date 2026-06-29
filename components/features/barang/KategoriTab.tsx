// components/features/barang/KategoriTab.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { JenisBarang } from "@/types";

/** CRUD tab for managing Jenis Barang (asset categories) */
export default function KategoriTab() {
  const [list, setList] = useState<JenisBarang[]>([]);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<JenisBarang | null>(null);
  const [form, setForm] = useState({ nama: "", keterangan: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = () => api.get<JenisBarang[]>("/api/jenis-barang").then(setList).catch(console.error);
  useEffect(() => { load(); }, []);

  function openAdd() {
    setSelected(null);
    setForm({ nama: "", keterangan: "" });
    setModal(true);
  }

  function openEdit(k: JenisBarang) {
    setSelected(k);
    setForm({ nama: k.nama, keterangan: k.keterangan ?? "" });
    setModal(true);
  }

  async function handleSave() {
    if (!form.nama) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/api/jenis-barang/${selected.id}`, form);
        toast.success("Kategori diperbarui");
      } else {
        await api.post("/api/jenis-barang", form);
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
      await api.delete(`/api/jenis-barang/${confirmDel.id}`);
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
          <i className="ti ti-plus" /> Tambah Jenis Barang
        </button>
      </div>

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Jenis Barang</th>
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
                    Belum ada jenis barang
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
        title="Hapus Jenis Barang"
        message={`Apakah Anda yakin ingin menghapus kategori "${confirmDel?.nama}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Jenis Barang" : "Tambah Jenis Barang"}>
        <div className="form-group">
          <label className="form-label">Nama Jenis Barang *</label>
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
