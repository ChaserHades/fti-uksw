// app/admin/tim/page.tsx
"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import { verifikasiUserAction } from "@/actions/verifikasi";
import LiquidWrapper from "@/components/LiquidWrapper";
import LiquidSelect from "@/components/LiquidSelect";
import ConfirmModal from "@/components/ConfirmModal";
import Modal from "@/components/Modal";
import type { User } from "@/types";

type Tab = "anggota" | "verifikasi";
type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function TimVerifikasiPage() {
  const [tab, setTab]           = useState<Tab>("anggota");
  const [users, setUsers]       = useState<User[]>([]);
  const [filter, setFilter]     = useState<FilterStatus>("PENDING");
  const [loading, setLoading]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch]     = useState("");
  const [cursor, setCursor]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // User Edit Modal State
  const [editModal, setEditModal] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // State untuk menyimpan password hasil reset agar tampil di tabel
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  // Custom Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    danger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false, title: "", message: "", danger: false, onConfirm: () => {}
  });

  const load = useCallback((reset = true) => {
    const cur = reset ? null : cursor;
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (cur) params.set("cursor", cur);

    if (!reset) setLoadingMore(true);
    api.get<{ data: User[]; nextCursor: string | null }>(`/api/users?${params}`)
      .then(res => {
        if (reset) setUsers(res.data);
        else setUsers(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, cursor]);

  useEffect(() => { load(true); }, [search]);

  async function handleAction(userId: string, action: "APPROVE" | "REJECT") {
    setLoading(userId);
    startTransition(async () => {
      const result = await verifikasiUserAction(userId, action);
      if (result.success) {
        toast.success(result.message);
        await load();
      } else {
        toast.error(result.message);
      }
      setLoading(null);
    });
  }

  function handleDeleteUser(id: string, name: string) {
    setConfirmConfig({
      isOpen: true,
      title: "Hapus User",
      message: `Apakah Anda yakin ingin menghapus permanen akun user "${name}"?`,
      danger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/api/users/${id}`);
          toast.success("User berhasil dihapus.");
          load();
        } catch (e: any) {
          toast.error(e.message || "Gagal menghapus user");
        }
      }
    });
  }

  function handleResetPassword(id: string, name: string) {
    setConfirmConfig({
      isOpen: true,
      title: "Force Reset Password",
      message: `User "${name}" akan dipaksa mengganti password saat login berikutnya. Lanjutkan?`,
      danger: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await api.post<{message: string, newPassword: string}>(`/api/users/${id}/reset-password`, {});
          toast.success("Password direset. Salin dari tabel.");
          setResetPasswords(prev => ({ ...prev, [id]: res.newPassword }));
          load();
        } catch (e: any) {
          toast.error(e.message || "Gagal mereset password");
        }
      }
    });
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editModal) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email"),
      role: fd.get("role"),
      statusVerifikasi: fd.get("statusVerifikasi")
    };
    try {
      await api.put(`/api/users/${editModal.id}`, body);
      toast.success("Data user diperbarui");
      setEditModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengupdate user");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = users.filter(u => u.statusVerifikasi === "PENDING").length;
  const approvedUsers = users.filter(u => u.statusVerifikasi === "APPROVED" && u.role !== "ADMIN");
  const filteredVerifikasi = filter === "ALL"
    ? users
    : users.filter(u => u.statusVerifikasi === filter);

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warn", APPROVED: "badge-ok", REJECTED: "badge-danger",
  };
  const roleBadge: Record<string, string> = {
    ADMIN: "badge-danger", TEKNISI: "badge-info", UNIVERSITAS: "badge-muted",
  };

  return (
    <>
      <PageHeader title="Tim & Verifikasi" subtitle="Kelola anggota tim dan verifikasi user baru">
        {pendingCount > 0 && (
          <button
            className={`btn ${tab === "verifikasi" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setTab("verifikasi")}
          >
            <i className="ti ti-alert-circle" />
            Perlu Diverifikasi
            <span className="badge badge-danger" style={{ marginLeft: 4, padding: "2px 8px", fontSize: 11 }}>{pendingCount}</span>
          </button>
        )}
      </PageHeader>

      {/* Tab Switcher */}
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {([
          { key: "anggota" as Tab,     icon: "ti-users",      label: "Anggota Aktif" },
          { key: "verifikasi" as Tab,  icon: "ti-user-check", label: `Verifikasi ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
        ]).map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                background: "transparent", color: active ? "#FFF" : "var(--text-secondary)",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                marginBottom: "-1px"
              }}
            >
              <i className={`ti ${t.icon}`} style={{ opacity: active ? 1 : 0.6 }} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Anggota Aktif */}
      {tab === "anggota" && (
        <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>
          {/* Top Header / Primary Actions */}
          <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
            <div className="search-wrap" style={{ flex: "1 1 300px", minWidth: 250, margin: 0 }}>
              <i className="ti ti-search search-icon" />
              <input
                className="input"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>No</th><th>Nama</th><th>Email</th>
                  <th>Role</th><th>Bergabung</th><th>Status Password</th><th style={{ width: "15%" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <i className="ti ti-users" style={{ fontSize: 30 }} />
                        Belum ada anggota aktif
                      </div>
                    </td>
                  </tr>
                ) : approvedUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td className="td-sm text-muted">{i + 1}</td>
                    <td className="td-name">{u.name ?? ""}</td>
                    <td className="td-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                    <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                    <td className="td-sm">{fDateShort(u.createdAt)}</td>
                    <td>
                      {u.mustChangePassword ? (
                        resetPasswords[u.id] ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={{ background: "var(--ds-gray-800)", padding: "2px 6px", borderRadius: 4, color: "var(--ds-gray-200)" }}>{resetPasswords[u.id]}</code>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              navigator.clipboard.writeText(resetPasswords[u.id]);
                              toast.success("Tersalin!");
                            }} style={{ padding: "4px 8px" }} title="Salin">
                              <i className="ti ti-copy" />
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-warn">Menunggu Diganti</span>
                        )
                      ) : (
                        <span className="badge badge-ok"><i className="ti ti-check" /> Aman</span>
                      )}
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditModal(u)} title="Edit User">
                          <i className="ti ti-edit" />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleResetPassword(u.id, u.name ?? "")} title="Force Reset Password">
                          <i className="ti ti-key" />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteUser(u.id, u.name ?? "")} title="Hapus User">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cursor && (
            <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button className="btn btn-ghost" onClick={() => load(false)} disabled={loadingMore}>
                {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Verifikasi */}
      {tab === "verifikasi" && (
        <>
          {pendingCount > 0 && filter === "PENDING" && (
            <div className="alert alert-warn mb-16">
              <i className="ti ti-alert-triangle" /> Ada {pendingCount} user menunggu verifikasi
            </div>
          )}

          <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>
            {/* Top Header / Primary Actions */}
            <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ width: 180, margin: 0 }}>
                <LiquidSelect
                  value={filter}
                  onChange={val => setFilter(val as FilterStatus)}
                  options={[
                    { value: "PENDING", label: `Pending (${pendingCount})` },
                    { value: "APPROVED", label: "Approved" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "ALL", label: "Semua" }
                  ]}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "6%" }}>No</th><th>Nama</th><th>Email</th><th>Role</th>
                    <th>Status</th><th>Tgl Daftar</th><th style={{ width: "15%" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerifikasi.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <i className="ti ti-users-minus" style={{ fontSize: 30 }} />
                          Tidak ada user {filter !== "ALL" ? filter.toLowerCase() : ""}
                        </div>
                      </td>
                    </tr>
                  ) : filteredVerifikasi.map((u, i) => {
                    const isProcessing = loading === u.id;
                    return (
                      <tr key={u.id}>
                        <td className="td-sm text-muted">{i + 1}</td>
                        <td className="td-name">{u.name ?? ""}</td>
                        <td className="td-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                        <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                        <td><span className={`badge ${statusBadge[u.statusVerifikasi]}`}>{u.statusVerifikasi}</span></td>
                        <td className="td-sm">{fDateShort(u.createdAt)}</td>
                        <td>
                          {u.statusVerifikasi === "PENDING" ? (
                            <div className="action-row">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAction(u.id, "APPROVE")}
                                disabled={isProcessing || isPending}
                              >
                                {isProcessing ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <i className="ti ti-check" />}
                                Setujui
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleAction(u.id, "REJECT")}
                                disabled={isProcessing || isPending}
                              >
                                {isProcessing ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <i className="ti ti-x" />}
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada tim</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL EDIT USER */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit User: ${editModal?.name}`}>
        <form onSubmit={handleSaveEdit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama</label>
              <input name="name" type="text" className="input" defaultValue={editModal?.name || ""} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="input" defaultValue={editModal?.email} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <LiquidSelect
                value={editModal?.role || ""}
                onChange={val => setEditModal(prev => prev ? { ...prev, role: val as any } : null)}
                options={[
                  { value: "ADMIN", label: "ADMIN" },
                  { value: "TEKNISI", label: "TEKNISI" },
                  { value: "UNIVERSITAS", label: "UNIVERSITAS" }
                ]}
              />
              <input type="hidden" name="role" value={editModal?.role} />
            </div>
            <div className="form-group">
              <label className="form-label">Status Verifikasi</label>
              <LiquidSelect
                value={editModal?.statusVerifikasi || ""}
                onChange={val => setEditModal(prev => prev ? { ...prev, statusVerifikasi: val as any } : null)}
                options={[
                  { value: "APPROVED", label: "APPROVED" },
                  { value: "PENDING", label: "PENDING" },
                  { value: "REJECTED", label: "REJECTED" }
                ]}
              />
              <input type="hidden" name="statusVerifikasi" value={editModal?.statusVerifikasi} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner spinner-sm" /> : <i className="ti ti-device-floppy" />} Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
