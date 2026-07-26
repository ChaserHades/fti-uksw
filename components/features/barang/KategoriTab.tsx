// components/features/barang/KategoriTab.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Kategori } from "@/types";

const LIMIT = 50;

/** CRUD tab for managing Kategori (asset categories) */
export default function KategoriTab() {
  const [list, setList] = useState<Kategori[]>([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Kategori | null>(null);
  const [form, setForm] = useState({ nama: "", keterangan: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback((reset = true) => {
    const cur = reset ? null : cursor;
    const params = new URLSearchParams();
    params.set("limit", String(LIMIT));
    if (search) params.set("search", search);
    if (cur) params.set("cursor", cur);

    if (!reset) setLoadingMore(true);
    api.get<{ data: Kategori[]; nextCursor: string | null }>(`/api/kategori?${params}`)
      .then(res => {
        if (reset) setList(res.data);
        else setList(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, cursor]);

  useEffect(() => { load(true); }, [search]);

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
      toast.error("Gagal diproses karena mungkin masih ada barang di kategori ini");
    } finally {
      setIsDeleting(false);
      setConfirmDel(null);
    }
  }

  return (
    <>
      <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>
        <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
          <div className="search-wrap" style={{ flex: "1 1 300px", minWidth: 250, margin: 0 }}>
            <i className="ti ti-search search-icon" />
            <input
              className="input"
              placeholder="Cari kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="ti ti-plus" /> Tambah Kategori
          </button>
        </div>

        <div className="table-wrap">
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
                <td>{k.keterangan ?? ""}</td>
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
        {cursor && (
          <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button className="btn btn-ghost" onClick={() => load(false)} disabled={loadingMore}>
              {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
            </button>
          </div>
        )}
        </div>
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
