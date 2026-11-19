import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

function mapGeolocationError(err) {
  switch (err.code) {
    case 1:
      return "Location access was denied. Please enable location permissions.";
    case 2:
      return "Location information is unavailable.";
    case 3:
      return "Location request timed out.";
    default:
      return err.message || "An unknown location error occurred.";
  }
}

export default function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const optsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
  const watchIdRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  const setPositionFromCoords = useCallback((position) => {
    setPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
  }, []);

  const handleError = useCallback((err) => {
    setLoading(false);
    setError(mapGeolocationError(err));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    const id = navigator.geolocation.getCurrentPosition(setPositionFromCoords, handleError, optsRef.current);
    return id;
  }, [setPositionFromCoords, handleError, optsRef]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLoading(false);
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(setPositionFromCoords, handleError, optsRef.current);
  }, [setPositionFromCoords, handleError, optsRef]);

  // One-shot location on mount only when explicitly requested; avoids
  // unnecessary location prompts for components that only need static data.
  useEffect(() => {
    if (options.requestOnMount === true) {
      requestLocation();
    }
    return () => {
      stopTracking();
    };
  }, [requestLocation, stopTracking, options.requestOnMount]);

  return {
    position,
    loading,
    error,
    requestLocation,
    clearError,
    startTracking,
    stopTracking,
    isSupported: Boolean(navigator.geolocation),
  };
}
