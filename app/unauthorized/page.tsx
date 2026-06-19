// app/unauthorized/page.tsx
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="ds-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="auth-wrapper">
        <div className="glass status-card">
          <i className="ti ti-lock status-icon status-icon-err" />
          <h2 className="status-heading">Akses Ditolak</h2>
          <p className="status-text">
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
