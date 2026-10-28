import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ProductCard from "../../components/product/ProductCard.jsx";
import { fetchWishlist } from "../../features/wishlist/wishlistSlice.js";
import BackButton from "../../components/common/BackButton.jsx";
import NextButton from "../../components/common/NextButton.jsx";

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.wishlist);

  useEffect(() => { dispatch(fetchWishlist()); }, [dispatch]);

  if (loading) return <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Loading wishlist...</div>;
  if (error) return <ErrorState message={error} onRetry={() => dispatch(fetchWishlist())} />;

  return (
    <div className="space-y-4 pb-12">
      <BackButton fallback="/customer/dashboard" />
      <div><h1 className="text-xl font-heading font-bold text-gray-900">My Wishlist</h1><p className="mt-1 text-xs text-gray-500">Products you have saved for later.</p></div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-xs text-gray-500">Your wishlist is empty. <Link to="/shop" className="font-semibold text-primary">Explore products</Link></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((product) => <ProductCard key={product._id || product.id} product={product} />)}</div>
      )}
      <div className="mt-2"><NextButton to="/shop" label="Continue Shopping" /></div>
    </div>
  );
}
