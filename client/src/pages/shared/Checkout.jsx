import React, { useEffect, useState } from "react";
import BackButton from "../../components/common/BackButton.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { MapPin, Plus, Phone } from "lucide-react";
import CheckoutStepper from "../../components/checkout/CheckoutStepper.jsx";
import OrderSummary from "../../components/cart/OrderSummary.jsx";
import { clearCart, fetchCart, fetchDeliveryCharge } from "../../features/cart/cartSlice.js";
import addressApi from "../../api/addressApi";
import orderApi from "../../api/orderApi";

const blankAddress = { name: "", line1: "", city: "", phone: "" };

export default function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const { items, deliveryCharge, deliveryLoading, deliveryError, loaded: cartLoaded, loading: cartLoading, error: cartError } = cart;
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  const paymentMethod = "Cash on Delivery";

  useEffect(() => {
    if (!token || token === "demo-token" || user?.role !== "customer") {
      toast.error("Sign in with a customer account to checkout.");
      navigate("/login", { replace: true });
      return;
    }
    if (!cartLoaded && !cartLoading) dispatch(fetchCart());
  }, [dispatch, navigate, token, user?.role, cartLoaded, cartLoading]);

  useEffect(() => {
    if (deliveryCharge == null && !deliveryLoading && !deliveryError) dispatch(fetchDeliveryCharge());
  }, [dispatch, deliveryCharge, deliveryLoading, deliveryError]);

  const loadAddresses = async () => {
    setAddressLoading(true);
    setAddressError(null);
    try {
      const { data } = await addressApi.list();
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
      setSelectedAddressId((current) => current || list[0]?._id || "");
      if (!list.length) setAddressFormOpen(true);
    } catch (requestError) {
      setAddressError(requestError?.message || "Couldn't load your saved addresses.");
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token") loadAddresses();
  }, [user?.role, token]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price ?? item.price ?? 0) * Number(item.quantity || 0), 0);
  const total = subtotal > 0 && deliveryCharge != null ? subtotal + deliveryCharge : 0;
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);

  const saveNewAddress = async (event) => {
    event.preventDefault();
    setSavingAddress(true);
    setAddressError(null);
    try {
      const { data } = await addressApi.create(addressForm);
      const saved = data;
      setAddresses((current) => [saved, ...current]);
      setSelectedAddressId(saved._id);
      setAddressFormOpen(false);
      setAddressForm(blankAddress);
      toast.success("Delivery address saved.");
    } catch (requestError) {
      setAddressError(requestError?.message || "Couldn't save this address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const placeOrder = async () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!selectedAddress) {
      setError("Choose or add a delivery address.");
      setAddressFormOpen(true);
      return;
    }
    setPlacingOrder(true);
    setError(null);
    try {
      const { data } = await orderApi.create({
        address: {
          name: selectedAddress.name,
          line1: selectedAddress.line1,
          city: selectedAddress.city,
          phone: selectedAddress.phone,
        },
        paymentMethod,
      });
      dispatch(clearCart());
      toast.success("Order placed successfully.");
      navigate(`/order-confirmation/${data._id}`);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't place your order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!token || token === "demo-token" || user?.role !== "customer") return null;

  return (
    <div className="gm-container max-w-5xl py-6 pb-16">
      <BackButton fallback="/cart" />
      <CheckoutStepper step={0} />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div><h2 className="text-sm font-semibold text-gray-900">Delivery Address</h2><p className="mt-1 text-[11px] text-gray-500">Choose where your order should be delivered.</p></div>
              <button onClick={() => { setAddressForm(blankAddress); setAddressFormOpen((open) => !open); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[10px] font-semibold text-primary"><Plus className="h-3.5 w-3.5" />Add New</button>
            </div>
            {addressLoading ? <p className="text-xs text-gray-500">Loading addresses...</p> : (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <label key={address._id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selectedAddressId === address._id ? "border-primary bg-emerald-50/50" : "border-gray-200"}`}>
                    <input type="radio" name="address" checked={selectedAddressId === address._id} onChange={() => setSelectedAddressId(address._id)} className="mt-1 accent-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-gray-900">{address.name}</span>
                      <span className="mt-1 block text-[11px] text-gray-600">{address.line1}, {address.city}</span>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><Phone className="h-3 w-3" />{address.phone}</span>
                    </span>
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  </label>
                ))}
                {addresses.length === 0 && !addressError && !addressFormOpen && <p className="text-xs text-gray-500">Add a delivery address to continue.</p>}
              </div>
            )}
            {addressError && <p role="alert" className="mt-2 text-xs text-red-700">{addressError} <button onClick={loadAddresses} className="font-semibold underline">Retry</button></p>}
            {addressFormOpen && (
              <form onSubmit={saveNewAddress} className="mt-3 grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                {[
                  ["name", "Recipient name"],
                  ["phone", "Phone number"],
                  ["line1", "Street address"],
                  ["city", "City"],
                ].map(([key, label]) => <label key={key} className="text-[10px] font-medium text-gray-600">{label}<input required value={addressForm[key]} onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none" /></label>)}
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={savingAddress} className="h-8 rounded-lg bg-primary px-3 text-[10px] font-semibold text-white disabled:opacity-60">{savingAddress ? "Saving..." : "Save Address"}</button>
                  <button type="button" onClick={() => setAddressFormOpen(false)} className="h-8 rounded-lg border border-gray-200 px-3 text-[10px] font-medium text-gray-600">Cancel</button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-primary bg-emerald-50/50 p-3">
              <input type="radio" checked readOnly aria-label="Cash on Delivery" className="mt-1 accent-primary" />
              <div><p className="text-xs font-semibold text-gray-900">Cash on Delivery</p><p className="mt-1 text-[10px] text-gray-500">Payment processing for online methods is not configured.</p></div>
            </div>
          </section>
        </div>

        <div className="space-y-3">
          {cartError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{cartError} <button onClick={() => dispatch(fetchCart())} className="font-semibold underline">Retry</button></p>}
          {deliveryError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{deliveryError} <button onClick={() => dispatch(fetchDeliveryCharge())} className="font-semibold underline">Retry</button></p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <OrderSummary
            subtotal={subtotal}
            delivery={deliveryCharge ?? 0}
            total={total}
            items={items}
            showItems
            buttonLabel="Place Order"
            onAction={placeOrder}
            loading={placingOrder || addressLoading || cartLoading || deliveryLoading || deliveryCharge == null}
          />
          {!items.length && !cartLoading && <div className="rounded-lg border border-gray-100 bg-white p-3 text-center text-xs text-gray-500">Your cart is empty. <Link to="/shop" className="font-semibold text-primary">Shop now</Link></div>}
        </div>
      </div>
    </div>
  );
}
