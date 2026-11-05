import React from "react";
export default function Button({ children, variant="filled", className="", ...props }) {
  const base = "h-10 px-4 rounded-[8px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition focus:outline-none focus:ring-2 focus:ring-[#245C3A]/30";
  const styles = variant === "filled" ? "bg-[#245C3A] text-white hover:bg-[#1E4A30]" : variant === "outline" ? "border border-[#245C3A]/30 text-[#245C3A] hover:bg-[#EAF2E7]" : "bg-[#FAF8F1] border border-[#E2E6DF] text-[#26352B]";
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}
