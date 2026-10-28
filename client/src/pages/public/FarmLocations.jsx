import React, { useState, useEffect } from "react";
import MapView, { FarmMarker } from "../../components/map/MapView.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import { DEMO_FARMS } from "../../data/demoCatalog.js";

const MAP =
  "https://images.unsplash.com/photo-1524661132064-c8c65e1d5d4c?auto=format&fit=crop&w=1400&q=60";

export default function FarmLocations() {
  const [farms, setFarms] = useState(DEMO_FARMS);
  const [selectedFarm, setSelectedFarm] = useState(DEMO_FARMS[0]);

  useEffect(() => {
    farmerApi
      .locations()
      .then((r) => {
        const d = r.data || [];
        if (d.length) {
          setFarms(d);
          setSelectedFarm(d[0]);
        }
      })
      .catch(() => { setFarms([]); setSelectedFarm(null); });
  }, []);

  const positions = [
    { top: "38%", left: "48%" },
    { top: "58%", left: "66%" },
    { top: "28%", left: "70%" },
  ];

  return (
    <div className="gm-container py-6 pb-16">
      <BackButton fallback="/farmers" />
      <h1 className="text-[24px] font-heading font-bold text-[#1F2937] mb-5">Farm Locations</h1>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#EEF1EF] shadow-card p-3">
          <MapView height="460px" center={selectedFarm?.location?.lat ? [selectedFarm.location.lat, selectedFarm.location.lng] : [20.59, 78.96]} zoom={selectedFarm?.location?.lat ? 10 : 5}>
            {farms.map((farm) => (
              <FarmMarker key={farm._id || farm.id} farm={farm} onClick={setSelectedFarm} />
            ))}
          </MapView>
        </div>

        <div className="bg-white rounded-[16px] border border-[#EEF1EF] shadow-card p-5">
          <h2 className="text-[15px] font-heading font-semibold mb-4">Nearby Farmers</h2>
          <div className="space-y-3">
            {farms.map((farm) => {
              const isSelected = (selectedFarm?.id || selectedFarm?._id) === (farm.id || farm._id);
              return (
                <button
                  key={farm.id || farm._id}
                  onClick={() => setSelectedFarm(farm)}
                  className={`w-full text-left p-3 rounded-xl border ${isSelected ? "border-primary bg-[#F3FBF6]" : "border-gray-100"}`}
                >
                  <div className="flex items-center gap-3">
                    <img src={farm.avatar || "/images/avatars/ramesh.jpg"} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{farm.farmName || farm.name}</p>
                      <p className="text-xs text-muted">{farm.address || farm.locationName}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
