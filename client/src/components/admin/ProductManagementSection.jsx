import React from "react";
import ProductList from "./ProductList.jsx";

export default function ProductManagementSection({ products, onEdit, onDelete, isLoading }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Product Name</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <ProductList products={products} onEdit={onEdit} onDelete={onDelete} isLoading={isLoading} />
          </tbody>
        </table>
      </div>
    </section>
  );
}
