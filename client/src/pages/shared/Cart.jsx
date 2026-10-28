import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import NextButton from "../../components/common/NextButton.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import CartTable from "../../components/cart/CartTable.jsx";
import OrderSummary from "../../components/cart/OrderSummary.jsx";
import { fetchCart, fetchDeliveryCharge, updateQuantity, removeItem } from "../../features/cart/cartSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";

export default function Cart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { items, deliveryCharge, deliveryLoading, deliveryError, loading, saving, error } = cart;
  const { user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !cart.loaded) dispatch(fetchCart());
  }, [dispatch, user?.role, token, cart.loaded]);

  useEffect(() => {
    if (deliveryCharge == null && !deliveryLoading && !deliveryError) dispatch(fetchDeliveryCharge());
  }, [dispatch, deliveryCharge, deliveryLoading, deliveryError]);

  const subtotal = items.reduce((acc, item) => acc + Number(item.product?.price ?? item.price ?? 0) * Number(item.quantity || 0), 0);
  const total = subtotal > 0 && deliveryCharge != null ? subtotal + deliveryCharge : 0;
  const handleCheckout = () => {
    if (user?.role !== "customer" || !token || token === "demo-token") {
      toast.error("Sign in to checkout.");
      navigate("/login");
      return;
    }
    navigate("/checkout");
  };

  if (loading && !cart.loaded) return <div className="gm-container py-6 text-sm text-gray-500">Loading your cart...</div>;
  if (error && !cart.loaded) return <div className="gm-container py-6"><ErrorState message={error} onRetry={() => dispatch(fetchCart())} /></div>;

  return (
    <div className="gm-container py-6 pb-16">
      <BackButton fallback="/shop" />
      <div className="mb-4">
        <h1 className="text-xl font-heading font-bold text-gray-900">Your Cart</h1>
        <p className="mt-1 text-xs text-gray-500">Review your items before checkout.</p>
      </div>
      {deliveryError && <p role="alert" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{deliveryError} <button onClick={() => dispatch(fetchDeliveryCharge())} className="font-semibold underline">Retry</button></p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button onClick={() => dispatch(fetchCart())} className="font-semibold underline">Retry</button></p>}
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-sm font-semibold text-gray-900">Your cart is empty</h2>
          <p className="mt-1 text-xs text-gray-500">Browse fresh produce from local farmers.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Start Shopping</Link>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <CartTable items={items} disabled={saving} onUpdate={(id, quantity) => dispatch(updateQuantity({ productId: id, quantity }))} onRemove={(id) => dispatch(removeItem(id))} />
            <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-medium text-primary"><ArrowLeft className="h-4 w-4" />Continue Shopping</Link>
            <div className="mt-2"><NextButton to="/checkout" label="Continue to Checkout" /></div>
          </div>
          <OrderSummary subtotal={subtotal} delivery={deliveryCharge ?? 0} total={total} buttonLabel="Proceed to Checkout" onAction={handleCheckout} loading={saving || deliveryLoading || deliveryCharge == null} />
        </div>
      )}
    </div>
  );
}
