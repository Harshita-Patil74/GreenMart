import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Star, Check, MapPin, ShoppingCart, Package } from "lucide-react";
import productApi from "../../api/productApi";
import reviewApi from "../../api/reviewApi.js";
import { addItem } from "../../features/cart/cartSlice.js";
import { getImageUrl } from "../../utils/imageUrl.js";
import ReviewList, { ReviewForm } from "../../components/product/ReviewList.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import NextButton from "../../components/common/NextButton.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await productApi.storefrontGet(id);
      setProduct(data);
    } catch (requestError) {
      setProduct(null);
      setError(requestError?.message || "Couldn't load this product.");
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewError(null);
    try {
      const { data } = await reviewApi.list(id);
      setReviews(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setReviewError(requestError?.message || "Couldn't load product reviews.");
    }
  };

  const loadEligibility = async () => {
    if (!user || user.role !== "customer") return;
    setEligibilityLoading(true);
    setEligibilityError(null);
    try {
      const { data } = await reviewApi.eligibility(id);
      setEligibility(data);
    } catch (requestError) {
      setEligibility(null);
      setEligibilityError(requestError?.message || "Couldn't check review eligibility.");
    } finally {
      setEligibilityLoading(false);
    }
  };

  useEffect(() => { loadProduct(); loadReviews(); loadEligibility(); }, [id, user]);

  const handleAddToCart = async () => {
    if (!product || Number(product.stock) <= 0 || adding) return;
    setAdding(true);
    try {
      await dispatch(addItem(product)).unwrap();
      toast.success(`Added ${product.name} to your cart.`);
    } catch (requestError) {
      toast.error(requestError?.message || "Couldn't add this product to your cart.");
    } finally {
      setAdding(false);
    }
  };

  const handleReviewSubmit = async (data) => {
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewApi.create(id, data);
      toast.success("Review submitted.");
      await loadReviews();
      await loadEligibility();
    } catch (requestError) {
      setReviewError(requestError?.message || "Couldn't submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="gm-container py-8 text-sm text-gray-500">Loading product...</div>;
  if (error) return <div className="gm-container py-6"><ErrorState message={error} onRetry={loadProduct} /></div>;
  if (!product) return null;

  const farmer = product.farmer;
  const farmerId = farmer?._id || farmer?.id || farmer;
  const image = product.images?.[0];
  const outOfStock = Number(product.stock) <= 0;
  const canReview = Boolean(user?.role === "customer");

  return (
    <div className="gm-container space-y-5 py-6 pb-16">
      <BackButton fallback="/shop" />
      <div className="grid gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2 md:p-5">
        <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-lg bg-gray-50">
          {image ? <img src={getImageUrl(image)} alt={product.name} className="h-full max-h-[440px] w-full object-cover" /> : <Package className="h-10 w-10 text-gray-300" />}
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{product.category}</p>
          <h1 className="mt-1 text-xl font-heading font-bold text-gray-900">{product.name}</h1>
          <div className="mt-2 flex items-baseline gap-1.5"><span className="text-xl font-bold text-primary">₹ {product.price}</span><span className="text-xs text-gray-500">/ {product.unit || "unit"}</span></div>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span>{product.ratingAverage == null ? "No rating" : Number(product.ratingAverage).toFixed(1)}</span><span>({product.ratingCount || 0} reviews)</span></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.isOrganic && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"><Check className="h-3 w-3" />Organic</span>}
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${outOfStock ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{outOfStock ? "Out of stock" : `${product.stock} in stock`}</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-600">{product.description || "No product description is available."}</p>
          <button onClick={handleAddToCart} disabled={outOfStock || adding} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"><ShoppingCart className="h-4 w-4" />{adding ? "Adding..." : outOfStock ? "Out of Stock" : "Add to Cart"}</button>
          <div className="mt-2"><NextButton to="/cart" label="View Cart" /></div>
          {farmer && typeof farmer === "object" && (
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                {farmer.avatar ? <img src={getImageUrl(farmer.avatar)} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><MapPin className="h-4 w-4 text-primary" /></div>}
                <div className="min-w-0"><p className="text-[10px] text-gray-400">Grown by</p><p className="truncate text-xs font-semibold text-gray-800">{farmer.name || "GreenMart farmer"}</p></div>
              </div>
              {farmerId && <button onClick={() => navigate(`/farmers/${farmerId}`)} className="shrink-0 text-[10px] font-semibold text-primary hover:underline">View farm</button>}
            </div>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Customer Reviews</h2><span className="text-[10px] text-gray-500">{reviews.length} review{reviews.length === 1 ? "" : "s"}</span></div>
        {reviewError ? <p role="alert" className="mb-3 text-xs text-red-700">{reviewError} <button onClick={loadReviews} className="font-semibold underline">Retry</button></p> : <ReviewList reviews={reviews} />}
        {canReview ? (
          eligibilityLoading ? <p className="mt-3 text-[11px] text-gray-500">Checking review eligibility...</p> :
          eligibilityError ? <p role="alert" className="mt-3 text-xs text-red-700">{eligibilityError} <button onClick={loadEligibility} className="font-semibold underline">Retry</button></p> :
          eligibility?.eligible ? <ReviewForm onSubmit={handleReviewSubmit} submitting={reviewSubmitting} /> :
          <p className="mt-3 text-[11px] text-gray-500">{eligibility?.reason === "already_reviewed" ? "You have already reviewed this product." : "You can review this product after your order item has been delivered."}</p>
        ) : <p className="mt-3 text-[11px] text-gray-500">Sign in as a customer to write a review.</p>}
      </section>
    </div>
  );
}
