import React from "react";
import { motion } from "framer-motion";

export default function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <motion.input
        whileFocus={{ scale: 1.002, transition: { duration: 0.15, ease: "easeOut" } }}
        className="h-11 rounded-input border border-border px-3 bg-[#F7F8F8] placeholder:text-muted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        {...props}
      />
    </div>
  );
}
