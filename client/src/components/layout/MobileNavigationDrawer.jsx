import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { slideLeftVariants, fadeVariants } from "../../animations/variants.js";
import { logout } from "../../features/auth/authSlice.js";
import {
  BarChart3,
  Bell,
  Boxes,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  LogIn,
  Mail,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Tractor,
  Truck,
  User,
  Users,
} from "lucide-react";
import getImageUrl from "../../utils/imageUrl.js";

const navigationByRole = {
  customer: [
    { label: "Home", path: "/", icon: Store },
    { label: "Shop", path: "/shop", icon: Store },
    { label: "Offers", path: "/shop?offers=true", icon: Tag },
    { label: "About", path: "/about", icon: MessageCircle },
    { label: "Farmers", path: "/farmers", icon: Tractor },
    { label: "Contact", path: "/contact", icon: MessageCircle },
    { label: "Customer Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "My Orders", path: "/customer/orders", icon: Package },
    { label: "Cart", path: "/cart", icon: ShoppingCart },
    { label: "Wishlist", path: "/customer/wishlist", icon: Heart },
    { label: "Track Orders", path: "/track-order", icon: Truck },
    { label: "My Newsletters", path: "/customer/newsletters", icon: Mail },
    { label: "Profile", path: "/customer/profile", icon: User },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Settings", path: "/customer/settings", icon: Settings },
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
    { label: "Notifications", path: "/admin/notifications", icon: Bell },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ],
  guest: [
    { label: "Home", path: "/", icon: Store },
    { label: "Shop", path: "/shop", icon: ShoppingBag },
    { label: "About", path: "/about", icon: MessageCircle },
    { label: "Contact", path: "/contact", icon: MessageCircle },
  ],
};

function isCurrentPath(pathname, search, path) {
  const [targetPath, targetSearch] = path.split("?");
  const isOffersFilter = new URLSearchParams(search).get("offers") === "true";
  if (targetSearch && !isOffersFilter) return false;
  if (targetPath === "/shop" && !targetSearch && isOffersFilter) return false;
  return targetPath === "/"
    ? pathname === "/"
    : pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export default function MobileNavigationDrawer({
  open,
  onClose,
  id,
  label,
  drawerRef,
  className = "",
}) {
  const { user, token } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const role = user?.role || "guest";
  const items = navigationByRole[role] || navigationByRole.guest;
  const isAuthenticated = Boolean(user && token && token !== "demo-token");

  const handleLogout = () => {
    dispatch(logout());
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <motion.button
        type="button"
        variants={fadeVariants}
        initial="hidden"
        animate={open ? "visible" : "hidden"}
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-label="Close navigation menu"
        aria-hidden={!open}
        disabled={!open}
        tabIndex={open ? 0 : -1}
      />
      <motion.aside
        ref={drawerRef}
        id={id}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-hidden={!open}
        aria-label={label}
        variants={{
          hidden: { opacity: 0, x: "100%", pointerEvents: "none" },
          visible: { opacity: 1, x: 0, pointerEvents: "auto" },
        }}
        initial={open ? "visible" : "hidden"}
        animate={open ? "visible" : "hidden"}
        exit={{ opacity: 0, x: "100%", transition: { duration: 0.2 } }}
        className={`fixed inset-y-0 left-0 z-50 flex h-[100vh] h-[100dvh] w-[min(280px,85vw)] max-w-[85vw] flex-col overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${className}`}
      >
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-gray-100 px-4 bg-white">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-mint border border-emerald-200 flex items-center justify-center flex-shrink-0">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 truncate">{user?.name || "Guest"}</div>
              <div className="text-[9px] text-gray-500 capitalize truncate">{roleLabels[role]}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="relative inline-block h-[14px] w-[14px]">
              <span className="absolute inset-0 bg-current rounded-sm" />
              <span className="absolute inset-0 bg-current rounded-sm -translate-y-[14px]" />
              <span className="absolute inset-0 bg-current rounded-sm translate-y-[14px]" />
            </span>
          </button>
        </div>

        {isAuthenticated && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-900 uppercase tracking-wider">Quick Navigation</p>
          </div>
        )}

        <nav aria-label={`${role === "guest" ? "Guest" : role} navigation`} className="flex-1 overflow-y-auto">
          {items.map(({ label, path, icon: Icon }) => {
            const active = isCurrentPath(pathname, window.location.search, path);
            return (
              <Link
                key={`${label}:${path}`}
                to={path}
                onClick={onClose}
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

        {isAuthenticated && (
          <div className="px-4 py-4 border-t border-gray-100 bg-white">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Logout</span>
            </button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="px-4 py-4 border-t border-gray-100 bg-white">
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white bg-[#064B35] hover:bg-[#08764B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span>Login</span>
                <LogIn className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span>Register</span>
                <User className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}

const roleLabels = {
  customer: "Customer",
  farmer: "Farmer",
  admin: "Administrator",
  guest: "Guest",
};
