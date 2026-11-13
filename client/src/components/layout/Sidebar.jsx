import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { fadeVariants } from "../../animations/variants.js";
import Logo from "../common/Logo.jsx";
import RoleNavigation from "./RoleNavigation.jsx";
import { logout } from "../../features/auth/authSlice.js";

export default function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const handleLogout = () => { dispatch(logout()); navigate("/login"); };

  return (
    <motion.aside
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      className="hidden min-h-screen w-[192px] shrink-0 flex-col justify-between bg-[#064B35] text-white lg:flex"
    >
      <div>
        <div className="px-5 py-5">
          <Logo dashboard subtitle={false} size="md" />
        </div>
        <RoleNavigation role={user?.role || "guest"} onLogout={user ? handleLogout : undefined} className="mt-1 space-y-0.5 px-3" />
      </div>
    </motion.aside>
  );
}
