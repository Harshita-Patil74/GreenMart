import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import farmerApi from "../../api/farmerApi";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import MessageFarmerModal from "../../components/messages/MessageFarmerModal.jsx";
import MapView from "../../components/map/MapView.jsx";
import { useSelector } from "react-redux";

export default function FarmerProfile() {
  const { id } = useParams();
  const { token } = useSelector((s) => s.auth);
  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [error, setError] = useState(null);
  const load = () => { setError(null); farmerApi.get(id).then((r) => setFarmer(r.data)).catch((e) => setError(e?.message || "Failed")); productApi.list({ farmer: id }).then((r) => setProducts(r.data.items || [])).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, [id]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!farmer) return <div>Loading...</div>;
  return (
    <div>
      <BackButton fallback="/farmers" />
      <h2 className="text-2xl font-heading mb-2">{farmer.farmName}</h2>
      <p className="text-muted">{farmer.address}</p>
      <p className="text-sm">{farmer.certification?.verifiedByAdmin ? "Verified certification" : "Certification pending"}</p>
      {farmer.location?.lat && <MapView height="240px" center={[farmer.location.lat, farmer.location.lng]} zoom={12} />}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
      <button onClick={() => { if (!token) window.location.href = "/login"; else setMsgOpen(true); }} className="mt-4 text-primary">Message farmer</button>
      <MessageFarmerModal open={msgOpen} onClose={() => setMsgOpen(false)} to={farmer.user?._id || id} product={null} />
    </div>
  );
}
