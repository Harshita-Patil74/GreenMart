import React from "react";
export default function Skeleton({ className = "h-4 w-full" }) { return <div className={`animate-pulse bg-border rounded ${className}`} />; }
export function EmptyState({ text }) { return <div className="text-center text-muted py-10">{text}</div>; }
export function Rating({ value = 0, count }) {
  return <div className="flex items-center gap-1 text-sm"><span className="text-star">★</span><span>{Number(value).toFixed(1)}</span>{count !== undefined && <span className="text-muted">({count})</span>}</div>;
}
export function QuantityStepper({ value, onChange }) {
  return (
    <div className="flex items-center border border-border rounded-btn overflow-hidden">
      <button className="px-3 h-8" onClick={() => onChange(Math.max(1, value-1))}>−</button>
      <span className="px-3">{value}</span>
      <button className="px-3 h-8" onClick={() => onChange(value+1)}>+</button>
    </div>
  );
}
export function ImageWithFallback({ src, alt, className }) {
  return <img src={src || "/images/placeholder.svg"} alt={alt} className={className} onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }} />;
}
export function ConfirmDialog({ open, onConfirm, onCancel, message }) {
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
export function Pagination({ page, pages, onChange }) {
  return (
    <div className="flex gap-2 justify-center mt-6">
      {Array.from({ length: pages }, (_, i) => i+1).map(p => (
        <button key={p} onClick={() => onChange(p)} className={`px-3 h-8 rounded-btn border ${p===page ? "bg-primary text-white border-primary" : "border-border"}`}>{p}</button>
      ))}
    </div>
  );
}
export function Loader() { return <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>; }
