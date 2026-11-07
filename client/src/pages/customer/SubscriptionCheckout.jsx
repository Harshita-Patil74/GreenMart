import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, CreditCard, ShieldCheck, Clock, Ticket, Phone, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import newsletterApi from "../../api/newsletterApi";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone, placeholder: "yourname@upi", helper: "Enter your UPI ID" },
  { id: "phonepe", label: "PhonePe", icon: Phone, placeholder: "Registered mobile number", helper: "Linked to your PhonePe account" },
  { id: "debit", label: "Debit Card", icon: CreditCard, placeholder: "1234 5678 9012 3456", helper: "16-digit card number" },
  { id: "credit", label: "Credit Card", icon: CreditCard, placeholder: "1234 5678 9012 3456", helper: "16-digit card number" },
];

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("checkout"); // checkout | processing | success | failure
  const [error, setError] = useState(null);
  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const loadPlan = async () => {
    try {
      const { data } = await newsletterApi.subscriptionPlan();
      setPlan(data.plan);
    } catch (e) {
      setError(e?.message || "Couldn't load subscription plan.");
    }
  };

  const createCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await newsletterApi.subscriptionCheckout();
      setPayment(data.payment);
      setSubscription(data.subscription);
    } catch (e) {
      setError(e?.message || "Couldn't create checkout.");
      toast.error(e?.message || "Couldn't create checkout.");
    } finally {
      setBusy(false);
    }
  };

  const validateMethod = () => {
    if (method === "upi") {
      if (!upiId.trim()) return "Please enter your UPI ID.";
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
      if (!upiRegex.test(upiId.trim())) return "Please enter a valid UPI ID (e.g. yourname@upi).";
      return null;
    }
    if (method === "phonepe") {
      if (!upiId.trim()) return "Please enter your registered mobile number.";
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(upiId.replace(/\s/g, ""))) return "Please enter a valid 10-digit mobile number.";
      return null;
    }
    if (method === "debit" || method === "credit") {
      if (!cardName.trim()) return "Please enter cardholder name.";
      const cleanCard = cardNumber.replace(/\s/g, "");
      if (!/^\d{16}$/.test(cleanCard)) return "Please enter a valid 16-digit card number.";
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return "Please enter expiry date in MM/YY format.";
      if (!/^\d{3}$/.test(cardCvv)) return "Please enter a valid 3-digit CVV.";
      return null;
    }
    return null;
  };

  const confirmPayment = async () => {
    const validationError = validateMethod();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setStep("processing");

    try {
      const { data } = await newsletterApi.subscriptionConfirmPayment(payment.transactionId);
      setSubscription(data.subscription);
      setStep("success");
      toast.success("Subscription activated successfully!");
    } catch (e) {
      setStep("failure");
      setError(e?.message || "Payment failed.");
      toast.error(e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadMe = async () => {
    try {
      const { data } = await newsletterApi.subscriptionMe();
      setSubscription(data);
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    loadPlan();
    loadMe();
  }, []);

  if (!plan) {
    return (
      <div className="space-y-4 pb-12 max-w-md mx-auto">
        <BackButton fallback="/customer/dashboard" />
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="h-12 w-12 rounded-full bg-[#EAF2E7] flex items-center justify-center text-[#245C3A] font-bold mb-4">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Loading plan...</h1>
        </div>
      </div>
    );
  }

  const amount = plan.amount || 199;
  const currency = plan.currency || "INR";
  const formattedAmount = `₹${amount}`;
  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === method);

  if (step === "processing") {
    return (
      <div className="space-y-4 pb-12 max-w-md mx-auto">
        <BackButton fallback="/customer/dashboard" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[400px] text-center"
        >
          <div className="h-16 w-16 rounded-full bg-[#245C3A] flex items-center justify-center text-white font-bold mb-6 animate-pulse">
            <Smartphone className="h-8 w-8 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-sm text-gray-600 mb-6">Processing your payment... Please wait.</p>
          <div className="w-full max-w-xs">
            <div className="w-full bg-[#E2E6DF] rounded-full h-2">
              <div className="bg-[#245C3A] h-2 rounded-full animate-pulse w-full" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "success") {
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
    return (
      <div className="space-y-4 pb-12 max-w-md mx-auto">
        <BackButton fallback="/customer/dashboard" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[400px] text-center"
        >
          <div className="h-16 w-16 rounded-full bg-[#14532D] flex items-center justify-center text-white font-bold mb-6">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Successful</h1>
          <p className="text-sm text-gray-600 mb-6">Welcome to GreenMart Premium.</p>

          <div className="w-full rounded-xl border border-[#E2E6DF] bg-white p-6 shadow-sm text-left">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="text-sm font-semibold text-gray-900">{plan.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Amount Paid</span>
                <span className="text-sm font-semibold text-[#245C3A]">{formattedAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payment Method</span>
                <span className="text-sm font-semibold text-gray-900">{selectedMethod?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payment Status</span>
                <span className="text-xs font-semibold text-[#16803C] rounded-full bg-[#EAF2E7] px-2 py-0.5">
                  Successful (Mock)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Subscription Status</span>
                <span className="text-xs font-semibold text-[#16803C] rounded-full bg-[#EAF2E7] px-2 py-0.5">
                  Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Start Date</span>
                <span className="text-sm font-semibold text-gray-900">
                  {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Expiry Date</span>
                <span className="text-sm font-semibold text-gray-900">
                  {endDate ? endDate.toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Transaction ID</span>
                <span className="text-xs font-mono text-gray-500 truncate max-w-xs">
                  {payment?.transactionId || "—"}
                </span>
              </div>
              <p className="mt-3 text-[10px] text-[#82908B]">
                This is a mock payment demonstration. No real money was charged.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 w-full">
            <Link to="/customer/dashboard" className="w-full h-10 rounded-lg bg-[#245C3A] flex items-center justify-center text-xs font-semibold text-white hover:bg-[#1E4A30]">
              Go to Customer Dashboard <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
            <Link to="/customer/offers" className="w-full h-10 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-xs font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
              Explore Exclusive Offers <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
            <Link to="/customer/newsletters" className="w-full h-10 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-xs font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
              View My Newsletters <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "failure") {
    return (
      <div className="space-y-4 pb-12 max-w-md mx-auto">
        <BackButton fallback="/customer/dashboard" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[400px] text-center"
        >
          <div className="h-16 w-16 rounded-full bg-[#FBEDE5] flex items-center justify-center text-[#9A3412] font-bold mb-6">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-sm text-gray-600 mb-6">{error || "Payment could not be completed."}</p>
          <p className="text-[10px] text-[#82908B] mb-6">
            Your subscription remains inactive. No amount was charged.
          </p>

          <div className="mt-6 flex flex-col gap-2 w-full">
            <button
              onClick={() => setStep("checkout")}
              disabled={busy}
              className="w-full h-10 rounded-lg bg-[#245C3A] flex items-center justify-center text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#1E4A30]"
            >
              {busy ? "Retrying..." : "Retry Payment"}
            </button>
            <Link to="/customer/dashboard" className="w-full h-10 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-xs font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
              Return to Dashboard <ChevronLeft className="mr-2 h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Checkout step
  const alreadyPending = payment && payment.status === "pending";
  return (
    <div className="space-y-4 pb-12 max-w-md mx-auto">
      <BackButton fallback="/customer/dashboard" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[70vh] text-center"
      >
        <div className="h-16 w-16 rounded-full bg-[#EAF2E7] flex items-center justify-center text-[#245C3A] font-bold mb-6">
          <CreditCard className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{plan.planName}</h1>
        <p className="text-sm text-gray-600 mb-6">
          Get exclusive subscriber discounts, fresh harvest updates, new product announcements, farmer stories, and special promotions.
        </p>

        <div className="w-full rounded-xl border border-[#E2E6DF] bg-[#FAF8F1] p-6 shadow-sm text-left">
          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{formattedAmount}</span>
              <span className="text-xs text-[#82908B]">/month</span>
            </div>
            <p className="mt-1 text-[10px] text-[#64716B]">GreenMart Premium Newsletter — {plan.billingCycle} billing cycle</p>
          </div>

          <div className="space-y-2 mb-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Benefits</h3>
            <ul className="space-y-1 text-xs text-gray-600 list-disc pl-4">
              <li>Access to eligible subscriber-exclusive offers</li>
              <li>Receive eligible newsletter campaign notifications</li>
              <li>New product and fresh harvest updates</li>
              <li>Access to My Newsletters</li>
              <li>Premium subscriber announcements</li>
            </ul>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium text-gray-900">30 days</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Auto-renewal</span>
              <span className="font-medium text-[#C2410C]">Disabled</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3 mb-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-left transition-all ${
                      isSelected
                        ? "border-[#245C3A] bg-[#F0F5EE] shadow-[0_0_0_2px_rgba(36,92,58,0.2)]"
                        : "border-[#E2E6DF] bg-white hover:border-[#477A4E]"
                    }`}
                  >
                    <m.icon className={`h-5 w-5 ${isSelected ? "text-[#245C3A]" : "text-[#68756B]"}`} />
                    <span className={`text-xs font-semibold ${isSelected ? "text-gray-900" : "text-gray-600"}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="space-y-3">
            {method === "upi" && (
              <>
                <label className="text-xs font-semibold text-gray-600 block mb-1">UPI ID</label>
                <input
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                  autoComplete="off"
                />
                <p className="text-[10px] text-[#82908B]">Demo only — no real UPI credentials collected.</p>
              </>
            )}
            {method === "phonepe" && (
              <>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Registered Mobile Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                  autoComplete="off"
                />
                <p className="text-[10px] text-[#82908B]">Demo only — linked to your PhonePe account.</p>
              </>
            )}
            {(method === "debit" || method === "credit") && (
              <>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                  autoComplete="off"
                />
                <label className="text-xs font-semibold text-gray-600 block mb-1 mt-2">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    v = v.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardNumber(v);
                  }}
                  className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                  autoComplete="off"
                  maxLength="19"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="12/27"
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length >= 2) v = v.substring(0, 2) + "/" + v.substring(2);
                        setCardExpiry(v);
                      }}
                      className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                      autoComplete="off"
                      maxLength="5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      className="w-full h-9 rounded-lg border border-[#E2E6DF] bg-white px-3 text-xs focus:border-[#245C3A] focus:outline-none"
                      autoComplete="off"
                      maxLength="3"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#82908B]">Demo only — no real card details stored.</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 w-full">
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 w-full">
          {alreadyPending ? (
            <>
              <button
                onClick={confirmPayment}
                disabled={busy}
                className="w-full h-10 rounded-lg bg-[#245C3A] flex items-center justify-center gap-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#1E4A30]"
              >
                <Smartphone className="h-4 w-4" /> Pay {formattedAmount}
              </button>
              <p className="text-[10px] text-[#82908B]">
                Transaction ID: {payment.transactionId}
              </p>
            </>
          ) : (
            <button
              onClick={createCheckout}
              disabled={busy}
              className="w-full h-10 rounded-lg bg-[#245C3A] flex items-center justify-center gap-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#1E4A30]"
            >
              {busy ? "Creating Checkout..." : `Pay ${formattedAmount}`}
            </button>
          )}
          <Link to="/customer/dashboard" className="w-full h-10 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-sm font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
            Cancel <ChevronLeft className="mr-2 h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="mt-4 text-[10px] text-[#82908B]">
          GreenMart Premium is a paid monthly subscription. Renewal requires another explicit payment. No automatic charges. This is a demonstration checkout — no real money is charged.
        </p>
      </motion.div>
    </div>
  );
}
