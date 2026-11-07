import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import BackButton from "../../components/common/BackButton.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { MapPin, Plus, Phone, Mail, CreditCard, Wallet } from "lucide-react";
import CheckoutStepper from "../../components/checkout/CheckoutStepper.jsx";
import OrderSummary from "../../components/cart/OrderSummary.jsx";
import { clearCart, fetchCart, fetchDeliveryCharge } from "../../features/cart/cartSlice.js";
import addressApi from "../../api/addressApi";
import orderApi from "../../api/orderApi";

const blankAddress = { name: "", line1: "", city: "", phone: "" };
const blankUpi = { vpa: "" };
const blankCard = { number: "", expiry: "", cvv: "" };

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI Payment", subtitle: "Google Pay, PhonePe, Paytm, BHIM", icon: Wallet },
  { id: "card", label: "Credit / Debit Card", subtitle: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "cod", label: "Cash on Delivery", subtitle: "Pay when your order arrives", icon: Mail },
];

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
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [upiForm, setUpiForm] = useState(blankUpi);
  const [cardForm, setCardForm] = useState(blankCard);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

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
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setAddresses(list);
      setSelectedAddressId((current) => current || list.find((a) => a.isDefault)?._id || list[0]?._id || "");
      if (!list.length) setAddressFormOpen(true);
    } catch (requestError) {
      setAddressError(requestError?.response?.data?.message || requestError?.message || "Couldn't load your saved addresses.");
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token") loadAddresses();
  }, [user?.role, token]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price ?? item.price ?? 0) * Number(item.quantity || 0), 0);
  const discount = items.reduce((sum, item) => sum + Number(item.offer?.appliedDiscount || 0), 0);
  const total = subtotal > 0 && deliveryCharge != null ? subtotal - discount + deliveryCharge : 0;
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);

const [addressErrors, setAddressErrors] = useState({});

