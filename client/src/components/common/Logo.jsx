import React from "react";
import { Link } from "react-router-dom";

const logoImages = {
  full: "/images/greenmart-logo.png",
  compact: "/images/greenmart-logo-compact.png",
  dashboard: "/images/greenmart-dashboard-logo.png",
};

const logoSizes = {
  sm: { full: "w-[150px]", compact: "w-[132px]" },
  md: { full: "w-[230px]", compact: "w-[150px]" },
  lg: { full: "w-[270px]", compact: "w-[175px]" },
};

export default function Logo({ subtitle = true, dashboard = false, className = "", size = "md", to = "/" }) {
  const variant = dashboard ? "dashboard" : subtitle ? "full" : "compact";
  const image = (
    <img
      src={logoImages[variant]}
      alt="GreenMart — Organic Products E-Commerce Platform"
      className={`block h-auto max-w-full object-contain ${dashboard ? "w-[150px]" : logoSizes[size]?.[variant] || logoSizes.md[variant]} ${className}`}
    />
  );
  const brand = image;

  if (to) {
    return <Link to={to} className="inline-flex shrink-0 transition-opacity hover:opacity-95">{brand}</Link>;
  }
  return brand;
}
