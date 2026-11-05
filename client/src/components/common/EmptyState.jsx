import React from "react";
export default function EmptyState({ text, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && <span className="mb-3 text-4xl text-muted">{icon}</span>}
      <p className="text-sm text-[#68756B]">{text}</p>
    </div>
  );
}
