import React from "react";

const CATEGORY_LIST = [
  "All Products",
  "Vegetables",
  "Fruits",
  "Grains & Pulses",
  "Dairy & Eggs",
  "Spices & Herbs",
  "Eco Friendly",
  "Others",
];

export default function FilterPanel({
  category = "All Products",
  setCategory,
  inStock = true,
  setInStock,
  outOfStock = false,
  setOutOfStock,
  maxPrice = 1000,
  setMaxPrice,
}) {
  return (
    <div className="bg-white rounded-[14px] border border-[#EEF1EF] shadow-card p-5 flex flex-col gap-6 sticky top-20">
      {/* Categories */}
      <div>
        <h3 className="font-heading font-bold text-gray-900 text-sm tracking-wide uppercase mb-3">
          Categories
        </h3>
        <div className="flex flex-col gap-1">
          {CATEGORY_LIST.map((c) => {
            const isSelected = category === c || (category === "" && c === "All Products");
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c === "All Products" ? "" : c)}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition font-medium flex items-center justify-between ${
                  isSelected
                    ? "bg-emerald-50 text-[#16803C] font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{c}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16803C]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-gray-900 text-sm tracking-wide uppercase">
            Price Range
          </h3>
          <span className="text-xs font-semibold text-[#16803C] bg-emerald-50 px-2 py-0.5 rounded-md">
            ₹0 – ₹{maxPrice}+
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#16803C] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-1">
          <span>₹0</span>
          <span>₹500</span>
          <span>₹1000+</span>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Availability */}
      <div>
        <h3 className="font-heading font-bold text-gray-900 text-sm tracking-wide uppercase mb-3">
          Availability
        </h3>
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="w-4 h-4 rounded text-[#16803C] focus:ring-[#16803C] accent-[#16803C] border-gray-300"
            />
            <span className="font-medium">In Stock</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={outOfStock}
              onChange={(e) => setOutOfStock && setOutOfStock(e.target.checked)}
              className="w-4 h-4 rounded text-[#16803C] focus:ring-[#16803C] accent-[#16803C] border-gray-300"
            />
            <span className="font-medium">Out of Stock</span>
          </label>
        </div>
      </div>
    </div>
  );
}
