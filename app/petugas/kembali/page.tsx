// app/petugas/kembali/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue } from "@/helpers/format";
import type { Transaksi } from "@/types";

export default function KembaliPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading]     = useState<string | null>(null); // id yang sedang diproses

  const load = () =>
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF")
      .then(setTransaksi)
      .catch(console.error);

  useEffect(() => { load(); }, []);

  async function handleKembali(id: string) {
    if (!confirm("Konfirmasi pengembalian barang ini?")) return;
    setLoading(id);
    try {
      await api.post(`/api/transaksi/${id}/kembali`, {});
      toast.success("Barang berhasil dikembalikan");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
    } finally { setLoading(null); }
  }

  const terlambat = transaksi.filter((t) => isOverdue(t.deadlineKembali));

  return (
    <>
      <PageHeader title="Kembalikan Barang" subtitle="Catat pengembalian aset yang dipinjam" />

      {terlambat.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" />
          <strong>{terlambat.length} barang</strong> sudah melewati deadline pengembalian!
        </div>
      )}

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>Barang</th><th>Peminjam</th>
              <th>Tgl Pinjam</th><th>Deadline</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {transaksi.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <i className="ti ti-circle-check" style={{ fontSize: 32, color: "var(--color-ok)" }} />
                    Tidak ada barang yang sedang dipinjam
                  </div>
                </td>
              </tr>
            ) : transaksi.map((t) => {
              const late = isOverdue(t.deadlineKembali);
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
                  </td>
                  <td>
                    <div style={{ color: "var(--text-primary)" }}>{t.user.name ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.user.email}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.tanggalPinjam)}</td>
                  <td>
                    <span style={{
                      fontSize: 12,
                      color: late ? "var(--color-err)" : "inherit",
                      fontWeight: late ? 600 : 400,
                    }}>
                      {fDateShort(t.deadlineKembali)}
                      {late && " ⚠"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${late ? "btn-danger" : "btn-success"}`}
                      onClick={() => handleKembali(t.id)}
                      disabled={loading === t.id}
                    >
                      {loading === t.id
                        ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</>
                        : <><i className="ti ti-arrow-bar-to-up" />Kembalikan</>
                      }
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
