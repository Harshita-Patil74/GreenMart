import React, { useEffect } from "react";
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
import { fetchCart, fetchDeliveryCharge, updateQuantity, removeItem, clearItemError } from "../../features/cart/cartSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { calculateCartTotals } from "../../utils/cartTotals.js";

const itemId = (item) => item.product?._id || item.product?.id || item.product || item.id;

export default function Cart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { items, deliveryCharge, deliveryLoading, deliveryError, loading, error } = cart;
  const itemPending = cart.itemPending || {};
  const { user, token } = useSelector((state) => state.auth);
  const hasCustomerMobileNavigation = user?.role === "customer";

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !cart.loaded) dispatch(fetchCart());
  }, [dispatch, user?.role, token, cart.loaded]);

  useEffect(() => {
    if (deliveryCharge == null && !deliveryLoading && !deliveryError) dispatch(fetchDeliveryCharge());
  }, [dispatch, deliveryCharge, deliveryLoading, deliveryError]);

  useEffect(() => {
    if (cart.loaded && error) {
      toast.error(error);
      dispatch(clearItemError());
    }
  }, [cart.loaded, error, dispatch]);

  const localTotals = calculateCartTotals(items, deliveryCharge);
  const authoritativeTotals = cart.totals;
  const subtotal = authoritativeTotals?.subtotal ?? localTotals.subtotal;
  const regularDiscount = authoritativeTotals?.regularDiscount ?? localTotals.regularDiscount;
  const premiumDiscount = authoritativeTotals?.premiumDiscount ?? localTotals.premiumDiscount;
  const discount = authoritativeTotals?.discount ?? localTotals.discount;
  const delivery = authoritativeTotals?.deliveryCharge ?? localTotals.deliveryCharge;
  const total = authoritativeTotals?.total ?? localTotals.total;
  const deliveryReady = localTotals.deliveryReady;
  const handleCheckout = () => {
    if (user?.role !== "customer" || !token || token === "demo-token") {
      toast.error("Sign in to checkout.");
      navigate("/login");
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
      {deliveryError && <p role="alert" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{deliveryError} <button onClick={() => dispatch(fetchDeliveryCharge())} className="font-semibold underline">Retry</button></p>}
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
          className="grid items-start gap-4 lg:grid-cols-3"
        >
          <div className="space-y-3 lg:col-span-2">
            <CartTable items={itemsWithPending} onUpdate={(id, quantity) => dispatch(updateQuantity({ productId: id, quantity }))} onRemove={(id) => dispatch(removeItem(id))} disabled={Object.values(itemPending).some(Boolean)} />
            <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-medium text-primary"><ArrowLeft className="h-4 w-4" />Continue Shopping</Link>
            <div className="mt-2"><NextButton to="/checkout" label="Continue to Checkout" /></div>
          </div>
          <OrderSummary subtotal={subtotal} regularDiscount={regularDiscount} premiumDiscount={premiumDiscount} discount={discount} delivery={delivery} total={total} deliveryReady={deliveryReady} items={items} buttonLabel="Proceed to Checkout" onAction={handleCheckout} loading={deliveryLoading || !deliveryReady} />
        </motion.div>
      )}
    </div>
  );
}
