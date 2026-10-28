import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ShoppingCart, Menu, X } from "lucide-react";
import notificationApi from "../../api/notificationApi";
import { fetchCart } from "../../features/cart/cartSlice.js";
import PublicNavigation from "./PublicNavigation.jsx";
import getImageUrl from "../../utils/imageUrl.js";

export default function Topbar({ placeholder }) {
  const { user, token } = useSelector((s) => s.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || "customer";
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const defaultPlaceholder = role === "customer" ? "Search for organic products..." : role === "admin" ? "Search products, users, orders..." : "Search...";
  const roleLabels = { customer: "Customer", farmer: "Farmer", admin: "Administrator" };
  const notificationsPath = role === "farmer" ? "/farmer/notifications" : "/notifications";
  const cartCount = cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0);

  useEffect(() => {
    if (role === "customer" && token && token !== "demo-token") dispatch(fetchCart());
  }, [dispatch, role, token]);

  useEffect(() => {
    if ((role !== "farmer" && role !== "customer") || !token || token === "demo-token") return;
    let active = true;
    notificationApi.unreadCount()
      .then(({ data }) => { if (active) setUnreadCount(Number(data?.count) || 0); })
      .catch((requestError) => console.error("Failed to load unread notification count.", requestError));
    return () => { active = false; };
  }, [role, location.pathname, token]);

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between gap-4 border-b border-[#E4ECE9] bg-white px-4 sm:px-6">
      <button
        type="button"
        aria-label={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileNavigationOpen}
        onClick={() => setMobileNavigationOpen((open) => !open)}
        className="rounded-full p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
      >
        {mobileNavigationOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <form onSubmit={(event) => { event.preventDefault(); navigate(search.trim() ? `/shop?search=${encodeURIComponent(search.trim())}` : "/shop"); }} className={`relative max-w-[240px] flex-1 ${role === "farmer" ? "hidden" : ""}`}>
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder || defaultPlaceholder} className="h-9 w-full rounded-full border-0 bg-[#F3F5F4] pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </form>
      <PublicNavigation className="hidden items-center gap-4 whitespace-nowrap text-xs font-medium lg:flex" />
      <div className="flex items-center gap-2 sm:gap-3">
        {role === "customer" && <Link to="/cart" aria-label={`Cart, ${cartCount} items`} className="relative rounded-full p-2 text-gray-500 hover:text-primary"><ShoppingCart className="h-[18px] w-[18px]" />{cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">{cartCount}</span>}</Link>}
        <Link to={notificationsPath} aria-label="Notifications" className="relative rounded-full p-2 text-gray-500 hover:text-primary">
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && <span aria-label={`${unreadCount} unread notifications`} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#16A36A] ring-2 ring-white" />}
        </Link>
        {role === "farmer" || role === "admin" ? <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-mint border border-emerald-200">
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-[#111827] leading-tight">{user?.name || (role === "admin" ? "Admin" : "Farmer")}</div>
            <div className="text-[10px] text-muted leading-tight">{roleLabels[role]}</div>
          </div>
        </div> : role === "customer" ? <Link to="/customer/profile" className="flex items-center gap-2 pl-1" aria-label="Open profile">
          <div className="h-8 w-8 overflow-hidden rounded-full border border-emerald-200 bg-mint">
            {user?.avatar ? <img src={getImageUrl(user.avatar)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><User className="h-4 w-4 text-primary" /></div>}
          </div>
          <div className="hidden text-left sm:block">
            <div className="max-w-[140px] truncate text-xs font-semibold leading-tight text-[#111827]">{user?.name || "Customer"}</div>
            <div className="text-[10px] leading-tight text-muted">{roleLabels[role]}</div>
          </div>
        </Link> : <Link to="/login" className="rounded-md px-3 py-2 text-xs font-semibold text-primary hover:bg-emerald-50">Login</Link>}
      </div>
      {mobileNavigationOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-[#E4ECE9] bg-white px-4 py-3 shadow-sm lg:hidden">
          <PublicNavigation
            onNavigate={() => setMobileNavigationOpen(false)}
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium"
          />
        </div>
      )}
    </header>
  );
}
