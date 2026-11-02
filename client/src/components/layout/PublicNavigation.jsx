import { Link, useLocation } from "react-router-dom";

const links = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Offers", path: "/shop?offers=true" },
  { label: "About", path: "/about" },
  { label: "Farmers", path: "/farmers" },
  { label: "Contact", path: "/contact" },
];

export default function PublicNavigation({ onNavigate, className = "" }) {
  const location = useLocation();

  return (
    <nav aria-label="Main navigation" className={className}>
      {links.map(({ label, path }) => {
        const targetPath = path.split("?")[0];
        const active = targetPath === "/shop" && path.includes("?")
          ? location.pathname === "/shop" && new URLSearchParams(location.search).get("offers") === "true"
          : targetPath === "/"
          ? location.pathname === targetPath
          : location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);
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
