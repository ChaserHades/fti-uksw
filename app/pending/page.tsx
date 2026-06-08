// app/pending/page.tsx
import Link from "next/link";
import { logoutAction } from "@/actions/auth";

export default function PendingPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass" style={{ padding: 40, textAlign: "center", maxWidth: 420, width: "100%" }}>
          <i className="ti ti-clock" style={{ fontSize: 48, color: "var(--color-warn)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Menunggu Verifikasi</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Akun kamu sedang dalam proses verifikasi oleh Admin. Silakan cek kembali setelah beberapa saat.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost" style={{ justifyContent: "center", width: "100%" }}>
              <i className="ti ti-logout" /> Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
