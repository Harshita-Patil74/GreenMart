import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import BackButton from "../../components/common/BackButton.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { MapPin, Plus, Phone, ShieldCheck } from "lucide-react";
import CheckoutStepper from "../../components/checkout/CheckoutStepper.jsx";
import PaymentMethodSection from "../../components/checkout/PaymentMethodSection.jsx";
import OrderSummary from "../../components/cart/OrderSummary.jsx";
import { clearCart, fetchCart, fetchDeliveryCharge } from "../../features/cart/cartSlice.js";
import addressApi from "../../api/addressApi";
import orderApi from "../../api/orderApi";
import { calculateCartTotals } from "../../utils/cartTotals.js";

const blankAddress = { name: "", line1: "", city: "", phone: "" };
const blankUpi = { vpa: "" };
const blankCard = { name: "", number: "", expiry: "", cvv: "" };

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
  const [paymentAmount, setPaymentAmount] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [upiForm, setUpiForm] = useState(blankUpi);
  const [cardForm, setCardForm] = useState(blankCard);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const quoteRequestId = useRef(0);

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

  const { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: delivery, total, deliveryReady } = calculateCartTotals(items, deliveryCharge);
  const loadCheckoutQuote = useCallback(async () => {
    const requestId = quoteRequestId.current + 1;
    quoteRequestId.current = requestId;
    setQuoteLoading(true);
    setQuoteError(null);
    setCheckoutQuote(null);
    try {
      const { data } = await orderApi.quote();
      const quote = {
        items: Array.isArray(data?.items) ? data.items : null,
        subtotal: Number(data?.subtotal),
        regularDiscount: data?.regularDiscount == null ? undefined : Number(data.regularDiscount),
        premiumDiscount: data?.premiumDiscount == null ? undefined : Number(data.premiumDiscount),
        discount: Number(data?.discount),
        deliveryCharge: Number(data?.deliveryCharge),
        total: Number(data?.total),
      };
      if ([quote.subtotal, quote.discount, quote.deliveryCharge, quote.total]
        .some((amount) => !Number.isFinite(amount) || amount < 0)) {
        throw new Error("The payable amount is unavailable. Please try again.");
      }
      if ([quote.regularDiscount, quote.premiumDiscount]
        .some((amount) => amount != null && (!Number.isFinite(amount) || amount < 0))) {
        throw new Error("The discount breakdown is unavailable. Please try again.");
      }
      if (requestId !== quoteRequestId.current) return null;
      setCheckoutQuote(quote);
      return quote;
    } catch (quoteRequestError) {
      if (requestId !== quoteRequestId.current) return null;
      setCheckoutQuote(null);
      setQuoteError(quoteRequestError?.response?.data?.message || quoteRequestError?.message || "Couldn't validate your checkout amount.");
      return null;
    } finally {
      if (requestId === quoteRequestId.current) setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cartLoaded && items.length && user?.role === "customer" && token && token !== "demo-token") {
      setPaymentConfirmed(false);
      setPaymentAmount(null);
      setPaymentFailed(false);
      loadCheckoutQuote();
      return;
    }
    quoteRequestId.current += 1;
    setCheckoutQuote(null);
    setQuoteError(null);
    setQuoteLoading(false);
    setPaymentConfirmed(false);
    setPaymentAmount(null);
    setPaymentFailed(false);
  }, [cartLoaded, items, loadCheckoutQuote, token, user?.role]);

  const summary = checkoutQuote || { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: delivery, total };
  const summaryDeliveryReady = checkoutQuote ? true : deliveryReady;
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);
  const canPlaceOrder = Boolean(cartLoaded)
    && !cartError
    && Boolean(checkoutQuote)
    && Boolean(items.length)
    && Boolean(selectedAddress)
    && summaryDeliveryReady
    && !quoteLoading
    && !deliveryLoading
    && !addressLoading;

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
    setPaymentAmount(null);
    try {
      const quote = await loadCheckoutQuote();
      if (!quote) throw new Error("Payment could not be initiated. Please retry.");
      const amount = Number(quote.total);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setPaymentAmount(amount);
      setPaymentConfirmed(true);
      toast.success(`Payment successful via ${method} for ₹${amount.toFixed(2)}.`);
    } catch (paymentError) {
      setPaymentFailed(true);
      toast.error(paymentError?.response?.data?.message || paymentError?.message || "Payment failed. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setPaymentConfirmed(false);
    setPaymentFailed(false);
    setPaymentAmount(null);
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
        ...(paymentConfirmed && paymentAmount != null ? { paymentAmount } : {}),
      });
      dispatch(clearCart());
      toast.success("Order placed successfully.");
      navigate(`/order-confirmation/${data._id}`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Couldn't place your order.");
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
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(38,53,43,0.06)] sm:p-5"
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
          >
            <PaymentMethodSection
              paymentMethod={paymentMethod}
              onSelectPaymentMethod={selectPaymentMethod}
              upiForm={upiForm}
              onUpiChange={(value) => setUpiForm({ vpa: value })}
              cardForm={cardForm}
              onCardChange={(key, value) => setCardForm((current) => ({ ...current, [key]: value }))}
              paymentProcessing={paymentProcessing}
              paymentConfirmed={paymentConfirmed}
              paymentFailed={paymentFailed}
              onPay={processMockPayment}
              onPlaceOrder={placeOrder}
              placingOrder={placingOrder}
              orderButtonDisabled={!canPlaceOrder}
            />
          </motion.section>
        </div>

        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {cartError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{cartError} <button onClick={() => dispatch(fetchCart())} className="font-semibold underline">Retry</button></p>}
          {quoteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{quoteError} <button onClick={loadCheckoutQuote} className="font-semibold underline">Retry</button></p>}
          {deliveryError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{deliveryError} <button onClick={() => dispatch(fetchDeliveryCharge())} className="font-semibold underline">Retry</button></p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <OrderSummary
            subtotal={summary.subtotal}
            regularDiscount={summary.regularDiscount}
            premiumDiscount={summary.premiumDiscount}
            discount={summary.discount}
            delivery={summary.deliveryCharge}
            total={summary.total}
            deliveryReady={summaryDeliveryReady}
            items={checkoutQuote?.items || items}
            showItems
            buttonLabel="Place Order"
            onAction={placeOrder}
            loading={placingOrder || addressLoading || cartLoading || deliveryLoading || quoteLoading || !summaryDeliveryReady}
            disabled={!cartLoaded || cartError || quoteError || !checkoutQuote || !items.length}
          />
          {!items.length && !cartLoading && <div className="rounded-lg border border-gray-100 bg-white p-3 text-center text-xs text-gray-500">Your cart is empty. <Link to="/shop" className="font-semibold text-primary">Shop now</Link></div>}
        </motion.div>
      </motion.div>
    </div>
  );
}
