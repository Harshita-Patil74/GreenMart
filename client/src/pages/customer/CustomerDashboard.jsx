import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgePercent, CalendarDays, CreditCard, Clock, Heart, Lock, Package, ShieldCheck, ShoppingBag, Ticket, Wallet } from "lucide-react";
import ProductCard from "../../components/product/ProductCard.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import productApi from "../../api/productApi";
import offerApi from "../../api/offerApi";
import newsletterApi from "../../api/newsletterApi";
import toast from "react-hot-toast";
import orderApi from "../../api/orderApi";
import { fetchWishlist } from "../../features/wishlist/wishlistSlice.js";
import { fetchCart } from "../../features/cart/cartSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { ChatAssistant } from "../../components/assistant/ChatAssistant.jsx";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import ContinuousMarquee from "../../components/common/ContinuousMarquee.jsx";
import {
  formatCurrency,
  formatDate,
} from "../../pages/farmer/farmerUtils.js";
import {
  sectionContainerVariants,
  sectionContentVariants,
  cardContainerVariants,
  cardItemVariants,
  cardHover,
  imageHover,
  badgeHover,
} from "../../components/common/motionVariants.jsx";
import { sectionReveal } from "../../animations/variants.js";
import { getImageUrl } from "../../utils/imageUrl.js";
import SubscriptionCheckout from "./SubscriptionCheckout.jsx";

const HERO_IMAGE = "/images/banners/hero-basket.jpg";

// Deduplicate items by stable _id, preserving first occurrence order
function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = item._id || item.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Minimum unique items required for infinite triple-copy carousel.
// Below this threshold, duplicates would be visible immediately on wide screens.
const MIN_ITEMS_FOR_INFINITE = 5;

