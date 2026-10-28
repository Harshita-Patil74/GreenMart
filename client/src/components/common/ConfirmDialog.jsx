import React from "react";
export default function ConfirmDialog({ open, onConfirm, onCancel, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card rounded-card p-6 max-w-sm">
        <p className="mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 h-9 border border-border rounded-btn">Cancel</button>
          <button onClick={onConfirm} className="px-4 h-9 bg-primary text-white rounded-btn">Confirm</button>
        </div>
      </div>
    </div>
  );
}
