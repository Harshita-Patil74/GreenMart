import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
const icon = divIcon({ className: "bg-primary rounded-full w-4 h-4 border-2 border-white" });

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [pos, setPos] = useState(value || null);
  const handle = (lat, lng) => { setPos({ lat, lng }); onChange && onChange({ lat, lng }); };
  return (
    <div className="h-64 rounded-card overflow-hidden border border-border">
      <MapContainer center={pos ? [pos.lat, pos.lng] : [20.5937, 78.9629]} zoom={pos ? 12 : 4} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <ClickHandler onPick={handle} />
        {pos && <Marker position={[pos.lat, pos.lng]} icon={icon} />}
      </MapContainer>
    </div>
  );
}
