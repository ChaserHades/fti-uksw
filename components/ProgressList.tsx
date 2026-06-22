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
          <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
