"use client";
import { useEffect, useRef } from "react";

function XIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showModal === "function") el.showModal();
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  return (
    <dialog ref={ref} className={`modal-panel modal-panel-${size}`} onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="modal-header">
        <h2 className="modal-title">{title}</h2>
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Fechar"
        >
          <XIcon />
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="shrink-0 max-h-[25dvh] overflow-y-auto border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3">{footer}</div>}
    </dialog>
  );
}
