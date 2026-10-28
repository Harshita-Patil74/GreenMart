import { useState, useEffect } from "react";
export default function useGeolocation() {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }, []);
  return pos;
}
