// app/admin/barang/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang, KategoriBarang, Ruangan } from "@/types";

const EMPTY = {
  kodeBarang: "", nama: "", deskripsi: "", kondisi: "BAIK",
  jumlah: 1, tahunBeli: "", harga: "", kategoriId: "", ruanganId: "",
};

export default function BarangPage() {
  const [barang, setBarang]     = useState<Barang[]>([]);
  const [kategori, setKategori] = useState<KategoriBarang[]>([]);
  const [ruangan, setRuangan]   = useState<Ruangan[]>([]);
  const [search, setSearch]     = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [modal, setModal]       = useState<"form" | "qr" | null>(null);
  const [selected, setSelected] = useState<Barang | null>(null);
  const [form, setForm]         = useState<typeof EMPTY>(EMPTY);
  const [qrData, setQrData]     = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filterKat) p.set("kategoriId", filterKat);
    api.get<Barang[]>(`/api/barang?${p}`).then(setBarang).catch(console.error);
  }, [search, filterKat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<KategoriBarang[]>("/api/kategori").then(setKategori);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan);
  }, []);

  const setF = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd()  { setSelected(null); setForm(EMPTY); setModal("form"); }
  function openEdit(b: Barang) {
    setSelected(b);
    setForm({
      kodeBarang: b.kodeBarang, nama: b.nama, deskripsi: b.deskripsi ?? "",
      kondisi: b.kondisi, jumlah: b.jumlah,
      tahunBeli: b.tahunBeli?.toString() ?? "", harga: b.harga?.toString() ?? "",
      kategoriId: b.kategoriId, ruanganId: b.ruanganId ?? "",
    });
    setModal("form");
  }

  async function openQR(b: Barang) {
    setSelected(b);
    try {
      const data = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${b.id}/qr`);
      setQrData(data);
      setModal("qr");
    } catch { toast.error("Gagal generate QR"); }
  }

  async function handleSave() {
    if (!form.kodeBarang || !form.nama || !form.kategoriId) {
      toast.error("Kode, nama, dan kategori wajib diisi"); return;
    }
    setSaving(true);
    const body = {
      ...form,
      jumlah: Number(form.jumlah),
      tahunBeli: form.tahunBeli ? Number(form.tahunBeli) : null,
      harga: form.harga ? Number(form.harga) : null,
      ruanganId: form.ruanganId || null,
    };
    try {
      if (selected) {
        await api.put(`/api/barang/${selected.id}`, body);
        toast.success("Barang diperbarui");
      } else {
        await api.post("/api/barang", body);
        toast.success("Barang ditambahkan");
      }
      setModal(null); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus barang "${nama}"?`)) return;
    try {
      await api.delete(`/api/barang/${id}`);
      toast.success("Barang dihapus"); load();
    } catch { toast.error("Gagal menghapus"); }
  }

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };
  const statusBadge: Record<string, string> = {
    TERSEDIA: "badge-ok", DIPINJAM: "badge-warn", MAINTENANCE: "badge-muted",
  };

  return (
    <>
      <PageHeader title="Manajemen Barang" subtitle="Kelola inventaris aset FTI UKSW">
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Tambah Barang
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="glass" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }} />
          <input
            className="input" style={{ paddingLeft: 36 }}
            placeholder="Cari nama barang…" value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 200 }} value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th><th>Nama</th><th>Kategori</th>
                <th>Kondisi</th><th>Status</th><th>Jml</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="ti ti-box-off" style={{ fontSize: 30 }} />
                      Tidak ada data barang
                    </div>
                  </td>
                </tr>
              ) : barang.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{b.kodeBarang}</td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</td>
                  <td>{b.kategori.nama}</td>
                  <td><span className={`badge ${kondisiBadge[b.kondisi] ?? "badge-muted"}`}>{b.kondisi.replace("_", " ")}</span></td>
                  <td><span className={`badge ${statusBadge[b.status] ?? "badge-muted"}`}>{b.status}</span></td>
                  <td>{b.jumlah}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openQR(b)} title="QR Code">
                        <i className="ti ti-qrcode" />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Edit">
                        <i className="ti ti-edit" />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(b.id, b.nama)} title="Hapus">
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Barang" : "Tambah Barang"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Kode Barang *</label>
            <input className="input" placeholder="BRG-001" value={form.kodeBarang} onChange={(e) => setF("kodeBarang", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Kondisi</label>
            <select className="select" value={form.kondisi} onChange={(e) => setF("kondisi", e.target.value)}>
              <option value="BAIK">Baik</option>
              <option value="RUSAK_RINGAN">Rusak Ringan</option>
              <option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Barang *</label>
          <input className="input" placeholder="Nama barang" value={form.nama} onChange={(e) => setF("nama", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Kategori *</label>
            <select className="select" value={form.kategoriId} onChange={(e) => setF("kategoriId", e.target.value)}>
              <option value="">— Pilih kategori —</option>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ruangan</label>
            <select className="select" value={form.ruanganId} onChange={(e) => setF("ruanganId", e.target.value)}>
              <option value="">Tidak ada</option>
              {ruangan.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Jumlah</label>
            <input type="number" className="input" min={1} value={form.jumlah} onChange={(e) => setF("jumlah", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tahun Beli</label>
            <input type="number" className="input" placeholder="2024" value={form.tahunBeli} onChange={(e) => setF("tahunBeli", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Harga (Rp)</label>
            <input type="number" className="input" placeholder="0" value={form.harga} onChange={(e) => setF("harga", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={(e) => setF("deskripsi", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={modal === "qr"} onClose={() => setModal(null)} title="QR Code Barang">
        {qrData && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrData.nama}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, fontFamily: "monospace" }}>{qrData.kode}</div>
            <img src={qrData.qrCode} alt="QR" style={{ width: 220, height: 220, borderRadius: 12, margin: "0 auto 20px", display: "block" }} />
            <a href={qrData.qrCode} download={`${qrData.kode}-qr.png`} className="btn btn-primary" style={{ display: "inline-flex" }}>
              <i className="ti ti-download" /> Download PNG
            </a>
          </div>
        )}
      </Modal>
    </>
  );
}
