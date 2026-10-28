import React from "react";
export default function QuantityStepper({ value, onChange }) {
  return (
    <div className="flex items-center border border-border rounded-btn overflow-hidden">
      <button className="px-3 h-8" onClick={() => onChange(Math.max(1, value-1))}>−</button>
      <span className="px-3">{value}</span>
      <button className="px-3 h-8" onClick={() => onChange(value+1)}>+</button>
    </div>
  );
}
