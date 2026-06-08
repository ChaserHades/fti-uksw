// app/petugas/pinjam/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang } from "@/types";

export default function PinjamPage() {
  const router = useRouter();
  const [barang, setBarang] = useState<Barang[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm]     = useState({ barangId: "", deadlineKembali: "", catatan: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<Barang[]>(`/api/barang?search=${encodeURIComponent(search)}`)
      .then((d) => setBarang(d.filter((b) => b.status === "TERSEDIA")))
      .catch(console.error);
  }, [search]);

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Minimum deadline: besok
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.barangId)         { toast.error("Pilih barang terlebih dahulu"); return; }
    if (!form.deadlineKembali)  { toast.error("Tentukan deadline pengembalian"); return; }

    setLoading(true);
    try {
      await api.post("/api/transaksi", form);
      toast.success("Peminjaman berhasil dicatat!");
      router.push("/petugas/dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal meminjam");
    } finally { setLoading(false); }
  }

  // Barang yang dipilih
  const selectedBarang = barang.find((b) => b.id === form.barangId);

  return (
    <>
      <PageHeader title="Form Peminjaman" subtitle="Catat peminjaman aset baru" />

      <div style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          {/* Cari barang */}
          <div className="glass" style={{ padding: "20px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>
              1. Pilih Barang
            </div>
            <div className="form-group">
              <label className="form-label">Cari nama barang</label>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }} />
                <input
                  className="input" style={{ paddingLeft: 36 }}
                  placeholder="Ketik nama barang…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Barang tersedia</label>
              <select
                className="select"
                value={form.barangId}
                onChange={(e) => setF("barangId", e.target.value)}
                required
              >
                <option value="">— Pilih barang —</option>
                {barang.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.kodeBarang}] {b.nama} — {b.kategori.nama}
                  </option>
                ))}
              </select>
              {search && barang.length === 0 && (
                <p className="form-error">Tidak ada barang tersedia dengan kata kunci tersebut</p>
              )}
            </div>

            {/* Preview barang terpilih */}
            {selectedBarang && (
              <div className="alert alert-info" style={{ marginTop: 12 }}>
                <i className="ti ti-box" />
                <div>
                  <div style={{ fontWeight: 500 }}>{selectedBarang.nama}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Kondisi: {selectedBarang.kondisi.replace("_", " ")} ·
                    Jumlah: {selectedBarang.jumlah} ·
                    Kategori: {selectedBarang.kategori.nama}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail peminjaman */}
          <div className="glass" style={{ padding: "20px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>
              2. Detail Peminjaman
            </div>
            <div className="form-group">
              <label className="form-label">Deadline Pengembalian *</label>
              <input
                type="date"
                className="input"
                min={minDateStr}
                value={form.deadlineKembali}
                onChange={(e) => setF("deadlineKembali", e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catatan / Keperluan</label>
              <input
                className="input"
                placeholder="Untuk keperluan apa? (opsional)"
                value={form.catatan}
                onChange={(e) => setF("catatan", e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><div className="spinner" />Memproses…</>
                : <><i className="ti ti-check" />Konfirmasi Pinjam</>
              }
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
