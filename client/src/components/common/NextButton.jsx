import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function NextButton({ to, label = "Next", disabled = false, onClick }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (disabled) return;
    if (onClick) onClick();
    else if (to) navigate(to);
  };
  return (
    <button onClick={handleClick} disabled={disabled} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50" aria-label={label}>
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
