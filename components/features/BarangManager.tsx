// components/features/BarangManager.tsx
"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DaftarBarangTab from "./barang/DaftarBarangTab";
import AddItemTab from "./barang/AddItemTab";
import KategoriTab from "./barang/KategoriTab";
import LetakManager from "./LetakManager";

type Tab = "daftar" | "add" | "jenis-barang" | "letak";

/**
 * Root orchestrator for the Barang management section.
 * Renders tab navigation and delegates to focused sub-components.
 */
export default function BarangManager({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") as Tab | null;
  const [tab, setTab] = useState<Tab>(action || "daftar");

  useEffect(() => {
    if (action) setTab(action);
  }, [action]);

  const availableTabs: { key: Tab; icon: string; label: string }[] = [
    { key: "daftar", icon: "ti-list", label: "Daftar Barang" },
  ];
  if (role === "ADMIN") {
    availableTabs.push({ key: "add", icon: "ti-plus", label: "Add Item" });
    availableTabs.push({ key: "jenis-barang", icon: "ti-category", label: "Jenis Barang" });
  }
  if (role === "ADMIN" || role === "TEKNISI") {
    availableTabs.push({ key: "letak", icon: "ti-building", label: "Letak / Ruangan" });
  }

  return (
    <div className="animate-fade-in">
      {/* Tab switcher */}
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {availableTabs.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FFF" : "var(--text-secondary)",
                background: "transparent",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer",
                marginBottom: "-1px", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <i className={`ti ${t.icon}`} style={{ opacity: active ? 1 : 0.6 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "daftar" && <DaftarBarangTab role={role} />}
      {tab === "add" && role === "ADMIN" && <AddItemTab />}
      {tab === "jenis-barang" && role === "ADMIN" && <KategoriTab />}
      {tab === "letak" && (role === "ADMIN" || role === "TEKNISI") && <LetakManager role={role} />}
    </div>
  );
}