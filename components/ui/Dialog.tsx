"use client";

import { useEffect } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, children, className = "" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        className={`w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="dialog-title" className="text-center text-xl font-semibold text-gray-900">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
