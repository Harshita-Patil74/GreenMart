import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import newsletterApi from "../../api/newsletterApi";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("confirm"); // confirm | success | error
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or expired unsubscribe link.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await newsletterApi.unsubscribeByToken(token);
      setStatus("success");
      setMessage(data?.message || "You have successfully unsubscribed from GreenMart updates.");
    } catch (e) {
      setStatus("error");
      setMessage(e?.message || "Invalid or expired unsubscribe link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F1] px-4">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm border border-gray-100 text-center"
      >
        <h1 className="text-xl font-bold text-[#245C3A]">GreenMart</h1>
        <p className="text-xs text-gray-500 mt-1">Fresh. Organic. Direct from Farmers.</p>
        {status === "confirm" && (
          <>
            <p className="mt-4 text-sm text-gray-700">Are you sure you want to unsubscribe from GreenMart newsletter updates?</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={handleConfirm} disabled={loading} className="rounded-lg bg-[#245C3A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {loading ? "Processing..." : "Confirm Unsubscribe"}
              </button>
              <Link to="/" className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700">Keep Me Subscribed</Link>
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <p className="mt-4 text-sm text-gray-700">{message}</p>
            <Link to="/" className="mt-4 inline-block rounded-lg bg-[#245C3A] px-4 py-2 text-xs font-semibold text-white">Return to GreenMart</Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="mt-4 text-sm text-red-700">{message}</p>
            <Link to="/" className="mt-4 inline-block rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700">Return to GreenMart</Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
