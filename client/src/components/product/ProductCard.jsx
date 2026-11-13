import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { addItem } from "../../features/cart/cartSlice.js";
import { fetchWishlist, toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import ImageWithFallback from "../common/ImageWithFallback.jsx";
import OfferCountdown from "../offers/OfferCountdown.jsx";
import {
  cardHover,
  imageHover,
  cardItemVariants,
  wishlistButtonVariants,
  addToCartButtonVariants,
} from "../common/motionVariants.jsx";

export default function ProductCard({ product, showWishlist = true, compact = false, serverTime }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const wishlist = useSelector((state) => state.wishlist);
  const [adding, setAdding] = React.useState(false);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token") dispatch(fetchWishlist());
  }, [dispatch, token, user?.role]);

  if (!product) return null;

  const productId = product._id || product.id;
  const wished = wishlist.items.some((item) => (item._id || item.id || item.product?._id) === productId);
  const displayImage = product.images?.[0] || product.image || "/images/placeholder.svg";
  const unit = product.unit || "kg";
  const outOfStock = product.stock === 0;
  const offer = product.offer;
  const offerPrice = offer?.appliesToSingleUnit ? offer.offerPrice : offer?.minimumEligiblePrice;
  const hasPremiumExtra = Number(offer?.premiumDiscountAmount) > 0;
  const isExclusive = Boolean(offer?.audience?.includes("premium"));
  const offerLabel = offer
    ? offer.discountType === "Percentage"
      ? `${hasPremiumExtra ? "Regular " : ""}${offer.discountPercent}% OFF`
      : `${hasPremiumExtra ? "Regular " : ""}Save ₹${Number(offer.discountAmount || 0).toFixed(2)}`
    : "";

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
      toast.error("Sign in to save products to your cart.");
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

  const animate = reducedMotion ? false : "visible";

  return (
    <motion.div
      initial="hidden"
      animate={animate}
      variants={cardItemVariants}
      whileHover={reducedMotion ? undefined : cardHover.hover}
      whileTap={reducedMotion ? undefined : cardHover.tap}
      onClick={() => navigate(`/product/${productId}`)}
      className={`flex cursor-pointer flex-col min-h-full overflow-hidden rounded-[14px] border border-[#EEF1EF] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${compact ? "p-1.5" : "p-2.5"}`}
    >
      <motion.div
        initial="hidden"
        animate={animate}
        variants={cardItemVariants}
        whileHover={reducedMotion ? undefined : imageHover.hover}
        className={`relative overflow-hidden rounded-[10px] bg-[#F6F7F6] ${compact ? "h-20 sm:h-24" : "h-[148px]"}`}
      >
        <ImageWithFallback src={displayImage} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {offer && <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-[#16803C] px-2 py-1 text-[9px] font-bold text-white">{offerLabel}</span>}
          {isExclusive && <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-[#245C3A] px-2 py-1 text-[9px] font-bold text-white">Premium Exclusive</span>}
        </div>
        {showWishlist && (
          <motion.button
            whileHover={reducedMotion ? undefined : wishlistButtonVariants.hover}
            whileTap={reducedMotion ? undefined : wishlistButtonVariants.tap}
            onClick={handleWishlist}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-white shadow h-7 w-7"
          >
            <Heart className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${wished ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </motion.button>
        )}
      </motion.div>
      <div className={`flex flex-1 flex-col ${compact ? "mt-1.5" : "mt-2.5"}`}>
        <h3 className={`line-clamp-1 font-medium leading-snug text-[#1F2937] ${compact ? "text-[11px]" : "text-[15px]"}`}>{product.name}</h3>
        <div className={`font-bold text-[#0F3D2E] ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-[16px]"}`}>
          {offer ? (
            <><span>₹ {Number(offerPrice).toFixed(2)}</span><span className="ml-1 text-[10px] font-normal text-gray-400 line-through">₹ {Number(product.price).toFixed(2)}</span><span className="ml-1 text-[10px] font-normal">/ {unit}</span></>
          ) : <>₹ {product.price} / {unit}</>}
        </div>
        {offer && <p className="mt-1 line-clamp-1 text-[9px] font-medium text-[#16803C]" title={`${offer.title} · ${offer.type}`}>
          {offer.title} · {offer.type}{Number(offer.minimumQuantity) > 1 ? ` · min ${offer.minimumQuantity}` : Number(offer.minimumAmount) > 0 ? ` · min cart ₹${Number(offer.minimumAmount)}` : ""}
        </p>}
        {Number(offer?.premiumDiscountAmount) > 0 && (
          <p className="mt-1 break-words text-[9px] font-medium leading-3 text-[#52645D]">
            Premium members save extra ₹{Number(offer.premiumDiscountAmount).toFixed(2)} / {unit}
          </p>
        )}
        {offer && offer.startAt && offer.effectiveStatus !== "Pending" && offer.effectiveStatus !== "Rejected" && offer.effectiveStatus !== "Inactive" && (
          <div className="mt-1 flex items-center gap-1">
            <OfferCountdown startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} serverTime={serverTime} />
          </div>
        )}
        {!compact && <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Star className="w-3 h-3 fill-[#F5B301] text-[#F5B301]" />
          <span className="font-medium text-[#1F2937]">{Number(product.ratingCount) > 0 ? Number(product.ratingAverage || 0).toFixed(1) : "New"}</span>
          <span>({Number(product.ratingCount) || 0})</span>
        </div>}
        <motion.button
          whileHover={reducedMotion ? undefined : addToCartButtonVariants.hover}
          whileTap={reducedMotion ? undefined : addToCartButtonVariants.tap}
          onClick={handleAdd}
          disabled={outOfStock || adding}
          className={`w-full rounded-[8px] font-medium ${compact ? "mt-1.5 h-7 text-[10px]" : "mt-3 h-9 text-[13px]"} ${
            outOfStock ? "bg-gray-200 text-gray-500" : "bg-primary hover:bg-primary-hover text-white"
          }`}
        >
          {outOfStock ? "Out of Stock" : adding ? "Adding..." : "Add to Cart"}
        </motion.button>
      </div>
    </motion.div>
  );
}