// components/PageHeader.tsx
import Link from "next/link";

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, backHref, backLabel = "Kembali", children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {backHref && (
          <div style={{ marginBottom: 4 }}>
            <Link href={backHref} style={{ color: "var(--text-muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
              {backLabel}
            </Link>
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}