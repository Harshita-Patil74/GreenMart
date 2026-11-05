import React, { useEffect, useState } from "react";
import categoryApi from "../../api/categoryApi";
import { getCategoryStyle } from "../../utils/constants.js";

export default function FilterPanel({
  category = "",
  setCategory,
  inStock = true,
  setInStock,
  outOfStock = false,
  setOutOfStock,
  maxPrice = 1000,
  setMaxPrice,
}) {
  const [categoryList, setCategoryList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    categoryApi.list()
      .then(({ data }) => {
        if (active) {
          const cats = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          setCategoryList(cats.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {
        if (active) setCategoryList([]);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  const isSelected = (catName) => category === catName || (category === "" && catName === "All Products");

  return (
    <div className="bg-white rounded-[14px] border border-[#EEF1EF] shadow-card p-5 flex flex-col gap-6 sticky top-20">
      {/* Categories */}
      <div>
        <h3 className="font-heading font-bold text-gray-900 text-sm tracking-wide uppercase mb-3">
          Categories
        </h3>
        <div className="flex flex-col gap-1">
          {categoriesLoading ? (
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition font-medium flex items-center justify-between ${
                  isSelected("All Products")
                    ? "bg-emerald-50 text-[#16803C] font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>All Products</span>
                {isSelected("All Products") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16803C]" />
                )}
              </button>
              {categoryList.map((cat) => {
                const { color } = getCategoryStyle(cat.name);
                const isCatSelected = isSelected(cat.name);
                return (
                  <button
                    key={cat._id || cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition font-medium flex items-center justify-between ${
                      isCatSelected
                        ? "bg-emerald-50 text-[#16803C] font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span style={{ color: isCatSelected ? "#16803C" : "#6B7280" }}>{cat.name}</span>
                    {isCatSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16803C]" />
                    )}
                  </button>
                );
              })}
            </>
          )}
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
