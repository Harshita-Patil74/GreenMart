import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { fadeVariants } from "../../animations/variants.js";
import Logo from "../common/Logo.jsx";
import RoleNavigation from "./RoleNavigation.jsx";
import { logout } from "../../features/auth/authSlice.js";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [collapsed, setCollapsed] = useState(false);
  const handleLogout = () => { dispatch(logout()); navigate("/login"); };

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  return (
    <>
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
      <motion.aside
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className={`hidden min-h-screen shrink-0 flex-col justify-between bg-[#064B35] text-white lg:flex transition-all duration-300 ${collapsed ? "w-[72px]" : "w-[192px]"}`}
      >
        <div className={`flex-shrink-0 transition-all duration-200 ${collapsed ? "w-[72px]" : "w-[192px]"}`}>
          <div className="px-5 py-5">
            <Logo dashboard sidebar={false} size="md" />
          </div>
          <RoleNavigation
            role={user?.role || "guest"}
            onLogout={user ? handleLogout : undefined}
            className="mt-1 space-y-0.5 px-3"
            mobile={false}
            mobileDashboardOnly={false}
          />
        </div>
      </motion.aside>
    </>
  );
}
