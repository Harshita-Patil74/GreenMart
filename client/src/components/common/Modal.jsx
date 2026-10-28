import React from "react";
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-card shadow-card-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
