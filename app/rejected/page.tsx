// app/rejected/page.tsx
import { logoutAction } from "@/actions/auth";

export default function RejectedPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass status-card">
          <i className="ti ti-user-x status-icon status-icon-err" />
          <h2 className="status-heading">Pendaftaran Ditolak</h2>
          <p className="status-text">
            Maaf, pendaftaran akun kamu tidak disetujui oleh Admin. Hubungi admin FTI untuk informasi lebih lanjut.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-full">
              <i className="ti ti-logout" /> Kembali ke Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
