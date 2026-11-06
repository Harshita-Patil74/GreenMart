import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ShoppingCart, Heart, Search, User, ChevronDown, LogOut, LayoutDashboard, Truck, MapPin, Bell, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { dropdownVariants } from "../../animations/variants.js";
import Logo from "../common/Logo.jsx";
import { logout } from "../../features/auth/authSlice.js";
import { fetchCart } from "../../features/cart/cartSlice.js";
import PublicNavigation from "./PublicNavigation.jsx";
import RoleNavigation from "./RoleNavigation.jsx";
import MobileNavigationDrawer from "./MobileNavigationDrawer.jsx";
import getImageUrl from "../../utils/imageUrl.js";

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);
  const cartItems = useSelector((s) => s.cart.items || []);
  const cartCount = cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerRef = useRef(null);

  useEffect(() => {
    if (user && token && token !== "demo-token") dispatch(fetchCart());
  }, [dispatch, token, user?.role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(search.trim() ? `/shop?search=${encodeURIComponent(search.trim())}` : "/shop");
  };

  const closeDrawer = () => setDrawerOpen(false);

  const dashboardLinks = [
    { label: "Customer Dashboard", path: "/customer/dashboard", roles: ["customer", "farmer", "admin"] },
    { label: "Farmer Dashboard", path: "/farmer/dashboard", roles: ["farmer", "admin"] },
    { label: "Admin Dashboard", path: "/admin/dashboard", roles: ["admin"] },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 h-[64px] border-b border-[#EEF1EF] bg-white">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5">
          <div className="flex items-center gap-8 shrink-0">
            <Logo subtitle={true} size="sm" className="!w-[108px] sm:!w-[150px]" />
            <PublicNavigation className="hidden lg:flex items-center gap-7 text-[14px] font-medium" />
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[280px] mx-2 hidden md:flex items-center relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 pl-10 pr-4 text-[13px] bg-[#F4F6F5] border border-[#E6EAE7] rounded-full focus:outline-none focus:border-primary focus:bg-white"
            />
          </form>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[#4B5563] hover:bg-gray-50 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/customer/wishlist" className="hidden sm:inline-flex p-2 text-[#4B5563] hover:text-primary rounded-full" title="Wishlist">
              <Heart className="w-[20px] h-[20px]" />
            </Link>
            {user?.role === "customer" && <Link to="/notifications" className="p-2 text-[#4B5563] hover:text-primary rounded-full" title="Notifications"><Bell className="h-5 w-5" /></Link>}
            <Link to="/cart" className="p-2 text-[#4B5563] hover:text-primary rounded-full relative" title="Cart">
              <ShoppingCart className="w-[20px] h-[20px]" />
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {cartCount}
              </span>
            </Link>

            <div className="relative ml-1">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-mint border border-emerald-200 flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={getImageUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-sm"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-gray-800 truncate">{user?.name || "Guest"}</p>
                      <p className="text-xs text-primary capitalize">{user?.role || "Customer"}</p>
                    </div>
                    {dashboardLinks.filter((item) => user && item.roles.includes(user.role)).map((item) => (
                      <Link key={item.path} to={item.path} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-emerald-50 text-gray-700">
                        <LayoutDashboard className="w-4 h-4 text-primary" /> {item.label}
                      </Link>
                    ))}
                    <Link to="/track-order" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-emerald-50 text-gray-700">
                      <Truck className="h-4 w-4" /> Track Order
                    </Link>
                    <Link to="/farm-locations" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-emerald-50 text-gray-700">
                      <MapPin className="h-4 w-4" /> Farm Locations
                    </Link>
                    {user ? (
                      <button onClick={() => { dispatch(logout()); setDropdownOpen(false); navigate("/login"); }} className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    ) : (
                      <Link to="/login" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-primary">
                        Login / Register
                      </Link>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <MobileNavigationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        id="public-mobile-navigation"
        label="Main navigation menu"
        drawerRef={drawerRef}
        className="border-r border-gray-100 bg-white"
      />
    </>
  );
}
