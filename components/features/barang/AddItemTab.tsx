// components/features/barang/AddItemTab.tsx
"use client";
import { useState } from "react";
import ScanRegisterSection from "./ScanRegisterSection";
import ManualAddSection from "./ManualAddSection";
import ImportSection from "./ImportSection";

type AddMode = "scan" | "manual" | "import";

const ADD_MODES = [
  { key: "scan" as AddMode, icon: "ti-qrcode", label: "Scan QR" },
  { key: "manual" as AddMode, icon: "ti-forms", label: "Manual Input" },
  { key: "import" as AddMode, icon: "ti-file-upload", label: "Import CSV" },
];

/** Sub-tab orchestrator for the "Add Item" tab */
export default function AddItemTab() {
  const [addMode, setAddMode] = useState<AddMode>("manual");

  return (
    <>
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {ADD_MODES.map(m => {
          const active = addMode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setAddMode(m.key)}
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
              <i className={`ti ${m.icon}`} style={{ opacity: active ? 1 : 0.6 }} />
              {m.label}
            </button>
          );
        })}
      </div>

      {addMode === "scan" && <ScanRegisterSection />}
      {addMode === "manual" && <ManualAddSection />}
      {addMode === "import" && <ImportSection />}
    </>
  );
}
