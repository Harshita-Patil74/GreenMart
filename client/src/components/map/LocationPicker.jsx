import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
const icon = divIcon({ className: "bg-primary rounded-full w-4 h-4 border-2 border-white" });

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 4;
const MAP_ZOOM = 12;
const GEOCODING_BASE = "https://nominatim.openstreetmap.org/search";

function isValidLat(lat) {
  return lat != null && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng) {
  return lng != null && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function hasValidCoords(latStr, lngStr) {
  return latStr.trim() !== "" && lngStr.trim() !== "" && isValidLat(Number(latStr)) && isValidLng(Number(lngStr));
}

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function DragHandler({ onDrag }) {
  const map = useMap();
  useEffect(() => {
    map.on("dragend", () => {
      const center = map.getCenter();
      onDrag(center.lat, center.lng);
    });
    return () => map.off("dragend");
  }, [map, onDrag]);
  return null;
}

function MarkerDragHandler({ onDrag }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e) => {
      const pos = e.latlng;
      onDrag(pos.lat, pos.lng);
    };
    map.on("markerdragend", handler);
    return () => map.off("markerdragend", handler);
  }, [map, onDrag]);
  return null;
}

export default function LocationPicker({ value, onChange, street, city }) {
  const [pos, setPos] = useState(value ? { lat: value.lat, lng: value.lng } : null);
  const [inputLat, setInputLat] = useState(value?.lat?.toString() ?? "");
  const [inputLng, setInputLng] = useState(value?.lng?.toString() ?? "");
  const [latError, setLatError] = useState(null);
  const [lngError, setLngError] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef(null);
  const inputLatRef = useRef(inputLat);
  const inputLngRef = useRef(inputLng);
  const inputChangeTimeout = useRef(null);
  const geocodeTimeout = useRef(null);
  const ignoreNextInputChange = useRef(false);

  // Keep refs in sync with state
  inputLatRef.current = inputLat;
  inputLngRef.current = inputLng;

  const handleMapUpdate = useCallback((lat, lng) => {
    ignoreNextInputChange.current = true;
    setPos({ lat, lng });
    setInputLat(lat.toFixed(6));
    setInputLng(lng.toFixed(6));
    setLatError(null);
    setLngError(null);
    setGeocodeResults([]);
    setShowResults(false);
    setGeocodeError(null);
    if (onChange) onChange({ lat, lng });
  }, [onChange]);

  const handleInputChange = useCallback((field, val) => {
    ignoreNextInputChange.current = true;
    if (field === "lat") setInputLat(val);
    else setInputLng(val);

    // Only call onChange when BOTH coordinates are present and valid
    inputChangeTimeout.current = setTimeout(() => {
      const lat = Number(inputLatRef.current);
      const lng = Number(inputLngRef.current);
      if (hasValidCoords(inputLatRef.current, inputLngRef.current) && isValidLat(lat) && isValidLng(lng)) {
        setPos({ lat, lng });
        if (onChange) onChange({ lat, lng });
      }
    }, 300);
  }, [onChange]);

  const validateAndSetError = useCallback((field, val) => {
    if (field === "lat") {
      setLatError(!val.trim() ? null : !isValidLat(Number(val)) ? "Latitude must be between -90 and 90." : null);
    } else {
      setLngError(!val.trim() ? null : !isValidLng(Number(val)) ? "Longitude must be between -180 and 180." : null);
    }
  }, []);

  useEffect(() => {
    if (value && (!pos || pos.lat !== value.lat || pos.lng !== value.lng)) {
      ignoreNextInputChange.current = true;
      setPos({ lat: value.lat, lng: value.lng });
      setInputLat(value.lat.toString());
      setInputLng(value.lng.toString());
      setGeocodeResults([]);
      setShowResults(false);
      setGeocodeError(null);
    }
  }, [value, pos]);

  const geocodeAddress = useCallback(async (streetVal, cityVal) => {
    if (!streetVal.trim() || !cityVal.trim()) {
      setGeocodeError("Please enter both street address and city.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    setGeocodeResults([]);
    setShowResults(false);

    const query = `${streetVal}, ${cityVal}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${GEOCODING_BASE}?format=json&q=${encodeURIComponent(query)}&limit=5`, {
        headers: { "Accept-Language": "en" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Geocoding service returned ${res.status}`);
      const data = await res.json();
      if (!data || data.length === 0) {
        setGeocodeError("Address location could not be found. Please refine the address or select the location manually on the map.");
        return;
      }
      setGeocodeResults(data);
      setShowResults(true);
    } catch (err) {
      if (err.name === "AbortError") {
        setGeocodeError("Geocoding request timed out. Please try again.");
      } else {
        setGeocodeError(err.message || "Geocoding failed. Please try again.");
      }
    } finally {
      setGeocoding(false);
    }
  }, []);

  const selectGeocodeResult = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isValidLat(lat) || !isValidLng(lng)) return;
    ignoreNextInputChange.current = true;
    setPos({ lat, lng });
    setInputLat(lat.toFixed(6));
    setInputLng(lng.toFixed(6));
    setLatError(null);
    setLngError(null);
    setGeocodeResults([]);
    setShowResults(false);
    setGeocodeError(null);
    if (onChange) onChange({ lat, lng });
  }, [onChange]);

  // Debounced geocoding when street/city change
  useEffect(() => {
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => {
      if (street?.trim() && city?.trim()) {
        geocodeAddress(street, city);
      }
    }, 500);
    return () => clearTimeout(geocodeTimeout.current);
  }, [street, city, geocodeAddress]);

  return (
    <div className="space-y-3 rounded-card overflow-hidden border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-600">
          Latitude
          <input
            type="number"
            step="0.000001"
            placeholder="Enter latitude"
            value={inputLat}
            onChange={(e) => {
              handleInputChange("lat", e.target.value);
              validateAndSetError("lat", e.target.value);
            }}
            className={`mt-1 h-9 w-full rounded-lg border px-3 text-sm text-gray-900 focus:border-primary focus:outline-none ${latError ? "border-red-500" : "border-gray-200"}`}
          />
          {latError && <span className="mt-0.5 block text-[10px] text-red-600">{latError}</span>}
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Longitude
          <input
            type="number"
            step="0.000001"
            placeholder="Enter longitude"
            value={inputLng}
            onChange={(e) => {
              handleInputChange("lng", e.target.value);
              validateAndSetError("lng", e.target.value);
            }}
            className={`mt-1 h-9 w-full rounded-lg border px-3 text-sm text-gray-900 focus:border-primary focus:outline-none ${lngError ? "border-red-500" : "border-gray-200"}`}
          />
          {lngError && <span className="mt-0.5 block text-[10px] text-red-600">{lngError}</span>}
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-600">
          Street Address
          <input
            type="text"
            placeholder="e.g. Gokul Road"
            value={street ?? ""}
            onChange={(e) => {
              ignoreNextInputChange.current = true;
              setGeocodeResults([]);
              setShowResults(false);
              setGeocodeError(null);
            }}
            className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-primary focus:outline-none"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          City
          <input
            type="text"
            placeholder="e.g. Hubli"
            value={city ?? ""}
            onChange={(e) => {
              ignoreNextInputChange.current = true;
              setGeocodeResults([]);
              setShowResults(false);
              setGeocodeError(null);
            }}
            className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => geocodeAddress(street ?? "", city ?? "")}
          disabled={geocoding || !(street?.trim() && city?.trim())}
          className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {geocoding ? "Locating…" : "Locate Address"}
        </button>
        <button
          onClick={() => {
            setGeocodeResults([]);
            setShowResults(false);
            setGeocodeError(null);
          }}
          className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600"
        >
          Clear
        </button>
      </div>

      {geocodeError && <p className="mt-0.5 block text-[10px] text-red-600">{geocodeError}</p>}

      {showResults && geocodeResults.length > 0 && (
        <div className="mt-1 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600">
          <p className="font-semibold mb-1">Select a location:</p>
          <ul className="space-y-1">
            {geocodeResults.map((result, i) => (
              <li
                key={i}
                onClick={() => selectGeocodeResult(result)}
                className="cursor-pointer px-2 py-1 rounded hover:bg-gray-50"
              >
                <span className="block">{result.display_name}</span>
                <span className="block text-[9px] text-gray-500">{result.lat}, {result.lon}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-64 rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={pos ? [pos.lat, pos.lng] : DEFAULT_CENTER}
          zoom={pos ? MAP_ZOOM : DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <ClickHandler onPick={handleMapUpdate} />
          <DragHandler onDrag={handleMapUpdate} />
          <MarkerDragHandler onDrag={handleMapUpdate} />
          {pos && <Marker position={[pos.lat, pos.lng]} icon={icon} draggable />}
        </MapContainer>
      </div>
      {pos && (
        <p className="text-[10px] text-gray-500 text-center">
          {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
        </p>
      )}
      {!pos && !value && (
        <p className="text-[10px] text-gray-500 text-center">Enter coordinates or use Locate Address to select a location.</p>
      )}
    </div>
  );
}
