import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";

export default function ProductCard({ product, onEdit, onDelete, isLoading }) {
  return (
    <tr key={product._id} className="hover:bg-gray-50/60 border-b border-gray-100 last:border-0">
      <td className="px-3 py-2">
        <ImageWithFallback src={getImageUrl(product.images?.[0])} alt={product.name} className="h-10 w-10 rounded-md object-cover border border-gray-200" />
      </td>
      <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
      <td className="px-3 py-2 text-gray-600 text-[10px]">{product.category}</td>
      <td className="px-3 py-2 font-semibold text-gray-900">₹{product.price}</td>
      <td className="px-3 py-2 text-gray-600 text-[10px]">{product.stock}</td>
      <td className="px-3 py-2">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${product.status === "Inactive" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>
          {product.status || "Active"}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(product)}
            disabled={isLoading}
            aria-label={`Edit ${product.name}`}
            className="rounded p-1.5 text-gray-600 hover:text-primary disabled:opacity-50"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            disabled={isLoading}
            aria-label={`Delete ${product.name}`}
            className="rounded p-1.5 text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
