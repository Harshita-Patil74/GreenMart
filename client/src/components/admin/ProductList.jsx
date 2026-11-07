import React from "react";
import ProductCard from "./ProductCard.jsx";

export default function ProductList({ products, onEdit, onDelete, onRestore, isLoading }) {
  if (!products || products.length === 0) {
    return (
      <tr>
        <td colSpan="7" className="p-8 text-center text-gray-500">No products match these filters.</td>
      </tr>
    );
  }
  return products.map((product) => (
    <ProductCard
      key={product._id}
      product={product}
      onEdit={onEdit}
      onDelete={onDelete}
      onRestore={onRestore}
      isLoading={isLoading}
    />
  ));
}
