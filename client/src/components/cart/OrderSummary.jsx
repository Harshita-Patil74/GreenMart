import React from "react";
import { Package } from "lucide-react";
import getImageUrl from "../../utils/imageUrl";
import {
  formatINR,
  itemDiscount,
  itemLineGross,
  itemLineTotal,
  itemPremiumDiscount,
  money,
} from "../../utils/cartTotals.js";

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

export default function OrderSummary({
  subtotal = 0,
  delivery = 0,
  discount = 0,
  regularDiscount,
  premiumDiscount,
  total = 0,
  deliveryReady = true,
  items = [],
  showItems = false,
  buttonLabel = "Proceed to Checkout",
  onAction,
  loading = false,
  disabled = false,
}) {
  const deliveryDisplay = deliveryReady ? formatINR(delivery) : "—";
  const totalDisplay = deliveryReady ? formatINR(total) : "—";
  const savings = Number(discount) || 0;
  const itemPremiumSavings = money(items.reduce((sum, item) => sum + itemPremiumDiscount(item), 0));
  const premiumSavings = premiumDiscount == null
    ? money(Math.min(savings, itemPremiumSavings))
    : money(Math.min(savings, Number(premiumDiscount) || 0));
  const regularSavings = regularDiscount == null
    ? money(Math.max(0, savings - premiumSavings))
    : money(Math.max(0, Math.min(savings - premiumSavings, Number(regularDiscount) || 0)));

  return (
    <aside className="space-y-4 rounded-[14px] border border-gray-100 bg-white p-4 shadow-card sm:p-5 lg:sticky lg:top-24">
      <h3 className="font-heading text-base font-bold text-gray-900">
        Order Summary
      </h3>

      {showItems && items.length > 0 && (
        <div className="max-h-60 space-y-3 overflow-y-auto border-b border-gray-100 pb-3">
          {items.map((it, idx) => {
            const product = it.product || {};
            const name = product.name || it.name;
            const qty = it.quantity || 1;
            const image = product.images?.[0] || it.image;
            const appliedOffer = it.offer || it.offerSnapshot;
            const offerTitle = appliedOffer?.title || appliedOffer?.offerTitle || (product.offer?.title
              ? `${product.offer.title} · ${Number(product.offer.minimumQuantity) > qty ? `buy ${product.offer.minimumQuantity} or more` : Number(product.offer.minimumAmount) > 0 ? `min. order ₹${product.offer.minimumAmount}` : "available offer"}`
              : "");
            const gross = itemLineGross(it);
            const itemSavings = itemDiscount(it);
            const itemPremiumSavings = itemPremiumDiscount(it);
            const itemRegularSavings = money(Math.max(0, itemSavings - itemPremiumSavings));
            const chargedTotal = itemLineTotal(it);
            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  {image ? <img src={getImageUrl(image)} alt="" onError={(e)=>{e.currentTarget.style.display="none"}} className="h-10 w-10 shrink-0 rounded-[8px] border border-gray-100 bg-gray-50 object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-gray-100 bg-gray-50"><Package className="h-4 w-4 text-gray-400" /></div>}
                  <div className="truncate">
                    <p className="truncate font-semibold text-gray-800">{name}</p>
                    <p className="text-gray-400">Qty: {qty}</p>
                    {offerTitle && <p className="truncate text-[10px] text-emerald-700">{offerTitle}</p>}
                  </div>
                </div>
                <span className="shrink-0 text-right tabular-nums">
                  {itemSavings > 0 && <span className="block text-[10px] text-gray-400 line-through">{formatINR(gross)}</span>}
                  <span className="font-semibold text-gray-900">{formatINR(chargedTotal)}</span>
                  {itemRegularSavings > 0 && <span className="block text-[10px] text-emerald-700">Regular saved {formatINR(itemRegularSavings)}</span>}
                  {itemPremiumSavings > 0 && <span className="block text-[10px] font-medium text-emerald-800">Premium saved {formatINR(itemPremiumSavings)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2.5">
        <SummaryRow label="Original Product Subtotal" value={formatINR(subtotal)} />
        <SummaryRow label="Regular Offer Savings" value={`− ${formatINR(regularSavings)}`} tone={regularSavings > 0 ? "savings" : "muted"} />
        <SummaryRow label="Exclusive Subscriber Savings" value={`− ${formatINR(premiumSavings)}`} tone={premiumSavings > 0 ? "savings" : "muted"} />
        <SummaryRow label="Total Discount" value={savings > 0 ? `− ${formatINR(savings)}` : formatINR(0)} tone={savings > 0 ? "savings" : "muted"} strong={savings > 0} />
        <SummaryRow label="Delivery Charge" value={deliveryDisplay} />
      </div>

      <hr className="border-gray-100" />

      <SummaryRow label="Final Payable Amount" value={totalDisplay} strong />
      {savings > 0 && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
          You saved {formatINR(savings)} on this order.
        </p>
      )}

      {buttonLabel && onAction && (
        <button
          onClick={onAction}
          disabled={loading || disabled}
          aria-busy={loading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#16803C] px-4 py-2 text-sm font-semibold text-white shadow-btn transition hover:bg-[#126B32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16803C] focus-visible:ring-offset-2 active:bg-[#0E5427] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processing..." : buttonLabel}
        </button>
      )}
    </aside>
  );
}
