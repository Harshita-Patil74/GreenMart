import React from "react";
import ProductCard from "./ProductCard.jsx";
import Skeleton from "../common/Skeleton.jsx";
import EmptyState from "../common/EmptyState.jsx";
export default function ProductGrid({ items, loading }) {
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-64"/>)}</div>;
  if (!items || !items.length) return <EmptyState text="No products yet" />;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{items.map(p=><ProductCard key={p._id} product={p}/>)}</div>;
}
