// app/pending/page.tsx
import { logoutAction } from "@/actions/auth";

export default function PendingPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass status-card">
          <i className="ti ti-clock status-icon status-icon-warn" />
          <h2 className="status-heading">Menunggu Verifikasi</h2>
          <p className="status-text">
            Akun sedang diverifikasi oleh Admin. Cek kembali nanti.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-full">
              <i className="ti ti-logout" /> Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
