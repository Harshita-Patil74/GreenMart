import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";

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
  const icon = divIcon({ className: "bg-primary rounded-full w-4 h-4 border-2 border-white" });
  return (
    <Marker position={[lat, lng]} icon={icon} eventHandlers={{ click: () => onClick && onClick(farm) }}>
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

export function DeliveryRouteMap({ order }) {
  if (!order?.coordinates) return <div className="text-muted text-sm">Map unavailable for this order</div>;
  return <div className="text-muted text-sm">Route map placeholder</div>;
}
