import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * ContinuousMarquee: responsive, manually slidable horizontal carousel.
 *
 * Architecture: scrollLeft is the single source of truth for position.
 *   - Auto-scroll updates scrollLeft via requestAnimationFrame.
 *   - Manual interaction (drag, touch, trackpad, arrows) updates scrollLeft directly.
 *   - Triple card copies provide seamless looping without visible jumps.
 *
 * Interaction:
 *   - Pauses auto-scroll on mouse hover, keyboard focus, and drag/swipe.
 *   - Resumes smoothly after interaction ends (position preserved).
 *   - Previous/Next arrow controls scroll by one card width.
 *   - Mouse click-and-drag on desktop; finger swipe on mobile; trackpad scroll.
 *
 * Accessibility:
 *   - Arrow buttons have aria-label and are native <button> elements.
 *   - Duplicated copies are aria-hidden to avoid duplicate screen-reader content.
 *   - Respects prefers-reduced-motion (no auto-scroll, native scrollable row).
 *
 * Props:
 *   children      - React nodes to scroll (card components)
 *   speed         - Auto-scroll pixels per second (default 50)
 *   gap           - Gap between cards in px (default 24)
 *   itemWidth     - Desktop max card width in px (default 220)
 *   minItemWidth  - Mobile min card width in px (default 160)
 *   pauseOnHover  - Pause auto-scroll on mouse enter (default true)
 *   pauseOnFocus  - Pause auto-scroll on keyboard focus (default true)
 *   showControls  - Show Previous/Next arrow buttons (default true)
 *   infinite      - Use triple-copy seamless loop (default true).
 *                   When false, renders unique items only once without duplicates.
 */
