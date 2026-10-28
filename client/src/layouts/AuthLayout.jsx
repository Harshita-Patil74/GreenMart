import React from "react";
import { Outlet } from "react-router-dom";
import PageTransition from "../components/common/PageTransition.jsx";

const BG = "/images/default-farm.jpg";

export default function AuthLayout() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#064B35]/45 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full my-8 flex justify-center">
        <PageTransition><Outlet /></PageTransition>
      </div>
    </div>
  );
}
