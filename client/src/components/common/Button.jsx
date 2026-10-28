import React from "react";
export default function Button({ children, variant="filled", className="", ...props }) {
  const base = "h-10 px-4 rounded-btn font-medium shadow-btn transition focus:outline-none focus:ring-2 focus:ring-primary/30";
  const styles = variant === "filled" ? "bg-primary text-white hover:bg-primary-hover" : variant === "outline" ? "border border-primary text-primary hover:bg-mint" : "bg-white border border-border text-text";
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}
