import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Heart, Star } from "lucide-react";
import { addItem } from "../../features/cart/cartSlice.js";
import { fetchWishlist, toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import ImageWithFallback from "../common/ImageWithFallback.jsx";

export default function ProductCard({ product, showWishlist = true, compact = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const wishlist = useSelector((state) => state.wishlist);
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token") dispatch(fetchWishlist());
  }, [dispatch, token, user?.role]);

  if (!product) return null;

  const productId = product._id || product.id;
  const wished = wishlist.items.some((item) => (item._id || item.id || item.product?._id) === productId);
  const displayImage = product.images?.[0] || "/images/placeholder.svg";
  const unit = product.unit || "kg";
  const outOfStock = product.stock === 0;

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "customer") {
      toast.error("Wishlist is available to customer accounts.");
      return;
    }
    if (!token || token === "demo-token") {
      toast.error("Sign in to save products to your wishlist.");
      return;
    }
    try {
      await dispatch(toggleWishlist(product)).unwrap();
    } catch (error) {
      toast.error(error?.message || "Couldn't update your wishlist.");
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      await dispatch(addItem(product)).unwrap();
      toast.success(`Added ${product.name} to cart.`);
    } catch (error) {
      toast.error(error?.message || "Couldn't add this product to your cart.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/product/${productId}`)}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-[#EEF1EF] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:shadow-card-hover ${compact ? "p-1.5" : "p-2.5"}`}
    >
      <div className={`relative overflow-hidden rounded-[10px] bg-[#F6F7F6] ${compact ? "h-20 sm:h-24" : "h-[148px]"}`}>
        <ImageWithFallback src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {showWishlist && (
          <button
            onClick={handleWishlist}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className={`absolute right-2 top-2 flex items-center justify-center rounded-full bg-white shadow ${compact ? "h-6 w-6" : "h-7 w-7"}`}
          >
            <Heart className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${wished ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "mt-1.5" : "mt-2.5"}`}>
        <h3 className={`line-clamp-1 font-medium leading-snug text-[#1F2937] ${compact ? "text-[11px]" : "text-[15px]"}`}>{product.name}</h3>
        <div className={`font-bold text-[#0F3D2E] ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-[16px]"}`}>₹ {product.price} / {unit}</div>
        {!compact && <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Star className="w-3 h-3 fill-[#F5B301] text-[#F5B301]" />
          <span className="font-medium text-[#1F2937]">{Number(product.ratingCount) > 0 ? Number(product.ratingAverage || 0).toFixed(1) : "New"}</span>
          <span>({Number(product.ratingCount) || 0})</span>
        </div>}
        <button
          onClick={handleAdd}
          disabled={outOfStock || adding}
          className={`w-full rounded-[8px] font-medium ${compact ? "mt-1.5 h-7 text-[10px]" : "mt-auto mt-3 h-9 text-[13px]"} ${
            outOfStock ? "bg-gray-200 text-gray-500" : "bg-primary hover:bg-primary-hover text-white"
          }`}
        >
          {outOfStock ? "Out of Stock" : adding ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
