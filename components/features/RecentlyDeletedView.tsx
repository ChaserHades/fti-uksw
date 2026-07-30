"use client";
import { useEffect, useState } from "react";
import { api } from "@/helpers/api";
import { fDateShort, fDateTime } from "@/helpers/format";
import toast from "react-hot-toast";
import type { Barang } from "@/types";

export default function RecentlyDeletedView({ role }: { role: string }) {
  const [list, setList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get<{ data: Barang[] }>("/api/barang?status=deleted")
      .then(res => setList(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(id: string) {
    if (!confirm("Apakah Anda yakin ingin memulihkan barang ini?")) return;
    const toastId = toast.loading("Memulihkan...");
    try {
      await api.put(`/api/barang/${id}/restore`, {});
      toast.success("Barang dipulihkan", { id: toastId });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal memulihkan", { id: toastId });
    }
  }

  async function handleHardDelete(id: string) {
    if (!confirm("PERINGATAN: Aksi ini akan menghapus barang SELAMANYA. Apakah Anda yakin?")) return;
    const toastId = toast.loading("Menghapus permanen...");
    try {
      await api.delete(`/api/barang/${id}/hard-delete`);
      toast.success("Barang dihapus permanen", { id: toastId });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal menghapus", { id: toastId });
    }
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "300px" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="glass" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-trash" style={{ color: "var(--color-err)" }} />
          Barang Terhapus (Recently Deleted)
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
          Barang yang dihapus akan disimpan di sini dan dapat dipulihkan. Admin dapat menghapus data selamanya.
        </p>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu Dihapus</th>
                <th>Nama / Kategori</th>
                <th>Kode Label</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <i className="ti ti-trash-off" style={{ fontSize: 28 }} />
                      Tidak ada barang terhapus
                    </div>
                  </td>
                </tr>
              ) : (
                list.map(b => (
                  <tr key={b.id}>
                    <td className="td-sm">{b.deletedAt ? fDateTime(b.deletedAt) : "-"}</td>
                    <td>
                      <div className="td-name">{b.namaBarang || "-"}</div>
                      <div className="td-sm" style={{ color: "var(--text-secondary)" }}>{b.kategori?.nama}</div>
                    </td>
                    <td>
                      <div className="td-code">{b.label}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleRestore(b.id)} title="Pulihkan">
                          <i className="ti ti-arrow-back-up" style={{ color: "var(--color-ok)" }} />
                        </button>
                        {role === "ADMIN" && (
                          <button className="btn btn-sm btn-ghost" onClick={() => handleHardDelete(b.id)} title="Hapus Permanen">
                            <i className="ti ti-trash-x" style={{ color: "var(--color-err)" }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
