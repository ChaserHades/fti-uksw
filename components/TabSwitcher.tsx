// components/TabSwitcher.tsx
"use client";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/**
 * Reusable pill-style tab switcher used across manajemen pages.
 * Renders a horizontal row of tab buttons with icon + label.
 */
export default function TabSwitcher({ tabs, activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div
      className="mode-switcher mobile-scroll-x"
      style={{
        display: "flex",
        gap: "4px",
        margin: 0,
        padding: "6px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {tabs.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: active ? 600 : 500,
              color: active ? "#FFF" : "var(--text-secondary)",
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              border: "1px solid",
              borderColor: active ? "rgba(255,255,255,0.1)" : "transparent",
              boxShadow: active
                ? "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                : "none",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: "16px", opacity: active ? 1 : 0.7 }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
