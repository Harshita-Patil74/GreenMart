import React from "react";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

function getIdentifier(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._id && value._id !== value) return getIdentifier(value._id);
  if (value.id) return getIdentifier(value.id);
  if (value.productId) return getIdentifier(value.productId);
  return "";
}

export default function ProductIdentifier({ productId, className = "", compact = false }) {
  const identifier = getIdentifier(productId);
  if (!identifier) return null;
  const displayId = compact && identifier.length > 12
    ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}`
    : identifier;
  const copyProductId = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(identifier);
      toast.success("Product ID copied.");
    } catch {
      toast.error("Couldn't copy the Product ID.");
    }
  };

  return (
    <span className={`inline-flex max-w-full items-center gap-1 text-[10px] text-gray-500 ${className}`}>
      <span className={compact ? "font-mono" : "break-all"} title={identifier}>Product ID: {displayId}</span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          copyProductId();
        }}
        aria-label="Copy Product ID"
        title="Copy Product ID"
        className="shrink-0 rounded p-0.5 text-gray-500 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Copy aria-hidden="true" className="h-3 w-3" />
      </button>
    </span>
  );
}
