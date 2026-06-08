// app/rejected/page.tsx
import { logoutAction } from "@/actions/auth";

export default function RejectedPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass" style={{ padding: 40, textAlign: "center", maxWidth: 420, width: "100%" }}>
          <i className="ti ti-user-x" style={{ fontSize: 48, color: "var(--color-err)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Pendaftaran Ditolak</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Maaf, pendaftaran akun kamu tidak disetujui oleh Admin. Hubungi admin FTI untuk informasi lebih lanjut.
          </p>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost" style={{ justifyContent: "center", width: "100%" }}>
              <i className="ti ti-logout" /> Kembali ke Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
