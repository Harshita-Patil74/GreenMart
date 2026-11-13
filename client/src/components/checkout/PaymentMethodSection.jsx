import React, { useEffect, useId, useRef, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

const PAYMENT_OPTIONS = [
  {
    id: "upi",
    label: "UPI Payment",
    description: "Google Pay, PhonePe, Paytm, BHIM",
    icon: Smartphone,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    description: "Visa, Mastercard, RuPay",
    icon: CreditCard,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    icon: Banknote,
  },
];

const FIELD_BASE =
  "h-11 w-full min-w-0 rounded-[10px] border border-[#E5E7EB] bg-white px-3.5 text-sm text-[#26352B] shadow-[0_1px_1px_rgba(38,53,43,0.03)] transition placeholder:text-[#9AA498] focus:border-[#245C3A] focus:outline-none focus:ring-2 focus:ring-[#245C3A]/15 disabled:cursor-not-allowed disabled:bg-[#F7F8F6] disabled:text-[#6B7280]";

const PAY_BUTTON_BASE =
  "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const PAY_BUTTON_ENABLED =
  "bg-[#245C3A] text-white shadow-[0_1px_2px_rgba(36,92,58,0.24)] hover:bg-[#1E4A30] focus-visible:ring-[#245C3A]/40 active:translate-y-px active:bg-[#1A3D28]";

const PAY_BUTTON_DISABLED =
  "cursor-not-allowed border border-[#E5E7EB] bg-[#F1F2EE] text-[#9AA498]";

const CARD_HEIGHT = "h-[96px] sm:h-[104px]";

function PaymentOptionCard({ option, selected, onSelect }) {
  const Icon = option.icon;
  return (
    <label
      data-selected={selected ? "true" : "false"}
      className={`group relative flex w-full min-w-0 cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-200 ${CARD_HEIGHT} ${
        selected
          ? "border-[#245C3A] bg-[#EAF2E7] shadow-[0_2px_8px_rgba(36,92,58,0.12)]"
          : "border-[#E5E7EB] bg-white hover:-translate-y-0.5 hover:border-[#C9D3C6] hover:shadow-[0_4px_12px_rgba(38,53,43,0.08)]"
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={option.id}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition-all duration-200 ${
          selected
            ? "border-[#245C3A]/20 bg-white text-[#245C3A] shadow-[0_1px_2px_rgba(36,92,58,0.1)]"
            : "border-[#EEF1EC] bg-[#F7F8F6] text-[#477A4E] group-hover:bg-white group-hover:border-[#D6DBD3] group-hover:shadow-[0_1px_2px_rgba(38,53,43,0.05)]"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-[#26352B]">
          {option.label}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-[#6B7280]">
          {option.description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          selected ? "border-[#245C3A] bg-[#245C3A]" : "border-[#D6DBD3] bg-white group-hover:border-[#B9C4B4]"
        }`}
      >
        <span className={`h-2 w-2 rounded-full bg-white transition-all duration-200 ${selected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} />
      </span>
    </label>
  );
}

function Field({ label, htmlFor, error, errorId, className = "", children }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-[#26352B]">
          {label}
        </label>
        {error && <span className="text-[10px] font-semibold text-[#B42318]">Required</span>}
      </div>
      {children}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[11px] font-medium text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}

function PayButton({ children, loading, disabled, onClick }) {
  const inactive = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inactive}
      aria-busy={loading}
      className={`${PAY_BUTTON_BASE} ${inactive ? PAY_BUTTON_DISABLED : PAY_BUTTON_ENABLED}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function PaymentFeedback({ confirmed, failed, methodLabel }) {
  if (confirmed) {
    return (
      <div
        role="status"
        className="mt-3 flex items-center gap-2 rounded-lg border border-[#245C3A]/15 bg-[#EAF2E7] px-3 py-2 text-xs font-medium text-[#245C3A]"
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>✓ Payment successful via {methodLabel}</span>
      </div>
    );
  }
  if (failed) {
    return (
      <div
        role="alert"
        className="mt-3 flex items-center gap-2 rounded-lg border border-[#F2C9C0] bg-[#FBEDE5] px-3 py-2 text-xs font-medium text-[#9A3412]"
      >
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>✗ Payment failed. Try again.</span>
      </div>
    );
  }
  return null;
}

function SimulationNote({ children }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 text-[11px] leading-4 text-[#6B7280]">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#477A4E]" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function PanelHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[#E5E7EB] pb-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[#245C3A]/10 bg-[#EAF2E7] text-[#245C3A]">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-[#26352B]">{title}</h3>
        {description && <p className="mt-0.5 text-xs leading-4 text-[#6B7280]">{description}</p>}
      </div>
    </div>
  );
}

function Panel({ icon, title, description, children }) {
  return (
    <div>
      <PanelHeader icon={icon} title={title} description={description} />
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function PaymentMethodSection({
  paymentMethod,
  onSelectPaymentMethod,
  upiForm,
  onUpiChange,
  cardForm,
  onCardChange,
  paymentProcessing,
  paymentConfirmed,
  paymentFailed,
  onPay,
  onPlaceOrder,
  placingOrder = false,
  orderButtonDisabled = false,
}) {
  const uid = useId().replace(/:/g, "");
  const [fieldErrors, setFieldErrors] = useState({});
  const codSubmitGuard = useRef(false);

  useEffect(() => {
    if (!placingOrder) codSubmitGuard.current = false;
  }, [placingOrder]);

  const selectedOption = PAYMENT_OPTIONS.find((option) => option.id === paymentMethod) || PAYMENT_OPTIONS[2];

  const handleMethodChange = (id) => {
    setFieldErrors({});
    codSubmitGuard.current = false;
    onSelectPaymentMethod(id);
  };

  const clearFieldError = (key) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const upiValid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiForm.vpa.trim());
  const cardNumberValid = /^\d{16}$/.test(cardForm.number.replace(/\s+/g, ""));
  const expiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardForm.expiry.trim());
  const cvvValid = /^\d{3,4}$/.test(cardForm.cvv.trim());

  const validateUpi = () => {
    const errors = {};
    if (!upiForm.vpa.trim()) errors.vpa = "UPI ID is required.";
    else if (!upiValid) errors.vpa = "Enter a valid UPI ID, for example name@upi.";
    setFieldErrors(errors);
    return !errors.vpa;
  };

  const validateCard = () => {
    const errors = {};
    if (!cardForm.number.trim()) errors.number = "Card number is required.";
    else if (!cardNumberValid) errors.number = "Enter a valid 16-digit card number.";
    if (!cardForm.expiry.trim()) errors.expiry = "Expiry date is required.";
    else if (!expiryValid) errors.expiry = "Use MM/YY format.";
    if (!cardForm.cvv.trim()) errors.cvv = "CVV is required.";
    else if (!cvvValid) errors.cvv = "CVV must be 3 digits.";
    setFieldErrors(errors);
    return !Object.keys(errors).length;
  };

  const handleUpiPay = () => {
    if (paymentProcessing || paymentConfirmed) return;
    if (!upiValid) {
      validateUpi();
      return;
    }
    onPay("UPI");
  };

  const handleCardPay = () => {
    if (paymentProcessing || paymentConfirmed) return;
    if (!cardNumberValid || !expiryValid || !cvvValid) {
      validateCard();
      return;
    }
    onPay("Card");
  };

  const handleCodPlaceOrder = () => {
    if (placingOrder || codSubmitGuard.current) return;
    codSubmitGuard.current = true;
    onPlaceOrder();
  };

  const handleUpiChange = (value) => {
    onUpiChange(value);
    if (fieldErrors.vpa) clearFieldError("vpa");
  };

  const handleCardChange = (key) => (value) => {
    onCardChange(key, value);
    if (fieldErrors[key]) clearFieldError(key);
  };

  const onlineDisabled = paymentConfirmed || paymentProcessing;
  const upiDisabled = !upiValid || onlineDisabled;
  const cardDisabled = !cardNumberValid || !expiryValid || !cvvValid || onlineDisabled;
  const codDisabled = orderButtonDisabled || placingOrder;

  return (
    <section
      aria-labelledby={`${uid}-payment-heading`}
      className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(38,53,43,0.06)] sm:p-5"
    >
      <div className="mb-3.5 flex items-start justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
          <h2 id={`${uid}-payment-heading`} className="text-base font-bold leading-5 text-[#26352B] sm:text-lg">
            Payment Method
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7280]">Choose how you want to pay.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FAF8F1] px-2 py-1 text-[10px] font-semibold text-[#477A4E]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#245C3A]" aria-hidden="true" />
          Secure
        </span>
      </div>

      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 sm:items-stretch">
        {PAYMENT_OPTIONS.map((option) => (
          <PaymentOptionCard
            key={option.id}
            option={option}
            selected={paymentMethod === option.id}
            onSelect={() => handleMethodChange(option.id)}
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white p-3.5 sm:mt-4 sm:p-4">
        {selectedOption.id === "upi" && (
          <Panel
            icon={Smartphone}
            title="UPI Payment"
            description="Enter your UPI ID (VPA) to proceed."
          >
            <Field
              label="UPI ID"
              htmlFor={`${uid}-upi`}
              error={fieldErrors.vpa}
              errorId={fieldErrors.vpa ? `${uid}-upi-error` : undefined}
            >
              <input
                id={`${uid}-upi`}
                name="upiId"
                type="text"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                value={upiForm.vpa}
                onChange={(event) => handleUpiChange(event.target.value)}
                onBlur={() => { if (upiForm.vpa.trim() && !upiValid) validateUpi(); }}
                placeholder="name@upi"
                aria-invalid={fieldErrors.vpa ? "true" : "false"}
                aria-describedby={fieldErrors.vpa ? `${uid}-upi-error` : undefined}
                disabled={paymentProcessing}
                className={`${FIELD_BASE} ${fieldErrors.vpa ? "border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]/15" : ""}`}
              />
            </Field>
            <PayButton loading={paymentProcessing} disabled={upiDisabled} onClick={handleUpiPay}>
              {paymentProcessing ? "Processing…" : paymentConfirmed ? "Payment completed" : "Pay via UPI"}
            </PayButton>
            <PaymentFeedback confirmed={paymentConfirmed} failed={paymentFailed} methodLabel="UPI" />
            <SimulationNote>
              This is a simulated payment — no real money will be deducted.
            </SimulationNote>
          </Panel>
        )}

        {selectedOption.id === "card" && (
          <Panel
            icon={CreditCard}
            title="Credit / Debit Card"
            description="Enter your card details to proceed."
          >
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <Field label="Cardholder Name" htmlFor={`${uid}-card-name`} error={fieldErrors.name} errorId={fieldErrors.name ? `${uid}-card-name-error` : undefined} className="min-[420px]:col-span-2">
                <input
                  id={`${uid}-card-name`}
                  name="cardholderName"
                  type="text"
                  autoComplete="cc-name"
                  value={cardForm.name || ""}
                  onChange={(event) => handleCardChange("name")(event.target.value)}
                  placeholder="Name as printed on card"
                  disabled={paymentProcessing}
                  className={`${FIELD_BASE} ${fieldErrors.name ? "border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]/15" : ""}`}
                />
              </Field>
              <Field label="Card Number" htmlFor={`${uid}-card-number`} error={fieldErrors.number} errorId={fieldErrors.number ? `${uid}-card-number-error` : undefined} className="min-[420px]:col-span-2">
                <input
                  id={`${uid}-card-number`}
                  name="cardNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardForm.number}
                  onChange={(event) => handleCardChange("number")(event.target.value)}
                  placeholder="1234 5678 9012 3456"
                  aria-invalid={fieldErrors.number ? "true" : "false"}
                  aria-describedby={fieldErrors.number ? `${uid}-card-number-error` : undefined}
                  disabled={paymentProcessing}
                  className={`${FIELD_BASE} ${fieldErrors.number ? "border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]/15" : ""}`}
                />
              </Field>
              <Field label="Expiry Date" htmlFor={`${uid}-card-expiry`} error={fieldErrors.expiry} errorId={fieldErrors.expiry ? `${uid}-card-expiry-error` : undefined}>
                <input
                  id={`${uid}-card-expiry`}
                  name="cardExpiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={cardForm.expiry}
                  onChange={(event) => handleCardChange("expiry")(event.target.value)}
                  placeholder="MM/YY"
                  aria-invalid={fieldErrors.expiry ? "true" : "false"}
                  aria-describedby={fieldErrors.expiry ? `${uid}-card-expiry-error` : undefined}
                  disabled={paymentProcessing}
                  className={`${FIELD_BASE} ${fieldErrors.expiry ? "border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]/15" : ""}`}
                />
              </Field>
              <Field label="CVV" htmlFor={`${uid}-card-cvv`} error={fieldErrors.cvv} errorId={fieldErrors.cvv ? `${uid}-card-cvv-error` : undefined}>
                <input
                  id={`${uid}-card-cvv`}
                  name="cardCvv"
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cardForm.cvv}
                  onChange={(event) => handleCardChange("cvv")(event.target.value)}
                  placeholder="123"
                  aria-invalid={fieldErrors.cvv ? "true" : "false"}
                  aria-describedby={fieldErrors.cvv ? `${uid}-card-cvv-error` : undefined}
                  disabled={paymentProcessing}
                  className={`${FIELD_BASE} ${fieldErrors.cvv ? "border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]/15" : ""}`}
                />
              </Field>
            </div>
            <PayButton loading={paymentProcessing} disabled={cardDisabled} onClick={handleCardPay}>
              {paymentProcessing ? "Processing…" : paymentConfirmed ? "Payment completed" : "Pay via Card"}
            </PayButton>
            <PaymentFeedback confirmed={paymentConfirmed} failed={paymentFailed} methodLabel="Card" />
            <SimulationNote>
              This is a simulated payment — no real money will be deducted. Do not enter a real card PIN.
            </SimulationNote>
          </Panel>
        )}

        {selectedOption.id === "cod" && (
          <Panel
            icon={Banknote}
            title="Cash on Delivery"
            description="Pay in cash when your order is delivered. No online payment required."
          >
            <ul className="space-y-2">
              {[
                "Keep the exact amount ready when your order arrives.",
                "Please have a valid phone number available for delivery updates.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs leading-4 text-[#6B7280]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#245C3A]" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <PayButton loading={placingOrder} disabled={codDisabled} onClick={handleCodPlaceOrder}>
              {placingOrder ? "Processing…" : "Place COD Order"}
            </PayButton>
            <p className="mt-2 text-center text-xs leading-4 text-[#6B7280]">
              You can review the final payable amount in the checkout summary before placing this order.
            </p>
          </Panel>
        )}
      </div>
    </section>
  );
}

export { PAYMENT_OPTIONS };