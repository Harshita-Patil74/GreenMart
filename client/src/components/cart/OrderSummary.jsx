import React from "react";
import { Package } from "lucide-react";
import getImageUrl from "../../utils/imageUrl";

export default function OrderSummary({
  subtotal = 0,
  delivery = 0,
  discount = 0,
  total = 0,
  items = [],
  showItems = false,
  buttonLabel = "Proceed to Checkout",
  onAction,
  loading = false,
}) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-100 shadow-card p-5 space-y-4">
      <h3 className="font-heading font-bold text-gray-900 text-base">
        Order Summary
      </h3>

      {/* Item preview in Checkout */}
      {showItems && items.length > 0 && (
        <div className="space-y-3 pb-3 border-b border-gray-100 max-h-60 overflow-y-auto">
          {items.map((it, idx) => {
            const product = it.product || {};
            const name = product.name || it.name;
            const price = Number(product.price ?? it.price ?? 0);
            const qty = it.quantity || 1;
            const image = product.images?.[0];
            const appliedOffer = it.offer;
            const chargedTotal = Number(appliedOffer?.lineTotal ?? price * qty);
            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {image ? <img src={getImageUrl(image)} alt="" onError={(e)=>{e.currentTarget.style.display='none'}} className="h-10 w-10 shrink-0 rounded-[8px] border border-gray-100 bg-gray-50 object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-gray-100 bg-gray-50"><Package className="h-4 w-4 text-gray-400" /></div>}
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 truncate">{name}</p>
                    <p className="text-gray-400">Qty: {qty}</p>
                    {(appliedOffer?.title || product.offer?.title) && <p className="truncate text-[10px] text-emerald-700">
                      {appliedOffer?.title || `${product.offer.title} · ${Number(product.offer.minimumQuantity) > qty ? `buy ${product.offer.minimumQuantity} or more` : Number(product.offer.minimumAmount) > 0 ? `min. order ₹${product.offer.minimumAmount}` : "available offer"}`}
                    </p>}
                  </div>
                </div>
                <span className="shrink-0 text-right">
                  {appliedOffer && <span className="block text-[10px] text-gray-400 line-through">₹ {(price * qty).toFixed(2)}</span>}
                  <span className="font-semibold text-gray-900">₹ {chargedTotal.toFixed(2)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Price breakdown */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">₹ {subtotal}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Delivery Charge</span>
          <span className="font-semibold text-gray-900">₹ {delivery}</span>
        </div>
        {Number(discount) > 0 && <div className="flex justify-between items-center text-emerald-700">
          <span>Offer savings</span>
          <span className="font-semibold">− ₹ {Number(discount).toFixed(2)}</span>
        </div>}
      </div>

      <hr className="border-gray-100" />

      {/* Total */}
      <div className="flex justify-between items-center text-base">
        <span className="font-bold text-gray-900">Total</span>
        <span className="font-extrabold text-lg text-gray-900">₹ {total}</span>
      </div>

      {/* Action Button */}
      {buttonLabel && onAction && (
        <button
          onClick={onAction}
          disabled={loading}
          className="w-full h-11 bg-[#16803C] hover:bg-[#126B32] active:bg-[#0E5427] text-white font-semibold text-sm rounded-[10px] shadow-btn transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? "Processing..." : buttonLabel}
        </button>
      )}
    </div>
  );
}
