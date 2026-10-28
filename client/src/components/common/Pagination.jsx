import React from "react";
export default function Pagination({ page, pages, onChange }) {
  return (
    <div className="flex gap-2 justify-center mt-6">
      {Array.from({ length: pages }, (_, i) => i+1).map(p => (
        <button key={p} onClick={() => onChange(p)} className={`px-3 h-8 rounded-btn border ${p===page ? "bg-primary text-white border-primary" : "border-border"}`}>{p}</button>
      ))}
    </div>
  );
}
