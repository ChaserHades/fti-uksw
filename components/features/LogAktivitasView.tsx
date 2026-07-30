"use client";
import { useEffect, useState } from "react";
import { api } from "@/helpers/api";
import { fDateTime } from "@/helpers/format";

type AksiLog = "CREATE" | "UPDATE" | "DELETE" | "IMPORT";

interface LogAktivitas {
  id: string;
  aksi: AksiLog;
  entitas: string;
  detail: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    role: string;
  };
}

export default function LogAktivitasView() {
  const [logs, setLogs] = useState<LogAktivitas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LogAktivitas[]>("/api/log")
      .then(res => setLogs(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function getAksiBadge(aksi: AksiLog) {
    switch (aksi) {
      case "CREATE": return <span className="badge badge-ok">Create</span>;
      case "UPDATE": return <span className="badge badge-info">Update</span>;
      case "DELETE": return <span className="badge badge-danger">Delete</span>;
      case "IMPORT": return <span className="badge badge-warn">Import</span>;
      default: return <span className="badge">{aksi}</span>;
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
      <div className="glass" style={{ overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Waktu</th>
                <th style={{ width: "20%" }}>Pengguna</th>
                <th style={{ width: "15%" }}>Aksi</th>
                <th style={{ width: "15%" }}>Entitas</th>
                <th style={{ width: "30%" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <i className="ti ti-activity" style={{ fontSize: 28 }} />
                      Belum ada data aktivitas
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="td-sm">{fDateTime(log.createdAt)}</td>
                    <td>
                      <div className="td-sm" style={{ color: "var(--text-primary)" }}>{log.user.name || "Unknown"}</div>
                      <div className="td-code">{log.user.role}</div>
                    </td>
                    <td>{getAksiBadge(log.aksi)}</td>
                    <td><div className="td-code">{log.entitas}</div></td>
                    <td className="td-sm" style={{ whiteSpace: "normal", color: "var(--text-secondary)" }}>
                      {log.detail}
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
