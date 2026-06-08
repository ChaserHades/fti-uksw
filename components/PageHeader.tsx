// components/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="section-header" style={{ marginBottom: 24 }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{children}</div>}
    </div>
  );
}
