import React from "react";

export interface ProgressItemData {
  label: string;
  val: number | string;
  color: string;
  pct: number; // percentage (0-100)
}

interface ProgressListProps {
  items: ProgressItemData[];
  className?: string;
}

export default function ProgressList({ items, className = "" }: ProgressListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className={className}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>
              {item.val} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({item.pct}%)</span>
            </span>
          </div>
          <div style={{ height: 8, background: "rgba(255, 255, 255, 0.05)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.05)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
            <div style={{ 
              height: "100%", width: `${item.pct}%`, 
              background: `linear-gradient(90deg, ${item.color}80, ${item.color})`, 
              borderRadius: 10,
              boxShadow: `0 0 10px ${item.color}40`,
              transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
