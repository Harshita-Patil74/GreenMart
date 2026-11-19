import React, { useEffect, useRef, useState, useCallback } from "react";
import { Truck, LoaderCircle } from "lucide-react";
import orderApi from "../../api/orderApi.js";

const MIN_UPDATE_INTERVAL_MS = 30000;
const MIN_MOVEMENT_METERS = 50;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapGeolocationError(err) {
  switch (err.code) {
    case 1:
      return "Location access was denied. Please enable GPS permissions.";
    case 2:
      return "Location information is unavailable.";
    case 3:
      return "Location request timed out.";
    default:
      return err.message || "An unknown location error occurred.";
  }
}

export default function FarmerTrackingControls({ order, farmerId }) {
  const [tracking, setTracking] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [sending, setSending] = useState(false);
  const [apiError, setApiError] = useState(null);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(null);
  const mountedRef = useRef(true);
  const trackingRef = useRef(false);

  const isEligible =
    order &&
    order.status === "Out for Delivery" &&
    (order.items || []).some((item) => String(item.farmer) === String(farmerId));

  const sendLocation = useCallback(
    async (lat, lng) => {
      if (!mountedRef.current || !trackingRef.current || !isEligible) return;
      const now = Date.now();
      if (
        lastSentRef.current &&
        now - lastSentRef.current.time < MIN_UPDATE_INTERVAL_MS
      )
        return;
      if (
        lastSentRef.current &&
        lastSentRef.current.lat === lat &&
        lastSentRef.current.lng === lng
      )
        return;
      if (
        lastSentRef.current &&
        haversineMeters(lastSentRef.current.lat, lastSentRef.current.lng, lat, lng) <
          MIN_MOVEMENT_METERS
      )
        return;

      setSending(true);
      setApiError(null);
      try {
        await orderApi.updateLocation(order._id, { lat, lng });
        lastSentRef.current = { lat, lng, time: now };
        setLastLocation({ lat, lng });
        setLastUpdatedAt(new Date());
        setApiError(null);
      } catch (err) {
        setApiError(err?.message || "Failed to share location.");
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [order._id, isEligible]
  );

  const handlePosition = useCallback(
    (position) => {
      if (!mountedRef.current || !trackingRef.current) return;
      const { latitude, longitude } = position.coords;
      setLastLocation({ lat: latitude, lng: longitude });
      setLastUpdatedAt(new Date());
      setGpsError(null);
      sendLocation(latitude, longitude);
    },
    [sendLocation]
  );

  const handleError = useCallback((err) => {
    if (!mountedRef.current) return;
    trackingRef.current = false;
    setTracking(false);
    setGpsError(mapGeolocationError(err));
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    if (!isEligible) {
      setGpsError("This order is not eligible for live tracking.");
      return;
    }
    setGpsError(null);
    setApiError(null);
    trackingRef.current = true;
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isEligible, handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    trackingRef.current = false;
    setTracking(false);
    setGpsError(null);
    setApiError(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      trackingRef.current = false;
      if (navigator.geolocation && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [order?._id]);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    if (tracking && !isEligible) {
      stopTracking();
      setGpsError("Order is no longer eligible for live tracking.");
    }
  }, [tracking, isEligible, stopTracking]);

  if (!isEligible) return null;

  const showError = !tracking && gpsError;

  return (
    <div className="mt-3 rounded-lg border border-[#DDE6E2] bg-[#F8FBF9] p-3">
      <h3 className="text-[10px] font-bold text-[#52615D] uppercase tracking-wide mb-2">
        Live Delivery Tracking
      </h3>

      {!tracking && !gpsError && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-[#087449]" />
            <span className="text-xs font-medium text-[#344640]">
              Ready to share live location
            </span>
          </div>
          <p className="text-[9px] text-[#71817D] mb-3">
            GPS permission is required to share your location with the customer during delivery.
          </p>
          <button
            type="button"
            onClick={startTracking}
            disabled={sending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#087449] px-3 py-1 text-[10px] font-semibold text-white disabled:opacity-50 hover:bg-[#06653F]"
          >
            {sending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            Start Live Tracking
          </button>
        </>
      )}

      {tracking && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#087449] animate-pulse" />
            <span className="text-xs font-semibold text-[#087449]">Live Location Active</span>
          </div>
          {lastLocation && (
            <div className="flex items-center gap-2 text-[9px] text-[#52615D]">
              <span>{lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)}</span>
              {lastUpdatedAt && (
                <span>
                  · {lastUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={stopTracking}
            disabled={sending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#DDE6E2] bg-white px-3 py-1 text-[10px] font-semibold text-[#52615D] disabled:opacity-50 hover:bg-[#F1F8F4]"
          >
            {sending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            Stop Live Tracking
          </button>
          {apiError && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] text-red-700">
              {apiError}
            </p>
          )}
        </div>
      )}

      {showError && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            <span className="text-xs font-semibold text-[#DC2626]">GPS Error</span>
          </div>
          <p className="text-[9px] text-[#71817D] mb-2">{gpsError}</p>
          <button
            type="button"
            onClick={startTracking}
            disabled={sending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#087449] px-3 py-1 text-[10px] font-semibold text-white disabled:opacity-50 hover:bg-[#06653F]"
          >
            {sending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            Retry Tracking
          </button>
        </div>
      )}
    </div>
  );
}
