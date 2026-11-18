import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { navigationByRole, isCurrentPath, roleLabels } from "./navigationConfig.js";

export default function RoleNavigation({
  role = "guest",
  onNavigate,
  onLogout,
  tone = "dark",
  className = "",
  mobile = false,
  mobileDashboardOnly = false,
}) {
  const location = useLocation();
  const roleItems = navigationByRole[role] || navigationByRole.guest;
  const items = mobile && mobileDashboardOnly ? roleItems.slice(0, 1) : roleItems;
  const activeIndex = items.reduce((currentIndex, item, index) => {
    if (!isCurrentPath(location.pathname, location.search, item.path)) return currentIndex;
    if (currentIndex === -1) return index;
    const itemPathLength = item.path.split("?")[0].replace(/\/+$/, "").length;
    const currentPathLength = items[currentIndex].path.split("?")[0].replace(/\/+$/, "").length;
    return itemPathLength > currentPathLength ? index : currentIndex;
  }, -1);
  const isDark = tone === "dark";
  const linkStyle = isDark
    ? "text-white/85 hover:bg-white/10 focus-visible:outline-white"
    : "text-gray-700 hover:bg-emerald-50 focus-visible:outline-primary";
  const activeStyle = isDark ? "bg-[#08764B] font-semibold text-white" : "bg-emerald-50 font-semibold text-primary";

  return (
    <nav aria-label={`${roleLabels[role] || role} navigation`} className={className}>
      {items.map(({ label, path, icon: Icon }, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={`${label}:${path}`}
            to={path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center justify-start gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              mobile ? "h-[50px]" : "h-11"
            } ${
              active ? activeStyle : linkStyle
            }`}
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Icon aria-hidden="true" className="h-full w-full" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        );
      })}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-[10px] px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            mobile ? "h-[50px]" : "h-11"
          } ${linkStyle}`}
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate">Logout</span>
        </button>
      )}
    </nav>
  );
}
