import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/", label = "Back" }) {
  const navigate = useNavigate();
  const onClick = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" aria-label={label}>
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
