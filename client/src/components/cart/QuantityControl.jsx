import React from "react";

export default function QuantityControl({
  productId,
  name,
  quantity = 1,
  stock = null,
  onUpdate,
  pending = false,
  disabled = false,
}) {
  const canDecrease = quantity > 1;
  const canIncrease = stock == null ? true : quantity < stock;
  const isDisabled = disabled || pending;

  const handleDecrease = () => {
    if (isDisabled || !canDecrease) return;
    onUpdate(productId, quantity - 1);
  };

  const handleIncrease = () => {
    if (isDisabled || !canIncrease) return;
    onUpdate(productId, quantity + 1);
  };

  return (
    <div className="flex items-center justify-center border border-gray-200 rounded-[10px] bg-gray-50 w-32 h-9 mx-auto">
      <button
        onClick={handleDecrease}
        disabled={isDisabled || !canDecrease}
        aria-label={`Decrease ${name || "item"} quantity`}
        title={!canDecrease ? "Minimum quantity is 1" : "Decrease quantity"}
        className="w-7 h-full text-gray-600 hover:bg-white active:bg-gray-100 rounded-l-[8px] font-bold text-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        −
      </button>
      <span className="flex-1 text-center font-semibold text-xs text-gray-900 select-none">
        {quantity}
      </span>
      <button
        onClick={handleIncrease}
        disabled={isDisabled || !canIncrease}
        aria-label={`Increase ${name || "item"} quantity`}
        title={!canIncrease ? "Maximum available stock reached" : "Increase quantity"}
        className="w-7 h-full text-gray-600 hover:bg-white active:bg-gray-100 rounded-r-[8px] font-bold text-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        +
      </button>
    </div>
  );
}
