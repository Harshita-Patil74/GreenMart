import { Link, useLocation } from "react-router-dom";

const links = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Farmers", path: "/farmers" },
  { label: "Contact", path: "/contact" },
];

export default function PublicNavigation({ onNavigate, className = "" }) {
  const location = useLocation();

  return (
    <nav aria-label="Main navigation" className={className}>
      {links.map(({ label, path }) => {
        const active = path === "/"
          ? location.pathname === path
          : location.pathname === path || location.pathname.startsWith(`${path}/`);
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`transition-colors ${active ? "font-semibold text-primary" : "text-[#4B5563] hover:text-primary"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
