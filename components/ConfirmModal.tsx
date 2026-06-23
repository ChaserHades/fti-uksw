"use client";

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  danger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  isLoading = false,
  danger = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={isLoading ? undefined : onCancel} style={{ zIndex: 9999 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3 className="modal-title" style={{ textAlign: "center", color: danger ? "var(--ds-danger-500)" : "inherit" }}>
          {title}
        </h3>
        <div className="modal-body" style={{ textAlign: "center", marginTop: 16, marginBottom: 24, color: "var(--text-secondary)" }}>
          {message}
        </div>
        <div className="modal-footer" style={{ justifyContent: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <div className="spinner spinner-sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
