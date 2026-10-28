import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight, ShieldCheck, Tractor } from "lucide-react";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";

export default function Farmers() {
const [farmers, setFarmers] = useState([]);
  useEffect(() => {
    farmerApi.list().then((r) => {
      const d = r.data || [];
      if (d.length) setFarmers(d);
    }).catch(() => setFarmers([]));
  }, []);

  return (
    <div className="gm-container py-6 space-y-6 pb-12">
      <BackButton fallback="/" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-gray-900 tracking-tight">
            Our Organic Farmers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Meet the hardworking families cultivating pure, healthy food in and around Gadag, Karnataka.
          </p>
        </div>
        <Link
          to="/farm-locations"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-[#16803C] hover:bg-emerald-100 font-semibold text-xs border border-emerald-200 transition"
        >
          <MapPin className="w-4 h-4" />
          <span>View on Interactive Map</span>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {farmers.map((farm) => (
          <div
            key={farm.id || farm._id}
            className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-lg transition overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={getImageUrl(farm.photo || farm.user?.avatar)}
                  alt={farm.farmName || farm.name}
                  className="w-16 h-16 rounded-2xl object-cover bg-emerald-100 border-2 border-emerald-200 shadow-sm shrink-0"
                  onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }}
                />
                <div>
                  <h3 className="font-heading font-bold text-gray-900 text-lg">
                    {farm.farmName || farm.name}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#16803C]" />
                    <span>{farm.address || farm.locationName || farm.city || "Gadag, Karnataka"}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {farm.category || farm.speciality || "Organic Produce"}
                    </span>
                    <span className="text-amber-500 text-xs font-bold flex items-center gap-0.5">
                      ★ {farm.rating || 4.8}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {farm.description || "Dedicated to regenerative, chemical-free agriculture. Delivering daily harvests directly to GreenMart consumers."}
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                {farm.distance || "Gadag District"}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  to={`/farmers/${farm.user?._id || farm.user || farm._id}`}
                  className="font-bold text-[#16803C] hover:underline flex items-center gap-1"
                >
                  <span>Explore Farm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
