// Viewport reveal component using IntersectionObserver.
// Wraps content so it animates in when it enters the viewport.
// Respects prefers-reduced-motion by rendering children immediately visible.

import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function RevealOnScroll({ children, once = true, threshold = 0.12, variant = "slideUp" }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef(null);
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion || once && visible) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, once, threshold, visible]);

  const base = reducedMotion
    ? { opacity: 1, y: 0 }
    : visible
      ? { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
      : { opacity: 0, y: 20 };

  return (
    <motion.div ref={ref} initial={false} animate={base} className="min-h-[1px]">
      {children}
    </motion.div>
  );
}

export default RevealOnScroll;
