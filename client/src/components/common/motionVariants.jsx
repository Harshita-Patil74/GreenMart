// Reusable motion variants for GreenMart offer and product cards.
// Centralizes animation config so offer cards and product cards share
// consistent timing, easing, and reduced-motion behavior.

export const sectionContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const sectionContentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1, ease: "easeOut" },
  },
};

export const cardItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Card hover: slight lift + subtle scale on tap
export const cardHover = {
  hover: { y: -4, transition: { duration: 0.2, ease: "easeOut" } },
  tap: { scale: 0.98 },
};

// Image hover: gentle zoom
export const imageHover = {
  hover: { scale: 1.05, transition: { duration: 0.3, ease: "easeOut" } },
};

// Discount badge: subtle scale pulse on hover (no continuous flashing)
export const badgeHover = {
  hover: { scale: 1.08, transition: { duration: 0.2, ease: "easeOut" } },
  tap: { scale: 0.95 },
};

// Wishlist button: clear press feedback
export const wishlistButtonVariants = {
  hover: { scale: 1.15 },
  tap: { scale: 0.85 },
};

// Add-to-cart button: subtle press feedback
export const addToCartButtonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};
