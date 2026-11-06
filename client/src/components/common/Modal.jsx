import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { modalOverlayVariants, modalContentVariants } from "../../animations/variants.js";

export default function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card rounded-card shadow-card-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e)=>e.stopPropagation()}
          >
            {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
