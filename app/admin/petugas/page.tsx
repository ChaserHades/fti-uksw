"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { fDateShort } from "@/helpers/format";
import { api } from "@/helpers/api";
import type { User } from "@/types";

export default function PetugasPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api
      .get<User[]>("/api/users")
      .then((data) =>
        setUsers(data.filter((u) => u.role === "PETUGAS" || u.role === "UNIVERSITAS"))
      )
      .catch(console.error);
  }, []);

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warn", APPROVED: "badge-ok", REJECTED: "badge-danger",
  };
  const roleBadge: Record<string, string> = {
    PETUGAS: "badge-info", UNIVERSITAS: "badge-muted",
  };

  const approved = users.filter((u) => u.statusVerifikasi === "APPROVED").length;
  const pending  = users.filter((u) => u.statusVerifikasi === "PENDING").length;

  return (
    <>
      <PageHeader title="Daftar Petugas & Universitas" subtitle="Seluruh pengguna non-admin">
        <div className="action-row">
          <span className="badge badge-ok">{approved} Aktif</span>
          {pending > 0 && <span className="badge badge-warn">{pending} Pending</span>}
        </div>
      </PageHeader>

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>#</th><th>Nama</th><th>Email</th>
              <th>Role</th><th>Status</th><th>Bergabung</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <i className="ti ti-users" style={{ fontSize: 28 }} />
                    Belum ada pengguna terdaftar
                  </div>
                </td>
              </tr>
            ) : users.map((u, i) => (
              <tr key={u.id}>
                <td className="td-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td className="td-name">{u.name ?? "—"}</td>
                <td className="td-mono td-sm">{u.email}</td>
                <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                <td>
                  <span className={`badge ${statusBadge[u.statusVerifikasi]}`}>
                    {u.statusVerifikasi}
                  </span>
                </td>
                <td className="td-sm">{fDateShort(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
