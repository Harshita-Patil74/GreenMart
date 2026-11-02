import React from "react";
import { Package, Trash2 } from "lucide-react";
import getImageUrl from "../../utils/imageUrl";
import QuantityControl from "./QuantityControl.jsx";

export default function CartTable({ items = [], onUpdate, onRemove, disabled = false }) {
  if (!items.length) {
    return <div className="p-8 text-center text-gray-500">Your cart is empty.</div>;
  }

  return (
    <div className="bg-white rounded-[14px] border border-gray-100 shadow-card overflow-hidden">
      <div className="divide-y divide-gray-100 lg:hidden">
        {items.map((it) => {
          const product = it.product || {};
          const id = product._id || product.id || it.productId || it.id;
          const name = product.name || it.name || "Product unavailable";
          const price = Number(product.price ?? it.price ?? 0);
          const offer = it.offer;
          const chargedUnitPrice = Number(offer?.finalUnitPrice ?? price);
          const unit = product.unit || "kg";
          const quantity = Number(it.quantity || 0);
          const stock = product.stock != null ? Number(product.stock) : null;
          const image = product.images?.[0];
          const lineTotal = Number(offer?.lineTotal ?? price * quantity);
          const itemPending = Boolean(it._pending);

          return (
            <article key={id} className="min-w-0 p-3 sm:p-4">
              <div className="flex min-w-0 items-start gap-3">
                {image ? (
                  <img src={getImageUrl(image)} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-16 w-16 shrink-0 rounded-[10px] border border-gray-100 bg-gray-50 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] border border-gray-100 bg-gray-50"><Package className="h-5 w-5 text-gray-400" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-gray-900">{name}</span>
                  <span className="mt-0.5 block text-xs text-gray-400 capitalize">{product.category || "Organic"}</span>
                  <span className="mt-1 block text-sm font-medium text-gray-700">
                    ₹ {chargedUnitPrice.toFixed(2)} <span className="text-xs text-gray-400">/ {unit}</span>
                  </span>
                  {offer && <span className="block text-[10px] font-medium text-emerald-700">{offer.title}</span>}
                  {product.offer && !offer && <span className="mt-1 block text-[10px] font-medium text-emerald-700">{product.offer.title}</span>}
                  {stock === 0 && <span className="mt-1 block text-[10px] font-medium text-red-600">Out of stock</span>}
                </div>
                <button
                  onClick={() => onRemove(id)}
                  disabled={disabled || !id}
                  aria-label={`Remove ${name}`}
                  className="shrink-0 rounded-[8px] p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Remove Item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <QuantityControl
                  productId={id}
                  name={name}
                  quantity={quantity}
                  stock={stock}
                  onUpdate={(pid, qty) => onUpdate(pid, qty)}
                  pending={itemPending}
                  disabled={disabled || !id}
                />
                <div className="min-w-0 text-right">
                  <span className="block text-[10px] text-gray-400">Item total</span>
                  <span className="whitespace-nowrap text-sm font-bold text-gray-900">₹ {lineTotal.toFixed(2)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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
              const offer = it.offer;
              const chargedUnitPrice = Number(offer?.finalUnitPrice ?? price);
              const unit = product.unit || "kg";
              const quantity = Number(it.quantity || 0);
              const stock = product.stock != null ? Number(product.stock) : null;
              const image = product.images?.[0];
              const lineTotal = Number(offer?.lineTotal ?? price * quantity);
              const itemPending = Boolean(it._pending);

              return (
                <tr key={id} className="hover:bg-gray-50/50 transition">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {image ? (
                        <img src={getImageUrl(image)} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-14 w-14 shrink-0 rounded-[10px] border border-gray-100 bg-gray-50 object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-gray-100 bg-gray-50"><Package className="h-5 w-5 text-gray-400" /></div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 block">{name}</span>
                        <span className="text-xs text-gray-400 capitalize">{product.category || "Organic"}</span>
                        {product.offer && !offer && <span className="mt-[2px] block text-[10px] font-medium text-emerald-700">
                          {product.offer.title}{Number(product.offer.minimumQuantity) > quantity ? ` · buy ${product.offer.minimumQuantity} or more` : Number(product.offer.minimumAmount) > 0 ? ` · min. order ₹${product.offer.minimumAmount}` : ""}
                        </span>}
                        {stock === 0 && <span className="mt-[2px] text-[10px] font-medium text-red-600">Out of stock</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-700 whitespace-nowrap">
                    ₹ {chargedUnitPrice.toFixed(2)} <span className="text-xs text-gray-400">/ {unit}</span>
                    {offer && <span className="block text-[10px] font-medium text-emerald-700">{offer.title}</span>}
                    {offer && <span className="text-[10px] text-gray-400 line-through">₹ {price.toFixed(2)}</span>}
                  </td>
                  <td className="py-4 px-4">
                    <QuantityControl
                      productId={id}
                      name={name}
                      quantity={quantity}
                      stock={stock}
                      onUpdate={(pid, qty) => onUpdate(pid, qty)}
                      pending={itemPending}
                      disabled={disabled || !id}
                    />
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-900 whitespace-nowrap">
                    ₹ {lineTotal.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onRemove(id)}
                      disabled={disabled || !id}
                      aria-label={`Remove ${name}`}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-[8px] hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
