"use client";

export function SkeletonLine({ w = "100%", h = 14 }: { w?: string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "rgba(119,141,169,0.12)",
      animation: "skeletonPulse 1.4s ease-in-out infinite",
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass stat-card" style={{ gap: 12 }}>
      <SkeletonLine w="60%" h={10} />
      <SkeletonLine w="40%" h={28} />
      <SkeletonLine w="80%" h={10} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 16 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} w={i === 0 ? "30%" : "15%"} h={10} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 16 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} w={j === 0 ? "30%" : "15%"} h={11} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <SkeletonLine w="220px" h={22} />
        <div style={{ marginTop: 6 }}><SkeletonLine w="180px" h={13} /></div>
      </div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="dash-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonTable rows={5} cols={4} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonTable rows={4} cols={2} />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonLine w="200px" h={22} />
          <SkeletonLine w="150px" h={13} />
        </div>
        <SkeletonLine w="120px" h={36} />
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}