import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowRight, BadgePercent, CalendarDays, Heart, Package, ShoppingBag, Wallet } from "lucide-react";
import ProductCard from "../../components/product/ProductCard.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import productApi from "../../api/productApi";
import orderApi from "../../api/orderApi";
import { fetchWishlist } from "../../features/wishlist/wishlistSlice.js";
import { addItem, fetchCart } from "../../features/cart/cartSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { ChatAssistant } from "../../components/assistant/ChatAssistant.jsx";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import { formatCurrency } from "../../utils/constants.js";
import { getImageUrl } from "../../utils/imageUrl.js";

const HERO_IMAGE = "/images/banners/hero-basket.jpg";

export default function CustomerDashboard() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const wishlist = useSelector((state) => state.wishlist);
  const cart = useSelector((state) => state.cart);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(null);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [featuredOffersLoading, setFeaturedOffersLoading] = useState(true);
  const [featuredOffersError, setFeaturedOffersError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const loadFeatured = async () => {
    setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const { data } = await productApi.storefront({ limit: 5, inStock: "true" });
      setFeatured(Array.isArray(data?.items) ? data.items : []);
    } catch (requestError) {
      setFeaturedError(requestError?.message || "Couldn't load recommended products.");
      setFeatured([]);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data } = await orderApi.mine();
      setOrders(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setOrdersError(requestError?.message || "Couldn't load recent orders.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadFeaturedOffers = async () => {
    setFeaturedOffersLoading(true);
    setFeaturedOffersError("");
    try {
      const { data } = await productApi.storefrontOffers();
      const activeOffers = Array.isArray(data?.items)
        ? data.items.filter((offer) => offer.effectiveStatus === "Active" && offer.product?.stock > 0).slice(0, 4)
        : [];
      setFeaturedOffers(activeOffers);
    } catch (requestError) {
      setFeaturedOffers([]);
      setFeaturedOffersError(requestError?.message || "Couldn't load featured offers.");
    } finally {
      setFeaturedOffersLoading(false);
    }
  };

  useEffect(() => {
    loadFeatured();
    loadFeaturedOffers();
    loadOrders();
    if (user?.role === "customer" && token && token !== "demo-token") dispatch(fetchWishlist());
  }, [dispatch, token, user?.role]);

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !cart.loaded) dispatch(fetchCart());
  }, [dispatch, token, user?.role, cart.loaded]);

  const totalSpent = orders.reduce((sum, order) => sum + (order.status === "Cancelled" ? 0 : Number(order.total || 0)), 0);
  const cartItemCount = (cart.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const cartCountLoading = cart.loading || (Boolean(token && token !== "demo-token") && !cart.loaded);
  const stats = [
    { label: "Total Orders", value: ordersLoading || ordersError ? "—" : orders.length, to: "/customer/orders", icon: Package, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Total Spent", value: ordersLoading || ordersError ? "—" : formatCurrency(totalSpent), to: "/customer/orders", icon: Wallet, tone: "bg-blue-50 text-blue-700" },
    { label: "Wishlist", value: wishlist.loading || wishlist.error ? "—" : wishlist.items.length, to: "/customer/wishlist", icon: Heart, tone: "bg-rose-50 text-rose-600" },
    { label: "Active Cart Items", value: cart.error || cartCountLoading ? "—" : cartItemCount, to: "/cart", icon: ShoppingBag, tone: "bg-amber-50 text-amber-700" },
  ];
  const latestOrder = orders[0];

  return (
    <div className="space-y-4 pb-4 sm:pb-6 lg:pb-8">
      <section>
        <h1 className="text-xl font-heading font-bold text-gray-900">Welcome back{user?.name ? `, ${user.name}` : ""}!</h1>
        <p className="mt-1 text-xs text-gray-500">Discover fresh, organic products for a healthier you.</p>
      </section>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {stats.map(({ label, value, to, icon: Icon, tone }) => (
            <Link key={label} to={to} className="rounded-xl border border-[#E8EEEA] bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-gray-500">{label}</span><span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}><Icon className="h-3.5 w-3.5" /></span></div>
              <div className="mt-2 truncate text-base font-bold text-gray-900">{value}</div>
              <span className="text-[10px] font-semibold text-primary">View details <ArrowRight className="ml-0.5 inline h-3 w-3" /></span>
            </Link>
          ))}
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-12">
        <section className="relative flex min-h-[190px] items-center overflow-hidden rounded-xl bg-[#134B35] lg:col-span-7">
          <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#082C22]/90 via-[#082C22]/75 to-[#082C22]/35" />
          <div className="relative z-10 max-w-sm p-5 text-white sm:p-6">
            <h2 className="font-heading text-lg font-bold leading-snug text-white">Fresh Organic Products<br />Directly from Farmers</h2>
            <p className="mt-2 text-xs leading-5 text-white/85">Support local farmers · Eat healthier · Build a greener future</p>
            <Link to="/shop" className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white">Shop Now<ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/customer/orders" className="text-[11px] font-semibold text-primary">View all <ArrowRight className="ml-0.5 inline h-3 w-3" /></Link>
          </div>
          {ordersError ? <p role="alert" className="p-4 text-xs text-red-700">{ordersError}</p> : ordersLoading ? <p className="p-4 text-xs text-gray-500">Loading orders...</p> : orders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-[10px]">
                <thead><tr className="bg-gray-50 text-[9px] font-semibold uppercase tracking-wide text-gray-500"><th className="px-3 py-2">Order ID</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{orders.slice(0, 3).map((order) => {
                return <tr key={order._id}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-900">#{order.orderNumber}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                  <td className="px-3 py-2.5"><Link to={`/track-order/${order._id}`} className="inline-flex items-center gap-1"><OrderStatusBadge status={order.status} /><ArrowRight className="ml-1 h-3 w-3" /></Link></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(order.total || 0)}</td>
                </tr>;
              })}</tbody>
              </table>
            </div>
          ) : <div className="p-6 text-center text-xs text-gray-500">No orders yet. <Link to="/shop" className="font-semibold text-primary">Explore the shop</Link></div>}
        </section>
      </div>

      {(featuredOffersLoading || featuredOffersError || featuredOffers.length > 0) && (
        <section className="rounded-xl border border-[#E8EEEA] bg-white p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Fresh Deals from Our Farmers</h2>
              <p className="mt-0.5 text-[10px] text-gray-500">Discover fresh organic products at special prices.</p>
            </div>
            <Link to="/customer/offers" className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#16803C] hover:text-[#0F6A3A]">
              View All Offers <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </Link>
          </div>
          {featuredOffersLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-60 animate-pulse rounded-xl bg-gray-50" />)}
            </div>
          ) : featuredOffersError ? (
            <p role="status" className="rounded-lg bg-gray-50 p-4 text-center text-xs text-gray-500">{featuredOffersError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {featuredOffers.map((offer) => (
                <FeaturedOfferCard
                  key={offer._id}
                  offer={offer}
                  onAdd={async () => {
                    try {
                      await dispatch(addItem(offer.product)).unwrap();
                      toast.success(`Added ${offer.product.name} to your cart.`);
                    } catch (requestError) {
                      toast.error(requestError?.message || "Couldn't add this product to your cart.");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-gray-900">Recommended for You</h2><p className="mt-0.5 text-[10px] text-gray-500">Fresh picks from GreenMart farmers.</p></div>
          <Link to="/shop" className="whitespace-nowrap text-[11px] font-semibold text-primary">View all <ArrowRight className="ml-0.5 inline h-3 w-3" /></Link>
        </div>
        {featuredLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((key) => <div key={key} className="h-36 animate-pulse rounded-lg bg-gray-50" />)}</div>
          : featuredError ? <ErrorState message={featuredError} onRetry={loadFeatured} />
            : featured.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{featured.map((product) => <ProductCard key={product._id} product={product} compact />)}</div>
              : <p className="rounded-lg bg-gray-50 p-5 text-center text-xs text-gray-500">No products are available right now.</p>}
      </section>

      <section aria-label="AI Shopping Assistant">
        <ChatAssistant />
      </section>
    </div>
  );
}

function FeaturedOfferCard({ offer, onAdd }) {
  const product = offer.product || {};
  const farmerName = offer.farmer?.name || product.farmer?.name || "GreenMart farmer";
  const savingLabel = offer.discountType === "Percentage"
    ? `${offer.discountPercent}% OFF`
    : `Save ${formatCurrency(offer.discountAmount)}`;
  const requiredQuantity = Math.max(1, Number(offer.minimumQuantity) || 1);
  const unit = product.unit || "unit";
  const productId = product._id;
  const [adding, setAdding] = useState(false);

  const addToCart = async () => {
    if (adding || Number(product.stock) < requiredQuantity) return;
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E5EBE5] bg-white">
      <Link to={`/product/${productId}`} className="relative block h-24 overflow-hidden bg-[#F3F6F3] sm:h-32">
        <ImageWithFallback src={getImageUrl(product.images?.[0])} alt={product.name || "Offer product"} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#16803C] px-2 py-1 text-[9px] font-semibold text-white">
          <BadgePercent aria-hidden="true" className="h-3 w-3" /> {offer.type}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#16803C]">{savingLabel}</span>
      </Link>
      <div className="flex flex-1 flex-col p-2.5">
        <Link to={`/product/${productId}`} className="line-clamp-1 text-xs font-semibold text-[#22352B] hover:text-[#16803C]">
          {product.name}
        </Link>
        <p className="mt-0.5 truncate text-[10px] text-[#7A877F]">{farmerName}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(offer.offerPrice)} / {unit}</span>
          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(offer.originalPrice)}</span>
        </div>
        {requiredQuantity > 1 && <p className="mt-1 text-[9px] leading-3 text-[#71817D]">At {requiredQuantity}+ {unit}</p>}
        <p className="mt-1 flex items-center gap-1 text-[9px] text-[#71817D]">
          <CalendarDays aria-hidden="true" className="h-3 w-3 shrink-0" />
          Ends {new Date(offer.endDate).toLocaleDateString("en-IN")}
        </p>
        <p className="mt-0.5 text-[9px] text-[#71817D]">{product.stock} in stock</p>
        <div className="mt-auto grid grid-cols-1 gap-1.5 pt-2">
          <Link to={`/product/${productId}`} className="inline-flex h-7 items-center justify-center rounded-md border border-[#DDE8DF] text-[10px] font-semibold text-[#176B3B]">View Product</Link>
          <button type="button" onClick={addToCart} disabled={adding || Number(product.stock) < requiredQuantity} className="h-7 rounded-md bg-[#16803C] text-[10px] font-semibold text-white hover:bg-[#0F6A3A] disabled:cursor-not-allowed disabled:bg-gray-300">
            {adding ? "Adding…" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
