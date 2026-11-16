import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import NextButton from "../../components/common/NextButton.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import CartTable from "../../components/cart/CartTable.jsx";
import OrderSummary from "../../components/cart/OrderSummary.jsx";
import { fetchCart, updateQuantity, removeItem, clearItemError } from "../../features/cart/cartSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { calculateCartTotals } from "../../utils/cartTotals.js";
import addressApi from "../../api/addressApi";
import orderApi from "../../api/orderApi";

const itemId = (item) => item.product?._id || item.product?.id || item.product || item.id;

export default function Cart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { items, loading, error, deliveryCharge: cartDeliveryCharge } = cart;
  const itemPending = cart.itemPending || {};
  const { user, token } = useSelector((state) => state.auth);
  const hasCustomerMobileNavigation = user?.role === "customer";

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState(null);
  const [cartQuote, setCartQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
  const [allServiceable, setAllServiceable] = useState(true);
  const quoteRequestId = useRef(0);

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !cart.loaded) dispatch(fetchCart());
  }, [dispatch, user?.role, token, cart.loaded]);

  const loadAddresses = async () => {
    setAddressLoading(true);
    setAddressError(null);
    try {
      const { data } = await addressApi.list();
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setAddresses(list);
      setSelectedAddressId((current) => current || list.find((a) => a.isDefault)?.id || list[0]?._id || "");
    } catch (requestError) {
      setAddressError(requestError?.response?.data?.message || requestError?.message || "Couldn't load your saved addresses.");
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token") loadAddresses();
  }, [user?.role, token]);

  const loadCartQuote = useCallback(async () => {
    if (!selectedAddressId || !items.length) {
      setCartQuote(null);
      return;
    }
    const requestId = quoteRequestId.current + 1;
    quoteRequestId.current = requestId;
    setQuoteLoading(true);
    setQuoteError(null);
    setCartQuote(null);
    try {
      const { data } = await orderApi.quote({ addressId: selectedAddressId, deliveryOption: selectedDeliveryOption });
      const quote = {
        items: Array.isArray(data?.items) ? data.items : null,
        subtotal: Number(data?.subtotal),
        regularDiscount: data?.regularDiscount == null ? undefined : Number(data.regularDiscount),
        premiumDiscount: data?.premiumDiscount == null ? undefined : Number(data.premiumDiscount),
        discount: Number(data?.discount),
        deliveryCharge: Number(data?.deliveryCharge),
        total: Number(data?.total),
        distanceKm: Number(data?.distanceKm),
        deliveryOption: data?.deliveryOption,
        quoteVersion: data?.quoteVersion,
        allServiceable: data?.allServiceable,
        shipments: data?.shipments,
      };
      if ([quote.subtotal, quote.discount, quote.deliveryCharge, quote.total]
        .some((amount) => !Number.isFinite(amount) || amount < 0)) {
        throw new Error("The payable amount is unavailable. Please try again.");
      }
      if (requestId !== quoteRequestId.current) return;
      setCartQuote(quote);
      setAllServiceable(Boolean(quote.allServiceable));
      setDeliveryDistance(quote.distanceKm);
      setDeliveryOptions([]);
      const defaultOption = quote.deliveryOption;
      if (defaultOption && !selectedDeliveryOption) setSelectedDeliveryOption(defaultOption);
    } catch (err) {
      if (requestId !== quoteRequestId.current) return;
      setCartQuote(null);
      setAllServiceable(false);
      setQuoteError(err?.response?.data?.message || err?.message || "Couldn't validate your delivery charge.");
    } finally {
      if (requestId === quoteRequestId.current) setQuoteLoading(false);
    }
  }, [selectedAddressId, items, selectedDeliveryOption]);

  useEffect(() => {
    if (selectedAddressId && items.length && user?.role === "customer" && token && token !== "demo-token") {
      loadCartQuote();
    } else {
      setCartQuote(null);
      setQuoteLoading(false);
      setAllServiceable(true);
    }
  }, [selectedAddressId, items, loadCartQuote, token, user?.role]);

  useEffect(() => {
    if (cart.loaded && error) {
      toast.error(error);
      dispatch(clearItemError());
    }
  }, [cart.loaded, error, dispatch]);

  const localTotals = calculateCartTotals(items, cartQuote?.deliveryCharge ?? cartDeliveryCharge ?? 0);
  const summary = cartQuote || { subtotal: localTotals.subtotal, regularDiscount: localTotals.regularDiscount, premiumDiscount: localTotals.premiumDiscount, discount: localTotals.discount, deliveryCharge: cartQuote?.deliveryCharge ?? localTotals.deliveryCharge, total: localTotals.total };
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);
  const deliveryReady = cartQuote
    ? Boolean(cartQuote.allServiceable !== false) && Number.isFinite(cartQuote.deliveryCharge) && cartQuote.deliveryCharge >= 0
    : localTotals.deliveryReady && !quoteLoading;
  const canCheckout = Boolean(cart.loaded)
    && !error
    && Boolean(items.length);

  const handleCheckout = () => {
    if (user?.role !== "customer" || !token || token === "demo-token") {
      toast.error("Sign in to checkout.");
      navigate("/login");
      return;
    }
    if (!items.length) {
      toast.error("Your cart is empty.");
      return;
    }
    if (cartQuote && !selectedAddress) {
      toast.error("Please add a delivery address before continuing.");
      return;
    }
    navigate("/checkout");
  };

  const itemsWithPending = items.map((item) => ({
    ...item,
    _pending: Boolean(itemPending[itemId(item)]),
  }));

  if (loading && !cart.loaded) return <div className="gm-container py-6 text-sm text-gray-500">Loading your cart...</div>;
  if (error && !cart.loaded) return <div className="gm-container py-6"><ErrorState message={error} onRetry={() => dispatch(fetchCart())} /></div>;

  return (
    <div className={`gm-container w-full max-w-none min-w-0 py-4 sm:py-6 ${hasCustomerMobileNavigation ? "pb-24 lg:pb-16" : "pb-16"}`}>
      <BackButton fallback="/shop" />
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="mb-5 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 sm:text-3xl">Your Cart</h1>
          <p className="mt-1 text-sm text-gray-500">Review your items and savings before checkout.</p>
        </div>
        {items.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <ShoppingBag className="h-4 w-4" />
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </motion.div>
      {quoteError && <p role="alert" className="mb-3 rounded-lg bg-[#FBEDE5] px-3 py-2 text-xs text-[#D92D20]">{quoteError} <button onClick={loadCartQuote} className="font-semibold underline">Retry</button></p>}
      {addressError && <p role="alert" className="mb-3 rounded-lg bg-[#FBEDE5] px-3 py-2 text-xs text-[#D92D20]">{addressError}</p>}
      {cartQuote && cartQuote.allServiceable === false && !quoteLoading && (
        <p className="mb-3 rounded-lg bg-[#FBEDE5] px-3 py-2 text-xs text-[#D92D20]">Some products cannot currently be delivered because the supplying farmer has not configured a valid dispatch location. You can proceed to checkout to review affected items.</p>
      )}
      {items.length === 0 ? (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-gray-100 bg-white p-10 text-center"
        >
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-sm font-semibold text-gray-900">Your cart is empty</h2>
          <p className="mt-1 text-xs text-gray-500">Browse fresh produce from local farmers.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Start Shopping</Link>
        </motion.div>
      ) : (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6"
        >
          <div className="space-y-3 lg:col-span-1">
            <CartTable items={itemsWithPending} onUpdate={(id, quantity) => dispatch(updateQuantity({ productId: id, quantity }))} onRemove={(id) => dispatch(removeItem(id))} disabled={Object.values(itemPending).some(Boolean)} />
            <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-medium text-primary"><ArrowLeft className="h-4 w-4" />Continue Shopping</Link>
          </div>
          <OrderSummary
            subtotal={summary.subtotal}
            regularDiscount={summary.regularDiscount}
            premiumDiscount={summary.premiumDiscount}
            discount={summary.discount}
            delivery={summary.deliveryCharge}
            total={summary.total}
            deliveryReady={deliveryReady}
            deliveryPending={cartQuote && cartQuote.allServiceable === false}
            deliveryLoading={quoteLoading}
            items={cartQuote?.items || items}
            buttonLabel="Proceed to Checkout"
            onAction={handleCheckout}
            loading={quoteLoading}
            disabled={!canCheckout}
            distanceKm={deliveryDistance}
            deliveryOption={selectedDeliveryOption}
            deliveryOptions={deliveryOptions}
          />
        </motion.div>
      )}
    </div>
  );
}
