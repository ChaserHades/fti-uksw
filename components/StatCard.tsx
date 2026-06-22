import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  delta?: string;
  badge?: string;
  badgeClass?: string;
  valueStyle?: React.CSSProperties;
}

export default function StatCard({ label, value, icon, iconColor = "var(--ds-mist)", delta, badge, badgeClass = "badge-info", valueStyle }: StatCardProps) {
  return (
    <div className="glass stat-card">
      <div className="stat-card-header">
        <span className="section-label">{label}</span>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: iconColor }} />
      </div>
      <div className="stat-value" style={valueStyle}>{value}</div>
      {(delta || badge) && (
        <div className="stat-card-footer">
          {delta && <span className="stat-delta">{delta}</span>}
          {badge && <span className={`badge ${badgeClass}`}>{badge}</span>}
        </div>
      )}
    </div>
  );
}
