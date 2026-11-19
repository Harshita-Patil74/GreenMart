import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import L from "leaflet";
import { formatDistance, formatDuration } from "../../utils/routingService.js";

const PRIMARY_ICON = divIcon({
  className: "bg-[#245C3A] rounded-full w-5 h-5 border-2 border-white shadow-md",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const CUSTOMER_ICON = divIcon({
  className: "bg-[#26352B] rounded-full w-5 h-5 border-2 border-white shadow-md",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function MapView({ children, center = [20.59, 78.96], zoom = 5, height = "400px" }) {
  return (
    <div style={{ height }} className="rounded-card overflow-hidden border border-border">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {children}
      </MapContainer>
    </div>
  );
}

export function FarmMarker({ farm, onClick }) {
  const lat = farm?.location?.lat ?? farm?.lat;
  const lng = farm?.location?.lng ?? farm?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return (
    <Marker position={[lat, lng]} icon={PRIMARY_ICON} eventHandlers={{ click: () => onClick && onClick(farm) }}>
      <Popup>
        <div className="text-sm">
          <div className="font-semibold">{farm.farmName || farm.name}</div>
          {farm.address && <div className="text-xs text-muted">{farm.address}</div>}
        </div>
      </Popup>
    </Marker>
  );
}

export function FarmPopup({ farm }) {
  return null;
}

export function NearbyFarmersList({ farms, userPos, onSelect }) {
  const list = (farms || []).map((f) => {
    let dist = null;
    const lat = f?.location?.lat; const lng = f?.location?.lng;
    if (userPos && Number.isFinite(lat) && Number.isFinite(lng)) {
      const R = 6371; const dLat = (lat - userPos.lat) * Math.PI / 180; const dLng = (lng - userPos.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(userPos.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      dist = (2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1) + " km";
    }
    return (
      <div key={f._id} onClick={() => onSelect && onSelect(f)} className="flex items-center gap-3 p-2 border-b border-border cursor-pointer">
        <img src={f.photo || "/images/default-farm.jpg"} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1">
          <div className="text-sm font-medium">{f.farmName || f.name}</div>
          <div className="text-xs text-muted">{f.category}</div>
        </div>
        {dist && <span className="text-xs text-muted">{dist}</span>}
      </div>
    );
  });
  return <div>{list}</div>;
}

function FitBounds({ positions }) {
  const map = useMap();
  React.useEffect(() => {
    const valid = positions.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length >= 2 && map) {
      const group = new L.featureGroup(valid.map((p) => L.marker([p.lat, p.lng])));
      map.fitBounds(group.getBounds().pad(0.35), { maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

export function DeliveryTrackingMap({
  farmerLocation,
  customerLocation,
  farmerLabel = "Farmer",
  customerLabel = "Delivery destination",
  height = "400px",
  className = "",
  route,
  routeInfo,
  routeStatus = "idle",
  routeError,
}) {
  const hasFarmer = farmerLocation && Number.isFinite(farmerLocation.lat) && Number.isFinite(farmerLocation.lng);
  const hasCustomer = customerLocation && Number.isFinite(customerLocation.lat) && Number.isFinite(customerLocation.lng);
  const hasRoute = route && route.features && route.features.length > 0;
  const canRoute = hasFarmer && hasCustomer;

  if (!hasFarmer && !hasCustomer) {
    return (
      <div className={`${className} h-[${height}] w-full rounded-card overflow-hidden border border-border flex items-center justify-center text-xs text-gray-500 bg-[#FAF8F1]`}>
        No live location available
      </div>
    );
  }

  const positions = [];
  if (hasFarmer) positions.push({ lat: farmerLocation.lat, lng: farmerLocation.lng });
  if (hasCustomer) positions.push({ lat: customerLocation.lat, lng: customerLocation.lng });

  const center = positions.length === 2
    ? [(farmerLocation.lat + customerLocation.lat) / 2, (farmerLocation.lng + customerLocation.lng) / 2]
    : positions[0];

  return (
    <div className={`${className} rounded-card overflow-hidden border border-border`} style={{ height }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <FitBounds positions={positions} />
        {hasRoute && (
          <Polyline
            positions={route.features[0].geometry.coordinates}
            color="#245C3A"
            weight={4}
            opacity={0.85}
            dashArray="6 6"
            className="route-line"
          />
        )}
        {canRoute && routeStatus === "calculating" && !hasRoute && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <span className="text-xs text-gray-600">Calculating route…</span>
          </div>
        )}
        {hasFarmer && (
          <Marker position={[farmerLocation.lat, farmerLocation.lng]} icon={PRIMARY_ICON}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-[#245C3A]">{farmerLabel}</div>
                <div className="text-xs text-muted">Current delivery location</div>
              </div>
            </Popup>
          </Marker>
        )}
        {hasCustomer && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={CUSTOMER_ICON}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-[#26352B]">{customerLabel}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      {canRoute && (
        <div className="mt-2 flex flex-col gap-1">
          {routeError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-100">
              {routeError}
            </div>
          )}
          {!routeError && routeInfo && (
            <div className="flex items-center gap-3 text-xs text-gray-700 bg-[#EAF2E7] rounded px-2 py-1 border border-[#BFD6C2]">
              <span className="font-semibold text-[#245C3A]">{formatDistance(routeInfo.distanceKm)}</span>
              <span className="text-gray-600">·</span>
              <span className="font-semibold text-[#26352B]">{formatDuration(routeInfo.durationMin)}</span>
              {routeInfo.calculatedAt && (
                <span className="text-gray-500">· {new Date(routeInfo.calculatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          )}
          {!routeError && !routeInfo && routeStatus === "idle" && canRoute && (
            <div className="text-xs text-gray-500">Route will appear once both locations are available</div>
          )}
        </div>
      )}
    </div>
  );
}
