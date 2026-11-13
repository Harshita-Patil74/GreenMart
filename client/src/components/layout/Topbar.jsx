import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ShoppingCart, Home, Tractor, Info, MessageCircle, Menu, X } from "lucide-react";
import notificationApi from "../../api/notificationApi";
import { fetchCart } from "../../features/cart/cartSlice.js";
import { logout } from "../../features/auth/authSlice.js";
import Logo from "../common/Logo.jsx";
import RoleNavigation from "./RoleNavigation.jsx";
import MobileNavigationDrawer from "./MobileNavigationDrawer.jsx";
import getImageUrl from "../../utils/imageUrl.js";

export default function Topbar({ placeholder }) {
  const { user, token } = useSelector((s) => s.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || "guest";
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const defaultPlaceholder = role === "customer" ? "Search for organic products..." : role === "admin" ? "Search products, users, orders..." : "Search...";
  const roleLabels = { customer: "Customer", farmer: "Farmer", admin: "Administrator" };
  const notificationsPath = role === "farmer" ? "/farmer/notifications" : role === "admin" ? "/admin/notifications" : "/notifications";
  const cartCount = cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0);

  const drawerRef = useRef(null);

  useEffect(() => {
    if (role === "customer" && token && token !== "demo-token") dispatch(fetchCart());
  }, [dispatch, role, token]);

  useEffect(() => {
    if ((role !== "admin" && role !== "farmer" && role !== "customer") || !token || token === "demo-token") return;
    let active = true;
    notificationApi.unreadCount()
      .then(({ data }) => { if (active) setUnreadCount(Number(data?.count) || 0); })
      .catch((requestError) => console.error("Failed to load unread notification count.", requestError));
    return () => { active = false; };
  }, [role, location.pathname, token]);

  const closeDrawer = () => setDrawerOpen(false);

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(search.trim() ? `/shop?search=${encodeURIComponent(search.trim())}` : "/shop");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-1 border-b border-[#E4ECE9] bg-white px-2 sm:gap-4 sm:px-6 lg:h-[56px]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`${role === "customer" ? "hidden" : "lg:hidden"}`}>
            <Logo subtitle={true} size="sm" className="!w-[108px] sm:!w-[150px]" />
          </div>
          <button
            type="button"
            aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={drawerOpen}
            aria-controls="dashboard-mobile-navigation"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[#4B5563] hover:bg-gray-50 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <form onSubmit={handleSearch} className={`relative min-w-0 max-w-[240px] flex-1 ${role === "customer" ? "mx-1 block sm:mx-0" : "hidden sm:block"} ${role === "farmer" ? "sm:hidden" : ""}`}>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder || defaultPlaceholder} aria-label="Search products" className="h-9 w-full rounded-full border-0 bg-[#F3F5F4] pl-10 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 sm:pr-4" />
          </form>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {role === "customer" && <Link to="/cart" aria-label={`Cart, ${cartCount} items`} className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:text-primary"><ShoppingCart className="h-5 w-5" />{cartCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">{cartCount}</span>}</Link>}
          {user && <Link to={notificationsPath} aria-label="Notifications" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:text-primary">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && <span aria-label={`${unreadCount} unread notifications`} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#16A36A] ring-2 ring-white" />}
          </Link>}
          {role === "farmer" ? <Link to="/farmer/profile" aria-label="Open profile" className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-mint border border-emerald-200">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#111827] leading-tight">{user?.name || "Farmer"}</div>
              <div className="text-[10px] text-muted leading-tight">{roleLabels[role]}</div>
            </div>
          </Link> : role === "admin" ? <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-mint border border-emerald-200">
              {user?.avatar ? <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#111827] leading-tight">{user?.name || "Admin"}</div>
              <div className="text-[10px] text-muted leading-tight">{roleLabels[role]}</div>
            </div>
          </div> : role === "customer" ? <Link to="/customer/profile" className="flex items-center gap-2 pl-1" aria-label="Open profile">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-emerald-200 bg-mint">
              {user?.avatar ? <img src={getImageUrl(user.avatar)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><User className="w-4 h-4 text-primary" /></div>}
            </div>
            <div className="hidden text-left sm:block">
              <div className="max-w-[140px] truncate text-xs font-semibold leading-tight text-[#111827]">{user?.name || "Customer"}</div>
              <div className="text-[10px] leading-tight text-muted">{roleLabels[role]}</div>
            </div>
          </Link> : <Link to="/login" className="rounded-md px-3 py-2 text-xs font-semibold text-primary hover:bg-emerald-50">Login</Link>}
        </div>
      </header>

      <MobileNavigationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        id="dashboard-mobile-navigation"
        label={`${role} navigation menu`}
        drawerRef={drawerRef}
        className="border-r border-gray-100 bg-white"
      />
    </>
  );
}
