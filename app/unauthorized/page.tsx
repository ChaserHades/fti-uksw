// app/unauthorized/page.tsx
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass" style={{ padding: 40, textAlign: "center", maxWidth: 420, width: "100%" }}>
          <i className="ti ti-lock" style={{ fontSize: 48, color: "var(--color-err)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Akses Ditolak</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Kamu tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
            <i className="ti ti-home" /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
