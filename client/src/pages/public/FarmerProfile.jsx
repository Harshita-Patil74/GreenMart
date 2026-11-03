import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, Star } from "lucide-react";
import farmerApi from "../../api/farmerApi";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import MessageFarmerModal from "../../components/messages/MessageFarmerModal.jsx";
import MapView from "../../components/map/MapView.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";
import { useSelector } from "react-redux";

export default function FarmerProfile() {
  const { id } = useParams();
  const { token } = useSelector((s) => s.auth);
  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        farmerApi.get(id)
          .then((r) => setFarmer(r.data || null))
          .catch((e) => { setFarmer(null); setError(e?.response?.data?.message || e?.message || "Failed to load farmer details."); }),
        productApi.storefront({ farmer: id })
          .then((r) => setProducts(Array.isArray(r.data?.items) ? r.data.items : []))
          .catch(() => setProducts([])),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (isLoading && !farmer) return <div className="flex flex-col items-center justify-center py-10 text-xs text-gray-500">Loading farmer details…</div>;
  if (!farmer) return <ErrorState message="Farmer not found" onRetry={() => { window.location.href = "/farmers"; }} />;

  const user = farmer.user || {};
  const isVerified = farmer.certification?.verifiedByAdmin === true;

  return (
    <div className="gm-container py-6 space-y-6 pb-12">
      <BackButton fallback="/farmers" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={getImageUrl(user.avatar || farmer.photo)}
            alt={farmer.farmName}
            className="w-16 h-16 rounded-2xl object-cover bg-emerald-100 border-2 border-emerald-200 shadow-sm shrink-0"
            onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }}
          />
          <div>
            <h1 className="font-heading font-bold text-gray-900 text-lg">{farmer.farmName}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">{user.name || "Farmer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {farmer.category || "Organic Produce"}
          </span>
          {isVerified ? (
            <span className="text-xs flex items-center gap-0.5 text-emerald-700 font-semibold"><ShieldCheck className="w-3 h-3" /> Verified</span>
          ) : isRejected ? (
            <span className="text-xs flex items-center gap-0.5 text-red-700 font-semibold"><CircleX className="w-3 h-3" /> Rejected</span>
          ) : (
            <span className="text-xs flex items-center gap-0.5 text-amber-700 font-semibold"><Star className="w-3 h-3" /> Pending verification</span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading font-bold text-gray-900 mb-2">Farm details</h2>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-900 mr-1">Address:</span>{farmer.address || "Not available"}</p>
          {farmer.description && <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-900 mr-1">About:</span>{farmer.description}</p>}
          {farmer.location?.lat && farmer.location?.lng && (
            <div className="mt-3"><MapView height="240px" center={[farmer.location.lat, farmer.location.lng]} zoom={12} /></div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading font-bold text-gray-900 mb-2">Certification</h2>
          {isVerified ? (
            <>
              <p className="text-sm text-gray-600 mb-1">Admin-verified farmer certification.</p>
              <p className="text-xs font-semibold text-emerald-700">Verification status: Verified by admin</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-1">No admin-verified certification on file.</p>
              <p className="text-xs font-semibold text-amber-700">Verification status: Pending admin verification</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-gray-900">Products</h2>
            <Link to="/farmers" className="text-xs font-semibold text-[#16803C] hover:underline">Back to farmers</Link>
          </div>
          {products.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No approved and active products available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => <ProductCard key={p._id} product={p} compact />)}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => { if (!token) window.location.href = "/login"; else setMsgOpen(true); }}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16803C] text-white font-semibold hover:bg-[#0e6a32]"
      >
        Message farmer
      </button>
      <MessageFarmerModal open={msgOpen} onClose={() => setMsgOpen(false)} to={user._id || id} product={null} />
    </div>
  );
}
