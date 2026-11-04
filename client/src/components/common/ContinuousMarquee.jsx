import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion, useMotionValue } from "framer-motion";

/**
 * ContinuousMarquee: infinite horizontal marquee for offer and product cards.
 *
 * Duplicates the card sequence so the list loops seamlessly. Uses Framer
 * Motion's useMotionValue with a requestAnimationFrame loop for smooth
 * linear translateX movement that repeats continuously.
 *
 * Mobile-first responsive: cards use a clamp()-based responsive min-width so
 * roughly 1-2 cards show on mobile, 2-3 on tablets, and many on desktop. The
 * track width is re-measured with a ResizeObserver so the loop adapts to any
 * screen width without forcing fixed desktop card widths on small screens.
 *
 * Interaction:
 *   - Pauses on mouse hover and keyboard focus; resumes on leave/blur.
 *   - Pauses while the user touches/drags, switches to overflow-x: auto so the
 *     carousel can be swiped manually, then resumes and snaps back on release.
 *   - With prefers-reduced-motion: no auto movement, overflow-x: auto for
 *     manual horizontal scrolling, no duplicated card nodes.
 *
 * Props:
 *   children      - React nodes to scroll (card components)
 *   speed         - Pixels per second (default 60)
 *   gap           - Gap between cards in px (default 24)
 *   itemWidth     - Desktop max card width in px (default 220)
 *   minItemWidth  - Mobile min card width in px (default 160)
 *   pauseOnHover  - Pause animation on mouse enter (default true)
 *   pauseOnFocus  - Pause animation on keyboard focus (default true)
 */
export default function ContinuousMarquee({
  children,
  speed = 60,
  gap = 24,
  itemWidth = 220,
  minItemWidth = 160,
  pauseOnHover = true,
  pauseOnFocus = true,
}) {
  const reducedMotion = useReducedMotion();
  const mounted = useRef(true);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  const isPausedRef = useRef(false);
  const isTouchingRef = useRef(false);
  const startTimeRef = useRef(performance.now());
  const offsetRef = useRef(0);
  const totalWidthRef = useRef(0);
  const rafRef = useRef(null);
  let resizeObserver = null;

  const childArray = React.Children.toArray(children);
  const visibleCount = childArray.length;

  const x = useMotionValue(0);
  const showDuplicates = !reducedMotion && visibleCount > 0;

  const responsiveMinWidth = `clamp(${minItemWidth}px, 25vw, ${itemWidth}px)`;

  const measureWidth = () => {
    const node = trackRef.current;
    if (!node) return 0;
    const measured = Math.floor(node.offsetWidth / 2);
    return measured > 0 ? measured : visibleCount * (itemWidth + gap) - gap;
  };

  useEffect(() => {
    mounted.current = true;

    if (reducedMotion || visibleCount === 0) return;

    const updateWidth = () => {
      totalWidthRef.current = measureWidth();
      if (totalWidthRef.current <= 0) {
        totalWidthRef.current =
          visibleCount * (itemWidth + gap) - gap;
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(trackRef.current);
    }

    startTimeRef.current = performance.now();
    offsetRef.current = 0;

    function step(time) {
      if (!mounted.current) return;
      rafRef.current = requestAnimationFrame(step);
      if (isPausedRef.current || isTouchingRef.current) return;
      const elapsed = (time - startTimeRef.current) / 1000;
      const distance =
        (offsetRef.current + speed * elapsed) % totalWidthRef.current;
      x.set(-distance);
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      mounted.current = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, visibleCount, speed, itemWidth, gap, x, measureWidth]);

  const pause = () => {
    isPausedRef.current = true;
  };
  const resume = () => {
    isPausedRef.current = false;
  };

  const handleMouseEnter = () => {
    if (pauseOnHover) pause();
  };
  const handleMouseLeave = () => {
    if (pauseOnHover) resume();
  };
  const handleFocus = () => {
    if (pauseOnFocus) pause();
  };
  const handleBlur = () => {
    if (pauseOnFocus) resume();
  };

  const handleTouchStart = () => {
    isTouchingRef.current = true;
    isPausedRef.current = true;
    const vp = viewportRef.current;
    if (vp) {
      vp.style.overflowX = "auto";
      vp.style.scrollBehavior = "auto";
    }
  };

  const handleTouchEnd = () => {
    isTouchingRef.current = false;
    isPausedRef.current = false;
    const vp = viewportRef.current;
    if (vp) {
      vp.style.overflowX = "hidden";
      vp.scrollLeft = 0;
    }
    startTimeRef.current = performance.now();
    offsetRef.current = 0;
  };

  const handleTouchCancel = handleTouchEnd;

  const viewportStyle = {
    overflowX: reducedMotion ? "auto" : "hidden",
    WebkitOverflowScrolling: reducedMotion ? "touch" : "auto",
    touchAction: reducedMotion ? "pan-x pan-y" : "pan-y",
  };

  return (
    <div
      ref={viewportRef}
      className="relative max-w-full overflow-x-hidden"
      style={viewportStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <motion.div
        ref={trackRef}
        style={{
          x: reducedMotion ? 0 : x,
          display: "flex",
          gap,
          alignItems: "center",
        }}
        className="relative flex shrink-0"
      >
        {childArray.map((child, i) => (
          <div
            key={`primary-${i}`}
            style={{ minWidth: responsiveMinWidth, flex: "0 0 auto" }}
          >
            {child}
          </div>
        ))}
        {showDuplicates &&
          childArray.map((child, i) => (
            <div
              key={`duplicate-${i}`}
              style={{ minWidth: responsiveMinWidth, flex: "0 0 auto" }}
              aria-hidden="true"
            >
              {child}
            </div>
          ))}
      </motion.div>
    </div>
  );
}
