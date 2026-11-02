import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";
import PageTransition from "../components/common/PageTransition.jsx";
import Footer from "../components/layout/Footer.jsx";

export default function DashboardLayout() {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const isFarmer = user?.role === "farmer" || location.pathname.startsWith("/farmer");
  const isCustomer = user?.role !== "admin" && !isFarmer && (user?.role === "customer" || ["/customer", "/shop", "/cart", "/checkout", "/track-order", "/orders", "/order-confirmation", "/notifications"].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)));
  const hasCustomerMobileNavigation = user?.role === "customer";

  return (
    <div className={`flex min-h-screen ${isFarmer || isCustomer ? "bg-[#F2F7F8]" : "bg-[#EAF3EC]"}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className={`min-w-0 flex-1 overflow-x-hidden ${isFarmer || isCustomer ? "p-3 sm:p-4 lg:p-5" : "p-3 sm:p-5 lg:p-6"}`}>
          <PageTransition><Outlet /></PageTransition>
        </main>
        {location.pathname === "/shop" && <Footer />}
      </div>
    </div>
  );
}
