// components/Modal.tsx
"use client";
import { useEffect, useRef } from "react";

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="modal">
        <div className="modal-title">
          <span>{title}</span>
          <button onClick={onClose} className="modal-close" aria-label="Tutup">
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}