"use client";
import { useEffect, useState } from "react";
import { api } from "@/helpers/api";
import { fDateShort, fDateTime } from "@/helpers/format";
import toast from "react-hot-toast";
import type { Barang } from "@/types";
import ConfirmModal from "@/components/ConfirmModal";

export default function RecentlyDeletedView({ role }: { role: string }) {
  const [list, setList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean; type: "RESTORE" | "HARD_DELETE"; id: string | null; name: string }>({
    open: false, type: "RESTORE", id: null, name: ""
  });
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = () => {
    setLoading(true);
    api.get<{ data: Barang[] }>("/api/barang?status=deleted")
      .then(res => setList(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => setNow(Date.now()), 60000); // update now every minute
    return () => clearInterval(interval);
  }, []);

  async function handleConfirm() {
    if (!modalState.id) return;
    setSaving(true);
    const toastId = toast.loading(modalState.type === "RESTORE" ? "Memulihkan..." : "Menghapus permanen...");
    try {
      if (modalState.type === "RESTORE") {
        await api.put(`/api/barang/${modalState.id}/restore`, {});
        toast.success("Barang dipulihkan", { id: toastId });
      } else {
        await api.delete(`/api/barang/${modalState.id}/hard-delete`);
        toast.success("Barang dihapus permanen", { id: toastId });
      }
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal memproses", { id: toastId });
    } finally {
      setSaving(false);
      setModalState(s => ({ ...s, open: false }));
    }
  }

  const renderRemainingTime = (deletedAt: string) => {
    const deletedTime = new Date(deletedAt).getTime();
    const deadline = deletedTime + 6 * 24 * 60 * 60 * 1000;
    const diffMs = deadline - now;
    if (diffMs <= 0) return <span style={{ color: "var(--color-err)", fontWeight: 600 }}>Batas pemulihan berakhir</span>;

    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (d > 0) return `${d} hari ${h} jam`;
    return `${h} jam ${m} menit`;
  };

  const getDeadline = (deletedAt: string) => {
    const date = new Date(new Date(deletedAt).getTime() + 6 * 24 * 60 * 60 * 1000);
    return fDateTime(date.toISOString());
  };

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
          Barang Terhapus
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
          Barang yang dihapus akan disimpan di sini dan dapat dipulihkan dalam 6 hari. Melewati 6 hari, barang tidak bisa dipulihkan.
        </p>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama / Kategori</th>
                <th>Label / Label Aset</th>
                <th>Waktu Dihapus</th>
                <th>Batas Pemulihan</th>
                <th>Sisa Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <i className="ti ti-trash-off" style={{ fontSize: 28 }} />
                      Tidak ada barang terhapus
                    </div>
                  </td>
                </tr>
              ) : (
                list.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="td-name">{b.namaBarang || "-"}</div>
                      <div className="td-sm" style={{ color: "var(--text-secondary)" }}>{b.kategori?.nama}</div>
                    </td>
                    <td>
                      <div className="td-code">{b.label || "-"}</div>
                      <div className="td-code" style={{ marginTop: 4 }}>{b.labelAset || "-"}</div>
                    </td>
                    <td className="td-sm">{b.deletedAt ? fDateTime(b.deletedAt) : "-"}</td>
                    <td className="td-sm" style={{ fontWeight: 600 }}>{b.deletedAt ? getDeadline(b.deletedAt) : "-"}</td>
                    <td className="td-sm">{b.deletedAt ? renderRemainingTime(b.deletedAt) : "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {role !== "UNIVERSITAS" && (
                          <button className="btn btn-sm btn-ghost" onClick={() => setModalState({ open: true, type: "RESTORE", id: b.id, name: b.namaBarang || b.label || "" })} title="Pulihkan Barang">
                            <i className="ti ti-arrow-back-up" style={{ color: "var(--color-ok)" }} />
                          </button>
                        )}
                        {role === "ADMIN" && (
                          <button className="btn btn-sm btn-ghost" onClick={() => setModalState({ open: true, type: "HARD_DELETE", id: b.id, name: b.namaBarang || b.label || "" })} title="Hapus Permanen">
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

      <ConfirmModal
        isOpen={modalState.open}
        title={modalState.type === "RESTORE" ? "Pulihkan Barang" : "Hard Delete Barang"}
        message={modalState.type === "RESTORE"
          ? `Apakah Anda yakin ingin memulihkan barang "${modalState.name}"?`
          : `PERINGATAN: Aksi ini akan menghapus barang "${modalState.name}" SELAMANYA. Apakah Anda yakin?`}
        confirmLabel={modalState.type === "RESTORE" ? "Pulihkan" : "Hapus Permanen"}
        danger={modalState.type === "HARD_DELETE"}
        onConfirm={handleConfirm}
        onCancel={() => setModalState(s => ({ ...s, open: false }))}
        isLoading={saving}
      />
    </div>
  );
}
