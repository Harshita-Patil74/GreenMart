import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import ProductCard from "../../components/product/ProductCard.jsx";
import { fetchWishlist } from "../../features/wishlist/wishlistSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
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
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="space-y-1"
      >
        <h1 className="text-xl font-heading font-bold text-gray-900">My Wishlist</h1>
        <p className="mt-1 text-xs text-gray-500">Products you have saved for later.</p>
      </motion.div>
      {items.length === 0 ? (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-gray-100 bg-white p-8 text-center text-xs text-gray-500"
        >
          Your wishlist is empty. <Link to="/shop" className="font-semibold text-primary">Explore products</Link>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {items.map((product) => (
            <motion.div key={product._id || product.id} variants={staggerItem} initial="hidden" animate="visible">
              <ProductCard key={product._id || product.id} product={product} />
            </motion.div>
          ))}
        </motion.div>
      )}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="mt-2"
      >
        <NextButton to="/shop" label="Continue Shopping" />
      </motion.div>
    </div>
  );
}
