// GreenMart reusable Framer Motion animation variants.
// Centralizes timing, easing, and reduced-motion behavior so every page
// and component shares a consistent, premium animation language.
//
// Guidelines:
// - Short durations (0.15–0.3s) for everyday interactions.
// - Slightly longer (0.3–0.5s) for page/modal entrances.
// - Respect prefers-reduced-motion via useReducedMotion where applied.
// - Only animate opacity, scale, rotate, and translate (transform) to avoid
//   expensive layout thrashing.
// - No continuous decorative movement, no bouncing, no parallax.

export const REDUCED = {
  duration: 0,
  ease: "linear",
};

export const SHORT = { duration: 0.2, ease: "easeOut" };
export const NORMAL = { duration: 0.35, ease: "easeOut" };
export const SLOW = { duration: 0.5, ease: "easeOut" };

// ---------- Page entrance / exit ----------

export const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: NORMAL,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: SHORT,
  },
};

// ---------- Fade ----------

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NORMAL },
  exit: { opacity: 0, transition: SHORT },
};

// ---------- Slide ----------

export const slideUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: NORMAL },
  exit: { opacity: 0, y: -12, transition: SHORT },
};

export const slideDownVariants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: NORMAL },
  exit: { opacity: 0, y: 12, transition: SHORT },
};

export const slideLeftVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: NORMAL },
  exit: { opacity: 0, x: -12, transition: SHORT },
};

export const slideRightVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: NORMAL },
  exit: { opacity: 0, x: 12, transition: SHORT },
};

// ---------- Staggered children ----------

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ---------- Card entrance & hover ----------

export const cardEntrance = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: NORMAL },
};

export const cardHover = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: 0.2, ease: "easeOut" } },
  tap: { scale: 0.98 },
};

export const imageHover = {
  rest: { scale: 1 },
  hover: { scale: 1.04, transition: { duration: 0.3, ease: "easeOut" } },
};

// ---------- Modal ----------

export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: SHORT },
  exit: { opacity: 0, transition: SHORT },
};

export const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 16,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// ---------- Dropdown ----------

export const dropdownVariants = {
  hidden: { opacity: 0, scaleY: 0.9, originY: 0 },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scaleY: 0.9,
    originY: 0,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};

// ---------- Button ----------

export const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: SHORT },
  tap: { scale: 0.96 },
};

// ---------- List item ----------

export const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: NORMAL },
};

// ---------- Section reveal ----------

export const sectionReveal = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