export default function CustomerDashboard() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const wishlist = useSelector((state) => state.wishlist);
  const cart = useSelector((state) => state.cart);
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(null);
  const [activeOffers, setActiveOffers] = useState([]);
  const [newsletterPref, setNewsletterPref] = useState(null);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState(null);
  const [upcomingOffers, setUpcomingOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");
  const [exclusiveOffers, setExclusiveOffers] = useState([]);
  const [exclusiveOffersLoading, setExclusiveOffersLoading] = useState(false);
  const [exclusiveOffersError, setExclusiveOffersError] = useState(null);
  const [tab, setTab] = useState("active");
  const [serverTime, setServerTime] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const loadFeatured = async () => {
    setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const { data } = await productApi.storefront({ inStock: "true", limit: 1000 });
      setFeatured(dedupeById(Array.isArray(data?.items) ? data.items : []));
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

  const loadOffers = async () => {
    setOffersLoading(true);
    setOffersError("");
    try {
      const { data } = await offerApi.list();
      setActiveOffers(dedupeById(Array.isArray(data?.active) ? data.active : []));
      setUpcomingOffers(dedupeById(Array.isArray(data?.upcoming) ? data.upcoming : []));
      setServerTime(data.serverTime);
    } catch (requestError) {
      setActiveOffers([]);
      setUpcomingOffers([]);
      setOffersError(requestError?.message || "Couldn't load offers.");
    } finally {
      setOffersLoading(false);
    }
  };

  const loadNewsletterPreferences = async () => {
    if (user?.role !== "customer") return;
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const { data } = await newsletterApi.preferences();
      setNewsletterPref(data);
    } catch (requestError) {
      setPreferencesError(requestError?.message || "Couldn't load subscription preferences.");
      setNewsletterPref(null);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const loadExclusiveOffers = async () => {
    if (!subscription?.subscribed) {
      setExclusiveOffers([]);
      setExclusiveOffersLoading(false);
      setExclusiveOffersError(null);
      return;
    }
    setExclusiveOffersLoading(true);
    setExclusiveOffersError(null);
    try {
      const { data } = await newsletterApi.customerExclusiveOffers();
      setExclusiveOffers(Array.isArray(data?.items) ? data.items : []);
    } catch (requestError) {
      setExclusiveOffers([]);
      setExclusiveOffersError(requestError?.message || "Couldn't load exclusive offers.");
    } finally {
      setExclusiveOffersLoading(false);
    }
  };

  const handleSubscribe = () => {
    navigate("/customer/subscription-checkout");
  };

  const loadSubscription = async () => {
    if (user?.role !== "customer") return;
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    try {
      const { data } = await newsletterApi.subscriptionMe();
      setSubscription(data);
    } catch (requestError) {
      setSubscriptionError(requestError?.message || "Couldn't load subscription status.");
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleCheckout = () => {
    navigate("/customer/subscription-checkout");
  };

  const handleUnsubscribe = async () => {
    setNewsletterBusy(true);
    try {
      await newsletterApi.customerUnsubscribe();
      toast.success("You have successfully unsubscribed from GreenMart updates.");
      await loadNewsletterPreferences();
    } catch (error) {
      toast.error(error?.message || "Couldn't unsubscribe from GreenMart updates.");
    } finally {
      setNewsletterBusy(false);
    }
  };

  useEffect(() => {
    loadFeatured();
    loadOffers();
    loadOrders();
    loadNewsletterPreferences();
    loadSubscription();
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

  useEffect(() => {
    if (subscription?.subscribed) loadExclusiveOffers();
    else {
      setExclusiveOffers([]);
      setExclusiveOffersLoading(false);
      setExclusiveOffersError(null);
    }
  }, [subscription?.subscribed]);

  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? false : "visible";
  const activeOffersInfinite = activeOffers.length >= MIN_ITEMS_FOR_INFINITE;
  const upcomingOffersInfinite = upcomingOffers.length >= MIN_ITEMS_FOR_INFINITE;
  const featuredInfinite = featured.length >= MIN_ITEMS_FOR_INFINITE;

  return (
    <div className="space-y-4 pb-4 sm:pb-6 lg:pb-8">
      <section>
        <motion.div
          initial="hidden"
          animate={animate}
          variants={sectionContentVariants}
        >
          <h1 className="text-xl font-heading font-bold text-gray-900">Welcome back{user?.name ? `, ${user.name}` : ""}!</h1>
          <p className="mt-1 text-xs text-gray-500">Discover fresh, organic products for a healthier you.</p>
        </motion.div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {stats.map(({ label, value, to, icon: Icon, tone }) => (
            <motion.div
              key={label}
              initial="hidden"
              animate={animate}
              variants={cardItemVariants}
              whileHover={reducedMotion ? undefined : cardHover.hover}
              whileTap={reducedMotion ? undefined : cardHover.tap}
              to={to}
              className="rounded-xl border border-[#E8EEEA] bg-white p-3 shadow-sm cursor-pointer"
              onClick={() => navigate ? null : null}
            >
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-gray-500">{label}</span><span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}><Icon className="h-3.5 w-3.5" /></span></div>
              <div className="mt-2 truncate text-base font-bold text-gray-900">{value}</div>
              <span className="text-[10px] font-semibold text-primary">View details <ArrowRight className="ml-0.5 inline h-3 w-3" /></span>
            </motion.div>
          ))}
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-12">
        <motion.section
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="relative flex min-h-[190px] items-center overflow-hidden rounded-xl bg-[#134B35] lg:col-span-7"
        >
          <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#082C22]/90 via-[#082C22]/75 to-[#082C22]/35" />
          <div className="relative z-10 max-w-sm p-5 text-white sm:p-6">
            <h2 className="font-heading text-lg font-bold leading-snug text-white">Fresh Organic Products<br />Directly from Farmers</h2>
            <p className="mt-2 text-xs leading-5 text-white/85">Support local farmers · Eat healthier · Build a greener future</p>
            <Link to="/shop" className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white">Shop Now<ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </motion.section>

        <motion.section
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-5"
        >
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
        </motion.section>
      </div>

      <motion.div
        initial="hidden"
        animate={animate}
        variants={sectionContainerVariants}
      >
        <motion.div
          initial="hidden"
          animate={animate}
          variants={sectionContentVariants}
        >
          <section className="rounded-xl border border-[#E8EEEA] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Offers &amp; Discounts</h2>
                <p className="mt-0.5 text-[10px] text-gray-500">Current and upcoming offers from GreenMart farmers.</p>
              </div>
              <Link to="/customer/offers" className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#16803C] hover:text-[#0F6A3A]">
                View All Offers <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex gap-2 border-b border-gray-100 pb-2 mb-3">
              <button
                type="button"
                onClick={() => setTab("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tab === "active" ? "bg-[#16803C] text-white" : "border border-gray-200 bg-white text-[#64716B]"}`}
              >
                Active ({activeOffers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("upcoming")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${tab === "upcoming" ? "bg-[#16803C] text-white" : "border border-gray-200 bg-white text-[#64716B]"}`}
              >
                Coming Soon ({upcomingOffers.length})
              </button>
            </div>

            {offersError ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">{offersError}</p>
            ) : offersLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((key) => <div key={key} className="h-56 animate-pulse rounded-lg bg-gray-50" />)}
              </div>
            ) : tab === "active" ? (
              <div>
                <h3 className="text-[10px] font-semibold text-[#16803C] mb-2 uppercase tracking-wider">Active Offers</h3>
                {activeOffers.length ? (
                  <ContinuousMarquee speed={50} gap={20} itemWidth={220} minItemWidth={160} infinite={activeOffersInfinite}>
                    {activeOffers.map((offer) => (
                      <DashboardOfferCard key={offer._id} offer={offer} serverTime={serverTime} />
                    ))}
                  </ContinuousMarquee>
                ) : (
                  <p className="text-[10px] text-center text-gray-500 py-4">No active offers available right now.</p>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-[10px] font-semibold text-[#C2410C] mb-2 uppercase tracking-wider">Coming Soon</h3>
                {upcomingOffers.length ? (
                  <ContinuousMarquee speed={40} gap={20} itemWidth={220} minItemWidth={160} infinite={upcomingOffersInfinite}>
                    {upcomingOffers.map((offer) => (
                      <DashboardOfferCard key={offer._id} offer={offer} upcoming serverTime={serverTime} />
                    ))}
                  </ContinuousMarquee>
                ) : (
                  <p className="text-[10px] text-center text-gray-500 py-4">No upcoming offers at the moment.</p>
                )}
              </div>
            )}
          </section>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={animate}
        variants={sectionContainerVariants}
      >
        <motion.div
          initial="hidden"
          animate={animate}
          variants={sectionContentVariants}
        >
          <section className="rounded-xl border border-[#E8EEEA] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Exclusive Subscriber Offers</h2>
                <p className="mt-0.5 text-[10px] text-gray-500">Special promotions reserved for active newsletter subscribers.</p>
              </div>
            </div>

            {user?.role !== "customer" ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
                <Lock className="h-10 w-10 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-900">Customer Access Only</h3>
                <p className="text-[10px] text-gray-600 mb-3 max-w-xs text-center">
                  GreenMart Premium Newsletter is available exclusively to registered customer accounts. Your current {user?.role === "admin" ? "administrator" : "farmer"} account does not have access to customer subscription features.
                </p>
              </div>
            ) : preferencesLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((key) => (
                  <div key={key} className="h-56 animate-pulse rounded-lg bg-gray-50" />
                ))}
              </div>
            ) : subscription?.subscribed ? (
              <>
                {exclusiveOffersLoading ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((key) => (
                      <div key={key} className="h-56 animate-pulse rounded-lg bg-gray-50" />
                    ))}
                  </div>
                ) : exclusiveOffersError ? (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">
                    {exclusiveOffersError} <button onClick={loadExclusiveOffers} className="ml-2 font-semibold underline">Retry</button>
                  </p>
                ) : exclusiveOffers.length === 0 ? (
                  <p className="text-[10px] text-center text-gray-500 py-4">No exclusive subscriber offers available right now. Check back soon.</p>
                ) : (
                  <>
                    <h3 className="text-[10px] font-semibold text-[#16803C] mb-2 uppercase tracking-wider">Subscriber-Exclusive Offers</h3>
                    <ContinuousMarquee speed={40} gap={20} itemWidth={220} minItemWidth={160} infinite={exclusiveOffers.length >= MIN_ITEMS_FOR_INFINITE}>
                      {exclusiveOffers.map((offer) => (
                        <DashboardOfferCard key={offer._id} offer={offer} serverTime={serverTime} />
                      ))}
                    </ContinuousMarquee>
                  </>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-gray-100 bg-[#FAF8F1] p-6 text-center">
                <h3 className="text-xs font-semibold text-[#253933] mb-1">Premium Exclusive Offers</h3>
                <p className="text-[10px] text-gray-600 mb-3">
                  These special offers are available to active GreenMart Premium members. Visit the GreenMart Premium Newsletter section to unlock exclusive discounts.
                </p>
              </div>
            )}
          </section>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={animate}
        variants={sectionContainerVariants}
      >
        <motion.div
          initial="hidden"
          animate={animate}
          variants={sectionContentVariants}
        >
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-gray-900">Recommended for You</h2><p className="mt-0.5 text-[10px] text-gray-500">Fresh picks from GreenMart farmers.</p></div>
              <Link to="/shop" className="whitespace-nowrap text-[11px] font-semibold text-primary">View all <ArrowRight className="ml-0.5 inline h-3 w-3" /></Link>
            </div>
          </section>
        </motion.div>
        <motion.div
          initial="hidden"
          animate={animate}
          variants={cardContainerVariants}
        >
          {featuredLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((key) => <div key={key} className="h-36 animate-pulse rounded-lg bg-gray-50" />)}</div>
            : featuredError ? <ErrorState message={featuredError} onRetry={loadFeatured} />
            : featured.length ? <ContinuousMarquee speed={40} gap={20} itemWidth={200} minItemWidth={150} infinite={featuredInfinite}>
              {featured.map((product) => <ProductCard key={product._id} product={product} compact />)}
            </ContinuousMarquee>
              : <p className="rounded-lg bg-gray-50 p-5 text-center text-xs text-gray-500">No products are available right now.</p>}
        </motion.div>
      </motion.div>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-2">GreenMart Premium Newsletter</h2>
        <p className="mt-0.5 text-[10px] text-gray-500 mb-3">Paid monthly subscription — ₹199/month.</p>

        {user?.role !== "customer" ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
            <Lock className="h-10 w-10 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-900">Customer Access Only</h3>
            <p className="text-[10px] text-gray-600 mb-3 max-w-xs text-center">
              GreenMart Premium Newsletter is available exclusively to registered customer accounts. Your current {user?.role === "admin" ? "administrator" : "farmer"} account does not have access to customer subscription features.
            </p>
          </div>
        ) : subscriptionLoading ? (
          <div className="h-24 flex items-center justify-center text-xs text-gray-500">Loading subscription...</div>
        ) : subscriptionError ? (
          <div className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">
            {subscriptionError}
          </div>
        ) : subscription?.subscribed ? (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-bold text-[#16803C] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active
                </h3>
                <p className="text-[10px] text-gray-500">GreenMart Premium — Active</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2E7] text-[#14532D]`}>
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="border border-gray-100 rounded-lg p-3">
                <p className="text-[10px] text-gray-500">Start Date</p>
                <p className="text-xs font-semibold text-gray-900">
                  {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <div className="border border-gray-100 rounded-lg p-3">
                <p className="text-[10px] text-gray-500">Expiry Date</p>
                <p className="text-xs font-semibold text-gray-900">
                  {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-gray-500">Amount Paid</p>
              <p className="text-xs font-bold text-[#245C3A]">
                ₹{subscription.amount || 199} {subscription.currency || "INR"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/customer/newsletters" className="flex-1 h-8 rounded-lg bg-[#245C3A] flex items-center justify-center text-[10px] font-semibold text-white hover:bg-[#1E4A30]">
                View My Newsletters
              </Link>
              <Link to="/customer/offers" className="flex-1 h-8 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-[10px] font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
                Explore Exclusive Offers
              </Link>
            </div>
          </>
        ) : subscription?.status === "expired" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[#9A3412]" />
              <h3 className="text-xs font-bold text-[#9A3412]">Subscription Expired</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-3">
              Your GreenMart Premium subscription has expired. Renew to regain access to exclusive subscriber offers.
            </p>
            <button
              onClick={handleCheckout}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Renew for ₹199/month
            </button>
          </>
        ) : subscription?.status === "payment_failed" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-3.5 w-3.5 text-[#9A3412]" />
              <h3 className="text-xs font-bold text-[#9A3412]">Payment Failed</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-3">
              Your mock payment did not complete. Your subscription remains inactive.
            </p>
            <button
              onClick={handleCheckout}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Retry Payment — ₹199/month
            </button>
          </>
        ) : subscription?.status === "pending" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#F59E0B] text-[#F59E0B] animate-spin" />
              <h3 className="text-xs font-bold text-[#9A4E00]">Payment Pending</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-3">
              Your mock payment is awaiting confirmation. Please complete the payment to activate your subscription.
            </p>
            <button
              onClick={handleCheckout}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Complete Payment — ₹199/month
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-3.5 w-3.5 text-gray-500" />
              <h3 className="text-xs font-bold text-gray-900">Not Subscribed</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-3">
              Unlock GreenMart Premium for ₹199/month. Enjoy exclusive subscriber discounts, fresh harvest updates, and farmer stories.
            </p>
            <button
              onClick={handleCheckout}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Subscribe Now — ₹199/month
            </button>
            <p className="mt-2 text-[10px] text-[#82908B]">
              Mock payment demonstration — no real money will be charged.
            </p>
          </>
        )}
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        aria-label="AI Shopping Assistant"
      >
        <ChatAssistant />
      </motion.section>
    </div>
  );
}

function DashboardOfferCard({ offer, upcoming, serverTime }) {
  const product = offer.product || {};
  const farmerName = offer.farmer?.name || product.farmer?.name || "GreenMart Farmer";
  const unit = product.unit || "unit";
  const productId = product._id || product.id;
  const isExclusive = Boolean(offer.isSubscriberExclusive);
  const savingLabel = offer.discountType === "Percentage"
    ? `${offer.discountPercent}% OFF`
    : `Save ${formatCurrency(offer.discountAmount)}`;
  const exclusiveSavingLabel = offer.exclusiveDiscountType === "Percentage"
    ? `${Math.round((offer.exclusiveDiscountAmount ?? 0) / (offer.originalPrice ?? 1) * 100)}% OFF`
    : `Save ${formatCurrency(offer.exclusiveDiscountAmount ?? 0)}`;
  const requiredQuantity = Math.max(1, Number(offer.minimumQuantity) || 1);
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? false : "visible";

  return (
    <motion.div
      initial="hidden"
      animate={animate}
      variants={cardItemVariants}
      whileHover={reducedMotion ? undefined : cardHover.hover}
      whileTap={reducedMotion ? undefined : cardHover.tap}
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border p-2.5 ${isExclusive ? "border-[#E4E9E3] bg-[#F7FAF7]" : "border-[#E5EBE5] bg-white"}`}
    >
      <motion.div
        initial="hidden"
        animate={animate}
        variants={cardItemVariants}
        whileHover={reducedMotion ? undefined : imageHover.hover}
        className="relative h-20 overflow-hidden rounded-[8px] bg-[#F0F3EF] mb-2"
      >
        <ImageWithFallback
          src={getImageUrl(product.images?.[0])}
          alt={product.name || "Offer product"}
          className="h-full w-full object-cover"
        />
        <motion.span
          whileHover={reducedMotion ? undefined : badgeHover.hover}
          whileTap={reducedMotion ? undefined : badgeHover.tap}
          className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-[#16803C] px-2 py-0.5 text-[9px] font-semibold text-white"
        >
          <BadgePercent aria-hidden="true" className="h-2.5 w-2.5" /> {offer.type}
        </motion.span>
        {isExclusive && (
          <motion.span
            whileHover={reducedMotion ? undefined : badgeHover.hover}
            whileTap={reducedMotion ? undefined : badgeHover.tap}
            className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-[#245C3A] px-2 py-0.5 text-[9px] font-semibold text-white"
          >
            <BadgePercent aria-hidden="true" className="h-2.5 w-2.5" /> Subscriber Exclusive
          </motion.span>
        )}
        {upcoming && (
          <span className="absolute right-1 top-1 rounded-full bg-[#C2410C] px-2 py-0.5 text-[9px] font-semibold text-white">
            Coming Soon
          </span>
        )}
        {!upcoming && !isExclusive && (
          <span className="absolute right-1 top-1 rounded-full bg-[#16803C] px-2 py-0.5 text-[9px] font-semibold text-white">
            Active
          </span>
        )}
      </motion.div>
      <Link to={`/product/${productId}`} className="line-clamp-1 text-xs font-semibold text-[#22352B] hover:text-[#16803C] mb-1">
        {product.name}
      </Link>
      <p className="mt-0 truncate text-[9px] text-[#7A877F] mb-1.5">{farmerName}</p>
      <div className="flex flex-wrap items-baseline gap-x-1.5 mb-1.5">
        {isExclusive && offer.publicPrice != null && offer.exclusivePrice != null && offer.publicPrice > offer.exclusivePrice ? (
          <>
            <span className="text-[9px] text-gray-400 line-through">{formatCurrency(offer.publicPrice)} / {unit}</span>
            <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(offer.exclusivePrice)} / {unit}</span>
            <span className="rounded-full bg-[#14532D] px-1.5 py-0.5 text-[7px] font-bold leading-none text-white">{exclusiveSavingLabel}</span>
            {offer.additionalSavings != null && offer.additionalSavings > 0 && (
              <span className="text-[9px] font-bold text-[#14532D]">+{formatCurrency(offer.additionalSavings)} subscriber savings</span>
            )}
          </>
        ) : (
          <>
            <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(offer.offerPrice)} / {unit}</span>
            <span className="text-[9px] text-gray-400 line-through">{formatCurrency(offer.originalPrice)}</span>
            <span className="rounded-full bg-[#E6F7E9] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#13803D]">{savingLabel}</span>
          </>
        )}
      </div>
      {requiredQuantity > 1 && <p className="mt-0 text-[9px] leading-3 text-[#71817D] mb-1.5">At {requiredQuantity}+ {unit}</p>}
      <OfferCountdown
        startAt={offer.startAt || offer.startDate}
        endAt={offer.endAt || offer.endDate}
        status={offer.effectiveStatus || (upcoming ? "Upcoming" : "Active")}
        serverTime={serverTime}
      />
      <Link to={`/product/${productId}`} className="inline-flex h-7 items-center justify-center rounded-md border border-[#DDE8DF] text-[10px] font-semibold text-[#176B3B] w-full">
        View Product
      </Link>
    </motion.div>
  );
}
