// components/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  delta?: string;
  badge?: string;
  badgeClass?: string;
}

export default function StatCard({ label, value, icon, delta, badge, badgeClass = "badge-info" }: StatCardProps) {
  return (
    <div className="glass stat-card">
      <div className="stat-card-header">
        <span className="section-label">{label}</span>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: "var(--ds-mist)" }} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-card-footer">
        {delta && <span className="stat-delta">{delta}</span>}
        {badge && <span className={`badge ${badgeClass}`}>{badge}</span>}
      </div>
    </div>
  );
}
