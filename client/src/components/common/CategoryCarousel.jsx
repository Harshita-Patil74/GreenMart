import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveIconKey, getIconComponent, ICON_COLOR, DEFAULT_ICON_KEY } from "../../utils/constants.js";

const ICON_BG = "#EAF2E7";
const TEXT = "#26352B";

function CategoryCard({ category }) {
  const iconKey = resolveIconKey(category);
  const Icon = getIconComponent(iconKey);
  const href = `/shop?category=${encodeURIComponent(category.name)}`;
  return (
    <Link
      to={href}
      className="group flex flex-col items-center gap-2 p-3 min-w-[120px] sm:min-w-[135px] md:min-w-[150px] rounded-[12px] border border-[#E2E6DF] bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#245C3A] hover:shadow-[0_4px_12px_rgba(38,53,43,0.08)]"
    >
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-[#DCFCE7]" style={{ backgroundColor: ICON_BG }}>
        <Icon className="w-5 h-5" style={{ color: ICON_COLOR, transition: "color 0.2s ease" }} />
      </div>
      <span className="text-[12px] sm:text-[13px] font-semibold text-center leading-snug transition-colors duration-200 group-hover:text-[#245C3A]" style={{ color: TEXT }} title={category.name}>
        {category.name}
      </span>
    </Link>
  );
}

export default function CategoryCarousel({ categories }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  const updateBounds = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const maxScroll = Math.max(0, vp.scrollWidth - vp.clientWidth);
    setCanScrollLeft(vp.scrollLeft > 1);
    setCanScrollRight(vp.scrollLeft < maxScroll - 1);
  }, []);

  const scrollBy = useCallback((delta, smooth = true) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.scrollBehavior = smooth ? "smooth" : "auto";
    vp.scrollLeft += delta;
  }, []);

  const scrollToStart = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.scrollBehavior = "smooth";
    vp.scrollLeft = 0;
  }, []);

  const scrollToEnd = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.scrollBehavior = "smooth";
    vp.scrollLeft = vp.scrollWidth - vp.clientWidth;
  }, []);

  useEffect(() => {
    updateBounds();
    const vp = viewportRef.current;
    if (vp) {
      vp.addEventListener("scroll", updateBounds, { passive: true });
    }
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateBounds);
      ro.observe(vp);
      if (trackRef.current) ro.observe(trackRef.current);
    }
    return () => {
      if (vp) vp.removeEventListener("scroll", updateBounds);
      if (ro) ro.disconnect();
    };
  }, [categories.length, updateBounds]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener("scroll", updateBounds, { passive: true });
    return () => vp.removeEventListener("scroll", updateBounds);
  }, [updateBounds]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = true;
    vp.style.scrollBehavior = "auto";
    vp.style.userSelect = "none";
    dragStartRef.current = { x: e.clientX, scrollLeft: vp.scrollLeft };
    e.target.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const delta = dragStartRef.current.x - e.clientX;
    vp.scrollLeft = dragStartRef.current.scrollLeft + delta;
  }, []);

  const handlePointerUp = useCallback(() => {
    const vp = viewportRef.current;
    isDraggingRef.current = false;
    if (vp) vp.style.userSelect = "";
    updateBounds();
  }, [updateBounds]);

  const handlePointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    const vp = viewportRef.current;
    if (vp) vp.style.userSelect = "";
  }, []);

  const handleTouchStart = useCallback((e) => {
    const vp = viewportRef.current;
    if (!vp) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.touches[0].clientX, scrollLeft: vp.scrollLeft };
    vp.style.scrollBehavior = "auto";
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const delta = dragStartRef.current.x - e.touches[0].clientX;
    vp.scrollLeft = dragStartRef.current.scrollLeft + delta;
  }, []);

  const handleTouchEnd = handlePointerUp;

  if (!categories || categories.length === 0) return null;

  return (
    <div className="relative max-w-full">
      <div
        ref={viewportRef}
        className="pl-3 sm:px-6 pr-3 sm:pr-6 overflow-x-auto scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="flex shrink-0 gap-4 sm:gap-5 md:gap-6 items-center"
          style={{ display: "flex", gap: 24, alignItems: "center" }}
        >
          {categories.map((cat) => (
            <CategoryCard key={cat._id || cat.name} category={cat} />
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        className={`absolute top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E6DF] bg-white text-[#26352B] shadow-[0_1px_3px_rgba(38,53,43,0.06)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_4px_6px_rgba(38,53,43,0.12)] ${!canScrollLeft ? "opacity-40" : ""}`}
        style={{ left: 0, transform: "translateY(-50%)" }}
        onClick={() => scrollBy(-220, true)}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        disabled={!canScrollRight}
        className={`absolute top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E6DF] bg-white text-[#26352B] shadow-[0_1px_3px_rgba(38,53,43,0.06)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_4px_6px_rgba(38,53,43,0.12)] ${!canScrollRight ? "opacity-40" : ""}`}
        style={{ right: 0, transform: "translateY(-50%)" }}
        onClick={() => scrollBy(220, true)}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
