import React from "react";
export default function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <input className="h-11 rounded-input border border-border px-3 bg-[#F7F8F8] placeholder:text-muted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" {...props} />
    </div>
  );
}