const validateAddress = (addr) => {
  const errors = {};
  if (!addr.name?.trim()) errors.name = "Recipient name is required.";
  if (!addr.phone?.trim()) errors.phone = "Please enter a valid phone number.";
  else if (!/^\+?\d[\d\s-]{7,}$/.test(addr.phone.trim())) errors.phone = "Please enter a valid phone number.";
  if (!addr.line1?.trim()) errors.line1 = "Street address is required.";
  if (!addr.city?.trim()) errors.city = "City is required.";
  return errors;
};

  const saveNewAddress = async (event) => {
    event.preventDefault();
    const errors = validateAddress(addressForm);
    setAddressErrors(errors);
    if (Object.keys(errors).length) return;
    setSavingAddress(true);
    setAddressError(null);
    try {
      const { data } = await addressApi.create(addressForm);
      const saved = data && data._id ? data : null;
      await loadAddresses();
      if (saved?._id) setSelectedAddressId(saved._id);
      setAddressFormOpen(false);
      setAddressForm(blankAddress);
      setAddressErrors({});
      toast.success("Delivery address saved.");
    } catch (requestError) {
      setAddressError(requestError?.response?.data?.message || requestError?.message || "Couldn't save this address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const processMockPayment = async (method) => {
    setPaymentProcessing(true);
    setPaymentConfirmed(false);
    setPaymentFailed(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setPaymentConfirmed(true);
      toast.success(`Payment successful via ${method}.`);
    } catch (err) {
      setPaymentFailed(true);
      toast.error("Payment failed. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const placeOrder = async () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!selectedAddress) {
      setError("Please add a delivery address before continuing.");
      setAddressFormOpen(true);
      return;
    }

    if (paymentMethod === "upi" || paymentMethod === "card") {
      if (!paymentConfirmed) {
        setError("Please complete the payment before placing your order.");
        return;
      }
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
        paymentConfirmed,
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
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="grid items-start gap-4 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          <motion.section
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Delivery Address</h2>
                <p className="mt-1 text-[11px] text-gray-500">Choose where your order should be delivered.</p>
              </div>
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
                  </label>
                ))}
              </div>
            )}
            {addressError && <p role="alert" className="mt-2 text-xs text-red-700">{addressError} <button onClick={loadAddresses} className="font-semibold underline">Retry</button></p>}
            {addressFormOpen && (
              <motion.form
                variants={sectionReveal}
                initial="hidden"
                animate="visible"
                onSubmit={saveNewAddress}
                className="mt-3 grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2"
              >
                {[
                  ["name", "Recipient name"],
                  ["phone", "Phone number"],
                  ["line1", "Street address"],
                  ["city", "City"],
                ].map(([key, label]) => (
                  <label key={key} className="text-[10px] font-medium text-gray-600">
                    {label}
                    <input required value={addressForm[key]} onChange={(event) => { setAddressForm((current) => ({ ...current, [key]: event.target.value })); setAddressErrors((e) => ({ ...e, [key]: undefined })); }} className={`mt-1 h-8 w-full rounded-md border bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none ${addressErrors[key] ? "border-red-500" : "border-gray-200"}`} />
                    {addressErrors[key] && <span className="mt-0.5 block text-[10px] text-red-600">{addressErrors[key]}</span>}
                  </label>
                ))}
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={savingAddress} className="h-8 rounded-lg bg-primary px-3 text-[10px] font-semibold text-white disabled:opacity-60">{savingAddress ? "Saving..." : "Save Address"}</button>
                  <button type="button" onClick={() => setAddressFormOpen(false)} className="h-8 rounded-lg border border-gray-200 px-3 text-[10px] font-medium text-gray-600">Cancel</button>
                </div>
              </motion.form>
            )}
          </motion.section>

          <motion.section
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
                <p className="mt-1 text-[11px] text-gray-500">Choose how you want to pay.</p>
              </div>
            </div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <label key={method.id} onClick={() => { setPaymentMethod(method.id); setPaymentConfirmed(false); setPaymentFailed(false); }} className={`cursor-pointer rounded-lg border p-3 transition-all ${isSelected ? "border-primary bg-emerald-50/50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="paymentMethod" checked={isSelected} onChange={() => setPaymentMethod(method.id)} className="mt-1 accent-primary" />
                      <div className="flex items-center gap-2">
                        <method.icon className="h-5 w-5 text-primary" />
                        <div>
                          <span className="block text-xs font-semibold text-gray-900">{method.label}</span>
                          <span className="mt-1 block text-[10px] text-gray-500">{method.subtitle}</span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {paymentMethod === "upi" && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-gray-900">UPI Payment</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-3">Enter your UPI ID (VPA) to proceed. This is a simulated payment — no real money will be deducted.</p>
                <div className="space-y-2">
                  <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-600">
                    UPI ID (e.g., name@upi)
                    <input required value={upiForm.vpa} onChange={(e) => setUpiForm((c) => ({ ...c, vpa: e.target.value }))} placeholder="name@upi" className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none" />
                  </label>
                  <button
                    disabled={paymentProcessing || !upiForm.vpa}
                    onClick={() => processMockPayment("UPI")}
                    className={`w-full h-8 rounded-lg px-3 text-[10px] font-semibold disabled:opacity-60 ${paymentProcessing || !upiForm.vpa ? "bg-gray-200 text-gray-500" : "bg-primary text-white"}`}
                  >
                    {paymentProcessing ? "Processing…" : "Pay via UPI"}
                  </button>
                  {paymentConfirmed === true && (
                    <p className="mt-2 text-[10px] font-semibold text-green-600">✓ Payment successful via UPI</p>
                  )}
                  {paymentFailed && (
                    <p className="mt-2 text-[10px] font-semibold text-red-600">✗ Payment failed. Try again.</p>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-gray-900">Credit / Debit Card</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-3">Enter your card details to proceed. This is a simulated payment — no real money will be deducted.</p>
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-600">
                      Card number
                      <input required value={cardForm.number} onChange={(e) => setCardForm((c) => ({ ...c, number: e.target.value }))} placeholder="1234 5678 9012 3456" className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-600">
                      Expiry (MM/YY)
                      <input required value={cardForm.expiry} onChange={(e) => setCardForm((c) => ({ ...c, expiry: e.target.value }))} placeholder="12/30" className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none" />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-600">
                      CVV
                      <input required value={cardForm.cvv} onChange={(e) => setCardForm((c) => ({ ...c, cvv: e.target.value }))} placeholder="123" className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:border-primary focus:outline-none" />
                    </label>
                  </div>
                  <button
                    disabled={paymentProcessing || !cardForm.number || !cardForm.expiry || !cardForm.cvv}
                    onClick={() => processMockPayment("Card")}
                    className={`w-full h-8 rounded-lg px-3 text-[10px] font-semibold disabled:opacity-60 ${paymentProcessing || !cardForm.number || !cardForm.expiry || !cardForm.cvv ? "bg-gray-200 text-gray-500" : "bg-primary text-white"}`}
                  >
                    {paymentProcessing ? "Processing…" : "Pay via Card"}
                  </button>
                  {paymentConfirmed === true && (
                    <p className="mt-2 text-[10px] font-semibold text-green-600">✓ Payment successful via Card</p>
                  )}
                  {paymentFailed && (
                    <p className="mt-2 text-[10px] font-semibold text-red-600">✗ Payment failed. Try again.</p>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === "cod" && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <span className="block text-xs font-semibold text-gray-900">Pay on Delivery</span>
                    <span className="mt-1 text-[10px] text-gray-500">Pay in cash when your order is delivered. No online payment required.</span>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </div>

        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {cartError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{cartError} <button onClick={() => dispatch(fetchCart())} className="font-semibold underline">Retry</button></p>}
          {deliveryError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{deliveryError} <button onClick={() => dispatch(fetchDeliveryCharge())} className="font-semibold underline">Retry</button></p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <OrderSummary
            subtotal={subtotal}
            discount={discount}
            delivery={deliveryCharge ?? 0}
            total={total}
            items={items}
            showItems
            buttonLabel="Place Order"
            onAction={placeOrder}
            loading={placingOrder || addressLoading || cartLoading || deliveryLoading || deliveryCharge == null}
          />
          {!items.length && !cartLoading && <div className="rounded-lg border border-gray-100 bg-white p-3 text-center text-xs text-gray-500">Your cart is empty. <Link to="/shop" className="font-semibold text-primary">Shop now</Link></div>}
        </motion.div>
      </motion.div>
    </div>
  );
}
