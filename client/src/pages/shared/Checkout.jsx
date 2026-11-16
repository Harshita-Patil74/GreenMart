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
import deliveryApi from "../../api/deliveryApi";
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
  const [distanceError, setDistanceError] = useState(null);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
  const [allServiceable, setAllServiceable] = useState(true);
  const [upiForm, setUpiForm] = useState(blankUpi);
  const [cardForm, setCardForm] = useState(blankCard);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const quoteRequestId = useRef(0);
  const distanceRequestId = useRef(0);

  const { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: cartDeliveryCharge, total, deliveryReady: cartDeliveryReady } = calculateCartTotals(items, deliveryCharge);

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
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setAddresses(list);
      setSelectedAddressId((current) => current || list.find((a) => a.isDefault)?.id || list[0]?._id || "");
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

  const loadDeliveryDistance = useCallback(async () => {
    setDistanceError(null);
    setAllServiceable(true);

    if (!selectedAddressId) {
      setDeliveryDistance(null);
      setDeliveryOptions([]);
      return;
    }

    const address = addresses.find((a) => a._id === selectedAddressId);
    if (!address?.coordinates?.lat || !address?.coordinates?.lng) {
      setDeliveryDistance(null);
      setDeliveryOptions([]);
      setAllServiceable(false);
      setDistanceError("This address has no location coordinates. Please select another address.");
      return;
    }

    if (!items.length) {
      setDeliveryDistance(null);
      setDeliveryOptions([]);
      return;
    }

    setDistanceLoading(true);
    const requestId = distanceRequestId.current + 1;
    distanceRequestId.current = requestId;
    try {
      const farmerGroups = {};
      items.forEach((item) => {
        const farmerId = item.product?.farmer;
        if (!farmerId) return;
        if (!farmerGroups[farmerId]) farmerGroups[farmerId] = [];
        farmerGroups[farmerId].push(item);
      });

      let maxDistance = 0;
      let allEligible = true;
      let firstOptions = [];

      for (const [farmerId] of Object.entries(farmerGroups)) {
        const { data } = await deliveryApi.distance({ farmerId, addressId: selectedAddressId });
        if (requestId !== distanceRequestId.current) return;
        if (data.distanceKm != null) {
          maxDistance = Math.max(maxDistance, data.distanceKm);
        }
        if (data.options && data.options.length) {
          if (firstOptions.length === 0) firstOptions = data.options;
          if (!data.options.some((o) => o.eligible)) allEligible = false;
        } else {
          allEligible = false;
        }
      }

      if (requestId !== distanceRequestId.current) return;
      setDeliveryDistance(maxDistance || null);
      setDeliveryOptions(firstOptions);
      setAllServiceable(allEligible);
      const defaultOption = firstOptions.find((o) => o.eligible);
      if (defaultOption && !selectedDeliveryOption) setSelectedDeliveryOption(defaultOption.option);
      else if (!firstOptions.length && !selectedDeliveryOption) setSelectedDeliveryOption(null);
    } catch (err) {
      if (requestId !== distanceRequestId.current) return;
      setDeliveryDistance(null);
      setDeliveryOptions([]);
      setAllServiceable(false);
      setDistanceError(err?.response?.data?.message || err?.message || "Couldn't calculate delivery distance.");
    } finally {
      if (requestId === distanceRequestId.current) setDistanceLoading(false);
    }
  }, [selectedAddressId, items, addresses]);

  useEffect(() => {
    if (selectedAddressId && items.length) {
      loadDeliveryDistance();
    } else {
      setDeliveryDistance(null);
      setDeliveryOptions([]);
      setAllServiceable(true);
    }
  }, [selectedAddressId, items, loadDeliveryDistance]);

  const loadCheckoutQuote = useCallback(async () => {
    if (!items.length) {
      setCheckoutQuote(null);
      return null;
    }
    const requestId = quoteRequestId.current + 1;
    quoteRequestId.current = requestId;
    setQuoteLoading(true);
    setQuoteError(null);
    setCheckoutQuote(null);
    try {
      const { data } = await orderApi.quote({ addressId: selectedAddressId || undefined, deliveryOption: selectedDeliveryOption });
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
      if ([quote.regularDiscount, quote.premiumDiscount]
        .some((amount) => amount != null && (!Number.isFinite(amount) || amount < 0))) {
        throw new Error("The discount breakdown is unavailable. Please try again.");
      }
      if (requestId !== quoteRequestId.current) return null;
      setCheckoutQuote(quote);
      if (quote.allServiceable === false) {
        setAllServiceable(false);
      }
      return quote;
    } catch (quoteRequestError) {
      if (requestId !== quoteRequestId.current) return null;
      setCheckoutQuote(null);
      setAllServiceable(false);
      setQuoteError(quoteRequestError?.response?.data?.message || quoteRequestError?.message || "Couldn't validate your checkout amount.");
      return null;
    } finally {
      if (requestId === quoteRequestId.current) setQuoteLoading(false);
    }
  }, [selectedAddressId, items, selectedDeliveryOption]);

  useEffect(() => {
    if (cartLoaded && items.length && selectedAddressId && user?.role === "customer" && token && token !== "demo-token") {
      setPaymentConfirmed(false);
      setPaymentAmount(null);
      setPaymentFailed(false);
      loadCheckoutQuote();
    }
  }, [cartLoaded, items, selectedAddressId, token, user?.role]);

  const summary = checkoutQuote || { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: cartDeliveryCharge, total };
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);
  const checkoutDeliveryReady = checkoutQuote ? Boolean(checkoutQuote.allServiceable !== false) && Number.isFinite(checkoutQuote.deliveryCharge) && checkoutQuote.deliveryCharge >= 0 : false;
  const summaryDeliveryReady = checkoutQuote ? checkoutDeliveryReady : cartDeliveryReady;

  const buttonLabel = paymentMethod === "upi" ? "Place UPI Order" : paymentMethod === "card" ? "Place Card Order" : "Place COD Order";

  const canPlaceOrder = Boolean(cartLoaded)
    && !cartError
    && Boolean(checkoutQuote)
    && Boolean(items.length)
    && Boolean(selectedAddress)
    && summaryDeliveryReady
    && allServiceable
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

  const refreshQuoteBeforePayment = useCallback(async () => {
    const refreshed = await loadCheckoutQuote();
    return refreshed;
  }, [loadCheckoutQuote]);

  const processMockPayment = async (method) => {
    if (!allServiceable) {
      setPaymentProcessing(false);
      setPaymentFailed(true);
      toast.error("Delivery is not available for products supplied by one or more farmers because the delivery address is outside our current service area.");
      return;
    }
    setPaymentProcessing(true);
    setPaymentConfirmed(false);
    setPaymentFailed(false);
    setPaymentAmount(null);
    try {
      const refreshed = await refreshQuoteBeforePayment();
      if (!refreshed || refreshed.allServiceable === false) throw new Error("Payment could not be initiated. Delivery is not serviceable.");
      const amount = Number(refreshed.total);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setPaymentAmount(amount);
      setPaymentConfirmed(true);
      toast.success(`Payment successful via ${method} for ₹${amount.toFixed(2)}.`);
    } catch (paymentError) {
      setPaymentFailed(true);
      setPaymentProcessing(false);
      toast.error(paymentError?.response?.data?.message || paymentError?.message || "Payment failed. Please try again.");
      return;
    }
    setPaymentProcessing(false);
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
    if (!allServiceable) {
      setError("Delivery is not available for products supplied by one or more farmers because the delivery address is outside our current service area.");
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
      const refreshed = await loadCheckoutQuote();
      if (!refreshed || refreshed.allServiceable === false) {
        setError("Delivery is not serviceable. Please refresh and retry.");
        return;
      }
      const { data } = await orderApi.create({
        address: {
          name: selectedAddress.name,
          line1: selectedAddress.line1,
          city: selectedAddress.city,
          phone: selectedAddress.phone,
        },
        coordinates: selectedAddress.coordinates || undefined,
        addressId: selectedAddressId,
        deliveryOption: refreshed.deliveryOption || selectedDeliveryOption,
        quoteVersion: refreshed.quoteVersion,
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
    <div className="gm-container max-w-7xl py-6 pb-16">
      <BackButton fallback="/cart" />
      <CheckoutStepper step={0} />

      {/* Page Header */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="flex items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
            <h1 className="text-base font-bold text-[#26352B] sm:text-lg">Checkout</h1>
            <p className="mt-1 text-[11px] text-gray-500">Review your delivery details, product availability, and payment before placing your order.</p>
          </div>
          <Link to="/cart" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[10px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]"><ArrowLeft className="h-3.5 w-3.5" />Back to Cart</Link>
        </div>
      </motion.section>

      {/* Delivery Address */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#26352B]">Delivery Address</h2>
            <p className="mt-1 text-[11px] text-gray-500">Choose where your order should be delivered.</p>
          </div>
          <button onClick={() => { setAddressForm(blankAddress); setAddressFormOpen((open) => !open); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[10px] font-semibold text-[#245C3A]"><Plus className="h-3.5 w-3.5" />Add New</button>
        </div>
        {addressLoading ? <p className="text-xs text-gray-500">Loading addresses...</p> : (
          <div className="space-y-2">
            {addresses.map((address) => (
              <label key={address._id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selectedAddressId === address._id ? "border-[#245C3A] bg-[#EAF2E7]" : "border-gray-200 bg-white"}`}>
                <input type="radio" name="address" checked={selectedAddressId === address._id} onChange={() => setSelectedAddressId(address._id)} className="mt-1 accent-[#245C3A]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#26352B]">{address.name}</span>
                  <span className="mt-1 block text-[11px] text-gray-600">{address.line1}, {address.city}</span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><Phone className="h-3 w-3" />{address.phone}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {addressError && <p role="alert" className="mt-2 text-xs text-[#D92D20]">{addressError} <button onClick={loadAddresses} className="font-semibold underline">Retry</button></p>}
        {addressFormOpen && (
          <motion.form
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            onSubmit={saveNewAddress}
            className="mt-4 grid gap-2 rounded-lg border border-gray-200 bg-[#FAF8F1] p-3 sm:grid-cols-2"
          >
            {[
              ["name", "Recipient name"],
              ["phone", "Phone number"],
              ["line1", "Street address"],
              ["city", "City"],
            ].map(([key, label]) => (
              <label key={key} className="text-[10px] font-medium text-gray-600">
                {label}
                <input required value={addressForm[key]} onChange={(event) => { setAddressForm((current) => ({ ...current, [key]: event.target.value })); setAddressErrors((e) => ({ ...e, [key]: undefined })); }} className={`mt-1 h-8 w-full rounded-md border bg-white px-2 text-xs text-[#26352B] focus:border-[#245C3A] focus:outline-none ${addressErrors[key] ? "border-[#D92D20]" : "border-gray-200"}`} />
                {addressErrors[key] && <span className="mt-0.5 block text-[10px] text-[#D92D20]">{addressErrors[key]}</span>}
              </label>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={savingAddress} className="h-8 rounded-lg bg-[#245C3A] px-3 text-[10px] font-semibold text-white disabled:opacity-60">{savingAddress ? "Saving..." : "Save Address"}</button>
              <button type="button" onClick={() => setAddressFormOpen(false)} className="h-8 rounded-lg border border-gray-200 px-3 text-[10px] font-medium text-gray-600">Cancel</button>
            </div>
          </motion.form>
        )}
      </motion.section>

      {/* Delivery Options */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        {!selectedAddressId && (
          <p className="text-xs text-gray-500">Pick a saved address above to see delivery options.</p>
        )}
        {selectedAddressId && items.length && (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#26352B]">Delivery Options</h2>
                <p className="mt-1 text-[11px] text-gray-500">Choose your delivery option.</p>
              </div>
            </div>
            {distanceLoading && <p className="text-xs text-gray-500">Calculating delivery distance...</p>}
            {!distanceLoading && deliveryDistance == null && deliveryOptions.length === 0 && !quoteError && !distanceError && (
              <p className="text-xs text-gray-500">Unable to calculate delivery distance.</p>
            )}
            {deliveryOptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveryOptions.map((opt) => (
                  <label key={opt.option} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${selectedDeliveryOption === opt.option ? "border-[#245C3A] bg-[#EAF2E7]" : "border-gray-200 bg-white"}`}>
                    <input type="radio" name="deliveryOption" checked={selectedDeliveryOption === opt.option} onChange={() => setSelectedDeliveryOption(opt.option)} className="mt-1 accent-[#245C3A]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-[#26352B]">{opt.label}</span>
                      <span className="mt-1 block text-[11px] text-gray-600">Within {opt.maxKm} km</span>
                    </span>
                    <span className="text-xs font-semibold text-[#245C3A]">₹ {opt.charge.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            )}
            {!distanceLoading && !deliveryOptions.length && !quoteError && !distanceError && deliveryDistance == null && (
              <p className="text-xs text-[#D92D20]">No delivery options available for this address.</p>
            )}
          </>
        )}
        {quoteError && (
          <div className="mt-2 rounded-lg border border-[#F2C9C0] bg-[#FBEDE5] p-3">
            <p className="text-xs text-[#D92D20]">{quoteError}</p>
            <p className="mt-1 text-[10px] text-gray-600">Please select another delivery address or contact support.</p>
          </div>
        )}
      </motion.section>

      {/* Delivery Breakdown */}
      {checkoutQuote && Array.isArray(checkoutQuote.shipments) && checkoutQuote.shipments.length > 0 && (
        <motion.section
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#26352B]">Delivery Breakdown</h2>
              <p className="mt-1 text-[11px] text-gray-500">Delivery distance and charges are calculated separately for each farmer supplying your products.</p>
            </div>
          </div>
          <div className="space-y-2">
            {checkoutQuote.shipments.map((shipment) => (
              <div key={shipment.farmerId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#26352B]">{shipment.farmerName || "Farmer"}</span>
                  <span className={`text-[10px] font-semibold rounded-md px-1.5 ${shipment.serviceable ? "bg-[#EAF2E7] text-[#1E4A30] border-[#245C3A]/20" : "bg-[#FBEDE5] text-[#D92D20] border-[#F2C9C0]"}`}>
                    {shipment.serviceable ? "Serviceable" : "Not Available"}
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 mb-1">{shipment.dispatchAddress || "Dispatch address not configured"}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Products:</span>
                    <span className="text-[#26352B]">{Array.isArray(shipment.products) ? shipment.products.map((p) => `${p.name} × ${p.quantity}`).join(", ") : shipment.farmerItemCount + " item(s)"}</span>
                  </div>
                  {shipment.distanceKm != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Road distance:</span>
                      <span className="text-[#26352B]">{shipment.distanceKm.toFixed(2)} km</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tier:</span>
                    <span className="text-[#26352B]">{shipment.tier || "—"}</span>
                  </div>
                </div>
                {!shipment.serviceable && shipment.error && (
                  <p className="mt-1 text-[10px] text-[#D92D20]">{shipment.error}</p>
                )}
              </div>
            ))}
            {!allServiceable && (
              <div className="mt-2 rounded-lg border border-[#F2C9C0] bg-[#FBEDE5] p-3">
                <p className="text-xs text-[#D92D20]">Delivery is not available for products supplied by one or more farmers because the delivery address is outside our current service area.</p>
                <p className="mt-1 text-[10px] text-gray-600">Please select another delivery address or remove the affected products.</p>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Delivery Availability Warning */}
      {!allServiceable && checkoutQuote && checkoutQuote.shipments && checkoutQuote.shipments.some((s) => !s.serviceable) && (
        <motion.section
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-[#F2C9C0] bg-[#FBEDE5] p-4 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B42318]" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#B42318]">Delivery Unavailable</h2>
              <p className="mt-1 text-xs text-[#6B7280]">Some products cannot currently be delivered because one or more farmers are outside the supported delivery area or have not configured a valid dispatch location.</p>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
            <p className="flex items-start gap-1"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#245C3A]" /><span>Select another saved delivery address.</span></p>
            <p className="flex items-start gap-1"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#245C3A]" /><span>Remove the affected products from your cart.</span></p>
            <p className="flex items-start gap-1"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#245C3A]" /><span>Try again after the farmer updates their dispatch location.</span></p>
          </div>
        </motion.section>
      )}

      {/* Order Summary */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#26352B]">Order Summary</h2>
            <p className="mt-1 text-[11px] text-gray-500">Review your order before placing it.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {summary.items && summary.items.length > 0 && (
            <div className="max-h-60 space-y-2 overflow-y-auto border-b border-gray-100 pb-3">
              {summary.items.map((it, idx) => {
                const product = it.product || {};
                const name = product.name || it.name;
                const qty = it.quantity || 1;
                const image = product.images?.[0] || it.image;
                const gross = Number(it.price || 0) * qty;
                const chargedTotal = Number(it.offerSnapshot?.finalLineTotal ?? gross);
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {image ? <img src={getImageUrl(image)} alt="" onError={(e)=>{e.currentTarget.style.display="none"}} className="h-10 w-10 shrink-0 rounded-[8px] border border-gray-100 bg-gray-50 object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-gray-100 bg-gray-50"><Package className="h-4 w-4 text-gray-400" /></div>}
                      <div className="truncate">
                        <p className="truncate font-semibold text-gray-800">{name}</p>
                        <p className="text-gray-400">Qty: {qty}</p>
                        {it.offerSnapshot?.offerTitle && <p className="truncate text-[10px] text-emerald-700">{it.offerSnapshot.offerTitle}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 text-right tabular-nums text-[#26352B]">{formatINR(chargedTotal)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {deliveryDistance != null && (
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-2">
              <span><MapPin className="h-3 w-3 mr-1" />Delivery distance</span>
              <span>{deliveryDistance.toFixed(2)} km</span>
            </div>
          )}
          <SummaryRow label="Original Product Subtotal" value={formatINR(summary.subtotal)} />
          <SummaryRow label="Regular Offer Savings" value={`− ${formatINR(summary.regularDiscount ?? 0)}`} tone={summary.regularDiscount && summary.regularDiscount > 0 ? "savings" : "muted"} />
          <SummaryRow label="Exclusive Subscriber Savings" value={`− ${formatINR(summary.premiumDiscount ?? 0)}`} tone={summary.premiumDiscount && summary.premiumDiscount > 0 ? "savings" : "muted"} />
          <SummaryRow label="Total Discount" value={summary.discount > 0 ? `− ${formatINR(summary.discount)}` : formatINR(0)} tone={summary.discount > 0 ? "savings" : "muted"} strong={summary.discount > 0} />
          <SummaryRow
            label="Delivery Charge"
            value={
              quoteLoading ? "Calculating..." : allServiceable === false ? "Unavailable" : summary.deliveryCharge != null ? formatINR(summary.deliveryCharge) : "To be calculated"
            }
          />
        </div>
        <hr className="border-gray-100" />
        <SummaryRow label="Final Payable Amount" value={
          quoteLoading ? "Calculating..." : allServiceable === false ? "Unavailable" : summaryDeliveryReady ? formatINR(summary.total) : "—"
        } strong />
        {summary.discount && summary.discount > 0 && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
            You saved {formatINR(summary.discount)} on this order.
          </p>
        )}
        {distanceError && (
          <div className="mt-2 rounded-lg border border-[#F2C9C0] bg-[#FBEDE5] p-2">
            <p className="text-[10px] text-[#D92D20]">{distanceError}</p>
          </div>
        )}
      </motion.section>

      {/* Payment Method */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#26352B]">Payment Method</h2>
            <p className="mt-1 text-[11px] text-gray-500">Choose how you want to pay.</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FAF8F1] px-2 py-1 text-[10px] font-semibold text-[#477A4E]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#245C3A]" aria-hidden="true" />
            Secure
          </span>
        </div>
        {!allServiceable && (
          <div className="mb-3 rounded-lg border border-[#F2C9C0] bg-[#FBEDE5] p-3">
            <p className="text-xs text-[#D92D20]">Payment is disabled until all farmer shipments are serviceable.</p>
            <p className="mt-1 text-[10px] text-gray-600">Change your delivery address or remove the affected products to enable payment.</p>
          </div>
        )}
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
          allServiceable={allServiceable}
        />
      </motion.section>

      {/* Final Place Order Action */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#26352B]">Place Order</h2>
            <p className="mt-0.5 text-[11px] text-gray-500">Review your order and confirm payment to place it.</p>
          </div>
        </div>
        <button
          onClick={placeOrder}
          disabled={!canPlaceOrder || placingOrder || !allServiceable}
          aria-busy={placingOrder}
          className={`w-full h-11 rounded-[10px] bg-[#16803C] px-4 py-2 text-sm font-semibold text-white shadow-btn transition disabled:cursor-not-allowed disabled:opacity-60 ${placingOrder ? "bg-[#9AA498]" : "hover:bg-[#126B32]"}`}
        >
          {placingOrder ? "Processing…" : buttonLabel}
        </button>
        {!allServiceable && (
          <p className="mt-2 text-xs text-[#D92D20]">Order placement is disabled until all farmer shipments are serviceable.</p>
        )}
        {allServiceable && summaryDeliveryReady && summary.total != null && (
          <p className="mt-2 text-xs text-[#6B7280]">Final payable amount: {formatINR(summary.total)}</p>
        )}
      </motion.section>
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import { TriangleAlert, Check } from "lucide-react";
import { Package } from "lucide-react";
import getImageUrl from "../../utils/imageUrl.js";
import { formatINR } from "../../utils/cartTotals.js";

function SummaryRow({ label, value, tone = "default", strong = false }) {
  const tones = {
    default: "text-gray-600",
    muted: "text-gray-500",
    savings: "text-emerald-700",
    total: "text-gray-900",
  };
  return (
    <div className={`flex items-start justify-between gap-4 ${tones[tone] || tones.default}`}>
      <span className={strong ? "font-semibold text-gray-900" : "text-sm"}>{label}</span>
      <span className={`shrink-0 text-right tabular-nums ${strong ? "font-extrabold text-lg text-[#16803C]" : "font-semibold text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
