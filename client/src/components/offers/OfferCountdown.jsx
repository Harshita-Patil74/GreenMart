import React, { useEffect, useState, useRef, useCallback } from "react";
import { Clock3 } from "lucide-react";

/**
 * Reusable countdown timer for scheduled offers.
 *
 * Props:
 *   startAt   - ISO string or Date for the offer start time (upcoming countdown)
 *   endAt     - ISO string or Date for the offer end time (expiry countdown)
 *   status    - "Upcoming" | "Active" | "Expired" | "Inactive" | "Pending" | "Rejected"
 *   label     - Optional custom label text
 *
 * Behavior:
 *   - Shows "Starts in HH:MM:SS" when status is "Upcoming" (counts down to startAt)
 *   - Shows "Offer ends in HH:MM:SS" when status is "Active" (counts down to endAt)
 *   - Updates every second
 *   - Clears interval on unmount
 *   - Handles browser tab visibility changes (recalculates on focus)
 *   - Server-provided time offset can be passed via `serverTime` for accurate countdowns
 */
export default function OfferCountdown({ startAt, endAt, status, label, serverTime, className }) {
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);
  const targetRef = useRef(null);
  const isStartRef = useRef(status === "Upcoming");

  const targetMs = useCallback(() => {
    const t = status === "Upcoming" ? new Date(startAt).getTime() : new Date(endAt).getTime();
    return Number.isFinite(t) ? t : null;
  }, [startAt, endAt, status]);

  const nowMs = useCallback(() => {
    if (serverTime) return new Date(serverTime).getTime();
    return Date.now();
  }, [serverTime]);

  const update = useCallback(() => {
    const target = targetMs();
    const now = nowMs();
    if (target == null) {
      setFinished(true);
      setRemaining(0);
      return;
    }
    const diff = Math.max(0, target - now);
    setRemaining(diff);
    setFinished(diff <= 0);
  }, [targetMs, nowMs]);

  // Start / restart timer when target changes
  useEffect(() => {
    const target = targetMs();
    isStartRef.current = status === "Upcoming";
    if (target == null) {
      setFinished(true);
      setRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    targetRef.current = target;
    update();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startAt, endAt, status, update, targetMs]);

  // Recalculate when tab becomes visible again
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [update]);

  if (finished || remaining <= 0) {
    return null;
  }

  // Only render countdown for Upcoming or Active offers
  if (status !== "Upcoming" && status !== "Active") {
    return null;
  }

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, "0");

  const isStart = isStartRef.current;
  const labelText = label || (isStart ? "Starts in" : "Offer ends in");

  return (
    <div className={`flex items-center gap-1.5 text-[9px] font-semibold text-[#146B37] sm:text-[10px] ${className || ""}`} aria-live="polite" aria-label={`${labelText} ${pad(hours)} hours ${pad(minutes)} minutes ${pad(seconds)} seconds`}>
      <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E6F5E9] text-[#146B37]">
        <Clock3 size={12} />
      </span>
      <span className="font-mono text-[#16803C]">{pad(hours)}</span>
      <span className="text-[#64716B]">:</span>
      <span className="font-mono text-[#16803C]">{pad(minutes)}</span>
      <span className="text-[#64716B]">:</span>
      <span className="font-mono text-[#16803C]">{pad(seconds)}</span>
      <span className="text-[#64716B]">{isStart ? "until start" : "left"}</span>
    </div>
  );
}
