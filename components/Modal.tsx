// components/Modal.tsx
"use client";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal-title">
          <span>{title}</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ flexShrink: 0 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
