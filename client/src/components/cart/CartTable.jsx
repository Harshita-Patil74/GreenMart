import React from "react";
import { Package, Trash2 } from "lucide-react";
import getImageUrl from "../../utils/imageUrl";

export default function CartTable({ items = [], onUpdate, onRemove, disabled = false }) {
  if (!items.length) {
    return <div className="p-8 text-center text-gray-500">Your cart is empty.</div>;
  }

  return (
    <div className="bg-white rounded-[14px] border border-gray-100 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="py-4 px-5">Product</th>
              <th className="py-4 px-4">Price</th>
              <th className="py-4 px-4 text-center">Quantity</th>
              <th className="py-4 px-4">Total</th>
              <th className="py-4 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {items.map((it) => {
              const product = it.product || {};
              const id = product._id || product.id || it.productId || it.id;
              const name = product.name || it.name || "Product unavailable";
              const price = Number(product.price ?? it.price ?? 0);
              const unit = product.unit || "kg";
              const quantity = Number(it.quantity || 0);
              const image = product.images?.[0];
              const lineTotal = price * quantity;

              return (
                <tr key={id} className="hover:bg-gray-50/50 transition">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {image ? <img src={getImageUrl(image)} alt="" onError={(e)=>{e.currentTarget.style.display='none'}} className="h-14 w-14 shrink-0 rounded-[10px] border border-gray-100 bg-gray-50 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-gray-100 bg-gray-50"><Package className="h-5 w-5 text-gray-400" /></div>}
                      <div>
                        <span className="font-semibold text-gray-900 block">{name}</span>
                        <span className="text-xs text-gray-400 capitalize">{product.category || "Organic"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-700 whitespace-nowrap">
                    ₹ {price} <span className="text-xs text-gray-400">/ {unit}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center border border-gray-200 rounded-[10px] bg-gray-50 w-24 h-8 mx-auto">
                      <button
                        onClick={() => onUpdate(id, quantity - 1)}
                        disabled={disabled || !id}
                        aria-label={`Decrease ${name} quantity`}
                        className="w-7 h-full text-gray-600 hover:bg-white rounded-l-[8px] font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-semibold text-xs text-gray-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdate(id, quantity + 1)}
                        disabled={disabled || !id}
                        aria-label={`Increase ${name} quantity`}
                        className="w-7 h-full text-gray-600 hover:bg-white rounded-r-[8px] font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-900 whitespace-nowrap">
                    ₹ {lineTotal}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onRemove(id)}
                      disabled={disabled || !id}
                      aria-label={`Remove ${name}`}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-[8px] hover:bg-red-50 transition"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