export default function ContinuousMarquee({
  children,
  speed = 50,
  gap = 24,
  itemWidth = 220,
  minItemWidth = 160,
  pauseOnHover = true,
  pauseOnFocus = true,
  showControls = true,
  infinite = true,
}) {
  const reducedMotion = useReducedMotion();
  const mounted = useRef(true);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  const lastTimeRef = useRef(0);
  const scrollPosRef = useRef(0);
  const oneCopyWidthRef = useRef(0);
  const rafRef = useRef(null);
  let resizeObserver = null;

  const [layoutMeasured, setLayoutMeasured] = useState(false);

  const childArray = React.Children.toArray(children);
  const visibleCount = childArray.length;

  const responsiveMinWidth = `clamp(${minItemWidth}px, 25vw, ${itemWidth}px)`;

  const measureOneCopyWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    return infinite ? Math.floor(track.offsetWidth / 3) : track.offsetWidth;
  }, [infinite]);

  const setScrollPosition = useCallback((position, smooth = false) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.scrollBehavior = smooth ? "smooth" : "auto";
    vp.scrollLeft = position;
    scrollPosRef.current = position;
  }, []);

  const scrollBy = useCallback((delta, smooth = true) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.scrollBehavior = smooth ? "smooth" : "auto";
    vp.scrollLeft += delta;
    scrollPosRef.current = vp.scrollLeft;
  }, []);

  const pause = () => {
    isPausedRef.current = true;
  };
  const resume = () => {
    isPausedRef.current = false;
  };

  const initializeScroll = useCallback(() => {
    const width = measureOneCopyWidth();
    oneCopyWidthRef.current = width;
    const vp = viewportRef.current;
    if (vp && width > 0) {
      vp.style.scrollBehavior = "auto";
      vp.scrollLeft = infinite ? width : 0;
    }
    scrollPosRef.current = infinite ? width : 0;
    setLayoutMeasured(true);
  }, [measureOneCopyWidth, infinite]);

  // Auto-scroll animation loop (scrollLeft-based)
  // Skips entirely in finite mode (infinite={false}) — no duplicates, no auto-scroll.
  useEffect(() => {
    mounted.current = true;

    if (!infinite || reducedMotion || visibleCount === 0) return;

    initializeScroll();

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        oneCopyWidthRef.current = measureOneCopyWidth();
      });
      resizeObserver.observe(trackRef.current);
    }

    lastTimeRef.current = performance.now();

    function step(time) {
      if (!mounted.current) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
      lastTimeRef.current = time;

      if (isPausedRef.current || isDraggingRef.current) return;

      const vp = viewportRef.current;
      if (!vp) return;

      const delta = (time - lastTimeRef.current) / 1000;
      let newPos = scrollPosRef.current + speed * delta;
      const maxPos = 2 * oneCopyWidthRef.current;

      if (newPos >= maxPos && oneCopyWidthRef.current > 0) {
        newPos = oneCopyWidthRef.current;
        vp.style.scrollBehavior = "auto";
        vp.scrollLeft = newPos;
        scrollPosRef.current = newPos;
      } else {
        vp.scrollLeft = newPos;
        scrollPosRef.current = newPos;
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      mounted.current = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, visibleCount, speed, measureOneCopyWidth, initializeScroll]);

  // Mouse/touch drag handlers
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = true;
    isPausedRef.current = true;
    justDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, scrollLeft: vp.scrollLeft };
    vp.style.scrollBehavior = "auto";
    vp.style.userSelect = "none";
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const delta = dragStartRef.current.x - e.clientX;
    if (Math.abs(delta) > 4) justDraggedRef.current = true;
    vp.scrollLeft = dragStartRef.current.scrollLeft + delta;
    scrollPosRef.current = vp.scrollLeft;
  };

  const handlePointerUp = () => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    isPausedRef.current = false;
    const vp = viewportRef.current;
    if (vp) vp.style.userSelect = "";

    if (wasDragging && justDraggedRef.current) {
      justDraggedRef.current = false;
    }
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    isPausedRef.current = false;
    const vp = viewportRef.current;
    if (vp) vp.style.userSelect = "";
  };

  const handleClickCapture = (e) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      justDraggedRef.current = false;
    }
  };

  // Hover / focus pause
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

  // Touch: pause auto-scroll while touching
  const handleTouchStart = () => {
    isPausedRef.current = true;
  };
  const handleTouchEnd = () => {
    isPausedRef.current = false;
  };

  // Duplicates are only rendered in infinite mode (triple-copy seamless loop).
  // In finite mode, unique items render once without duplicates.
  // oneCopyWidthRef.current is measured in the effect after first render;
  // using it here would prevent duplicates from ever rendering because refs
  // do not trigger re-renders.
  const showDuplicates = infinite && !reducedMotion && visibleCount > 0;
  
  // Compute scroll bounds from live DOM for both infinite and finite modes
  const vp = viewportRef.current;
  const maxScroll = vp ? Math.max(0, vp.scrollWidth - vp.clientWidth) : 0;
  const canScrollLeft = layoutMeasured && scrollPosRef.current > 1;
  const canScrollRight = layoutMeasured && scrollPosRef.current < maxScroll - 1;

  const renderCopy = (copyIndex) =>
    childArray.map((child, i) => (
      <div
        key={`copy${copyIndex}-${i}`}
        style={{ minWidth: responsiveMinWidth, flex: "0 0 auto" }}
        aria-hidden={showDuplicates && copyIndex !== 1 ? "true" : undefined}
      >
        {child}
      </div>
    ));

  const arrowStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    borderRadius: "50%",
    border: "1px solid #E2E6DF",
    background: "#ffffff",
    color: "#26352B",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    boxShadow: "0 1px 3px rgba(38,53,43,0.06)",
  };

  return (
    <div
      ref={viewportRef}
      className="relative max-w-full pl-3 sm:px-6 pr-3 sm:pr-6 scrollbar-hide"
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: reducedMotion ? "pan-x pan-y" : "pan-y",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      <motion.div
        ref={trackRef}
        style={{
          display: "flex",
          gap,
          alignItems: "center",
        }}
        className="relative flex shrink-0"
      >
        {showDuplicates && renderCopy(0)}
        {renderCopy(1)}
        {showDuplicates && renderCopy(2)}
      </motion.div>

      {showControls && visibleCount > 0 && layoutMeasured && (
        <>
          <button
            type="button"
            aria-label="Previous"
            disabled={!canScrollLeft}
            style={{ ...arrowStyle, left: 8, opacity: canScrollLeft ? 1 : 0.4 }}
            onClick={() => scrollBy(-oneCopyWidthRef.current || itemWidth, true)}
          >
            &#9664;
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!canScrollRight}
            style={{ ...arrowStyle, right: 8, opacity: canScrollRight ? 1 : 0.4 }}
            onClick={() => scrollBy(oneCopyWidthRef.current || itemWidth, true)}
          >
            &#9654;
          </button>
        </>
      )}
    </div>
  );
}
