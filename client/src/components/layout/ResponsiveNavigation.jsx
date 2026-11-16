import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Menu, X, User as UserIconLucide, LogOut as LogOutIconLucide, LogIn as LogInIconLucide, Home, Shop, Tag, LayoutDashboard, Package, ShoppingBag, ShoppingCart, Heart, Truck, Mail, Bell, User, Settings, Boxes, Tractor, MessageCircle, BarChart3, Users, Store } from "lucide-react";
import { fadeVariants } from "../../animations/variants.js";
import Logo from "../common/Logo.jsx";
import { logout } from "../../features/auth/authSlice.js";
import RoleNavigation from "./RoleNavigation.jsx";
import getImageUrl from "../../utils/imageUrl.js";

const ICON_MAP = {
  home: Home,
  shop: Shop,
  tag: Tag,
  "layout-dashboard": LayoutDashboard,
  package: Package,
  "shopping-cart": ShoppingCart,
  heart: Heart,
  truck: Truck,
  mail: Mail,
  user: User,
  bell: Bell,
  settings: Settings,
  boxes: Boxes,
  tractor: Tractor,
  "message-circle": MessageCircle,
  "bar-chart-3": BarChart3,
  users: Users,
  store: Store,
};

const navigationByRole = {
  customer: [
    { label: "Home", path: "/", icon: Home },
    { label: "Shop", path: "/shop", icon: Shop },
    { label: "Offers", path: "/shop?offers=true", icon: Tag },
    { label: "About", path: "/about", icon: MessageCircle },
    { label: "Farmers", path: "/farmers", icon: Tractor },
    { label: "Contact", path: "/contact", icon: MessageCircle },
    { label: "Customer Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "My Orders", path: "/customer/orders", icon: Package },
    { label: "Cart", path: "/cart", icon: ShoppingCart },
    { label: "Wishlist", path: "/customer/wishlist", icon: Heart },
    { label: "Track Order", path: "/track-order", icon: Truck },
    { label: "My Newsletters", path: "/customer/newsletters", icon: Mail },
    { label: "Profile", path: "/customer/profile", icon: User },
    { label: "Notifications", path: "/notifications", icon: Bell },
  ],
  farmer: [
    { label: "Customer Home", path: "/", icon: Home },
    { label: "Farmer Dashboard", path: "/farmer/dashboard", icon: LayoutDashboard },
    { label: "My Products", path: "/farmer/products", icon: Package },
    { label: "Add Product", path: "/farmer/products/new", icon: Package },
    { label: "Inventory", path: "/farmer/inventory-management", icon: Boxes },
    { label: "My Orders", path: "/farmer/orders", icon: ShoppingBag },
    { label: "My Offers", path: "/farmer/offers", icon: Tag },
    { label: "Farm Details", path: "/farmer/profile", icon: User },
    { label: "Notifications", path: "/farmer/notifications", icon: Bell },
    { label: "Profile", path: "/farmer/profile", icon: User },
  ],
  admin: [
    { label: "Customer Home", path: "/", icon: Home },
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Products Management", path: "/admin/products", icon: Package },
    { label: "Orders Management", path: "/admin/orders", icon: ShoppingBag },
    { label: "Users Management", path: "/admin/users", icon: Users },
    { label: "Farmer Management", path: "/admin/farmers", icon: Tractor },
    { label: "Inventory Management", path: "/admin/inventory", icon: Boxes },
    { label: "Offers Management", path: "/admin/offers", icon: Tag },
    { label: "Newsletter Management", path: "/admin/newsletter", icon: Mail },
    { label: "Reports and Analytics", path: "/admin/reports", icon: BarChart3 },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Notifications", path: "/admin/notifications", icon: Bell },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ],
  guest: [
    { label: "Home", path: "/", icon: Home },
    { label: "Shop", path: "/shop", icon: Shop },
    { label: "About", path: "/about", icon: MessageCircle },
    { label: "Contact", path: "/contact", icon: MessageCircle },
  ],
};

const roleLabels = {
  customer: "Customer",
  farmer: "Farmer",
  admin: "Administrator",
  guest: "Guest",
};

export default function ResponsiveNavigation({
  type = "public",
  className = "",
  onNavigate,
}) {
  const { user, token } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const role = user?.role || "guest";
  const isAuthenticated = Boolean(user && token && token !== "demo-token");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const drawerRef = useRef(null);

  const roleItems = navigationByRole[role] || navigationByRole.guest;

  const handleLogout = () => {
    dispatch(logout());
    setDrawerOpen(false);
    if (onNavigate) onNavigate();
  };

  const closeDrawer = () => setDrawerOpen(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  // Body scroll lock when drawer is open
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Hamburger toggle button - shown on mobile/tablet */}
      <button
        type="button"
        aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={drawerOpen}
        aria-controls="responsive-navigation-drawer"
        onClick={() => setDrawerOpen((prev) => !prev)}
        className={`inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[#4B5563] hover:bg-gray-50 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className}`}
      >
        {drawerOpen ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Menu aria-hidden="true" className="h-5 w-5" />
        )}
      </button>

      {/* Desktop sidebar collapse toggle - shown on desktop for dashboard */}
      {type === "dashboard" && (
        <button
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          onClick={toggleSidebar}
          className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[#4B5563] hover:bg-gray-50 hidden lg:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {sidebarCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          )}
        </button>
      )}

      {/* Mobile navigation drawer */}
      <motion.div
        initial={{ opacity: 0, x: "-100%" }}
        animate={drawerOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: "-100%" }}
        exit={{ opacity: 0, x: "-100%" }}
        transition={{ duration: 0.2 }}
        className={`fixed inset-y-0 left-0 z-50 flex h-[100vh] h-[100dvh] w-[min(280px,85vw)] max-w-[85vw] flex-col overflow-y-auto lg:hidden ${
          drawerOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={drawerOpen ? { opacity: 1 } : { opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeDrawer}
          aria-hidden={!drawerOpen}
        />

        <motion.aside
          ref={drawerRef}
          id="responsive-navigation-drawer"
          role="dialog"
          aria-modal={drawerOpen ? "true" : undefined}
          aria-hidden={!drawerOpen}
          aria-label={`${roleLabels[role]} navigation`}
          variants={{
            hidden: { opacity: 0, x: "-100%", pointerEvents: "none" },
            visible: { opacity: 1, x: 0, pointerEvents: "auto" },
          }}
          initial={drawerOpen ? "visible" : "hidden"}
          animate={drawerOpen ? "visible" : "hidden"}
          exit={{ opacity: 0, x: "-100%", transition: { duration: 0.2 } }}
          className="flex h-full w-full flex-col overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          {/* Header with user info */}
          <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-gray-100 px-4 bg-white">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-mint border border-emerald-200 flex items-center justify-center flex-shrink-0">
                {user?.avatar ? (
                  <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIconLucide aria-hidden="true" className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 truncate">{user?.name || "Guest"}</div>
                <div className="text-[9px] text-gray-500 capitalize truncate">{roleLabels[role]}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav aria-label={`${roleLabels[role]} navigation`} className="flex-1 overflow-y-auto px-3">
            {roleItems.map(({ label, path, icon: Icon }) => {
              const active = isCurrentPath(pathname, window.location.search, path);
              return (
                <Link
                  key={`${label}:${path}`}
                  to={path}
                  onClick={closeDrawer}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    active ? "bg-[#08764B] text-white" : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout (authenticated) */}
          {isAuthenticated && (
            <div className="px-4 py-4 border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <LogOutIconLucide aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">Logout</span>
              </button>
            </div>
          )}

          {/* Login/Register (guest) */}
          {!isAuthenticated && (
            <div className="px-4 py-4 border-t border-gray-100 bg-white">
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={closeDrawer}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white bg-[#064B35] hover:bg-[#08764B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span>Login</span>
                  <LogInIconLucide aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                </Link>
                <Link
                  to="/register"
                  onClick={closeDrawer}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span>Register</span>
                  <UserIconLucide aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          )}
        </motion.aside>
      </motion.div>

      {/* Desktop sidebar - shown on lg+ */}
      {type === "dashboard" && (
        <motion.aside
          variants={{
            hidden: { width: 0, opacity: 0 },
            visible: { width: sidebarCollapsed ? 72 : 192, opacity: 1 },
          }}
          initial={sidebarCollapsed ? { width: 72, opacity: 1 } : { width: 192, opacity: 1 }}
          animate={sidebarCollapsed ? { width: 72, opacity: 1 } : { width: 192, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`hidden min-h-screen shrink-0 flex-col justify-between bg-[#064B35] text-white lg:flex ${className}`}
        >
          <div className={`flex-shrink-0 transition-all duration-200 ${
            sidebarCollapsed ? "w-[72px]" : "w-[192px]"
          }`}>
            <div className="px-5 py-5">
              <Logo dashboard sidebar={false} size="md" />
            </div>
            <RoleNavigation
              role={role}
              onLogout={user ? handleLogout : undefined}
              className="mt-1 space-y-0.5 px-3"
              mobile={false}
              mobileDashboardOnly={false}
            />
          </div>
        </motion.aside>
      )}
    </>
  );
}

function isCurrentPath(pathname, search, path) {
  const [targetPath, targetSearch] = path.split("?");
  const isOffersFilter = new URLSearchParams(search).get("offers") === "true";
  if (targetSearch && !isOffersFilter) return false;
  if (targetPath === "/shop" && !targetSearch && isOffersFilter) return false;
  return targetPath === "/"
    ? pathname === "/"
    : pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}
