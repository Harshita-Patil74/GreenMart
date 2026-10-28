import React from "react";
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <p className="text-sm text-danger mb-3">{message || "Something went wrong."}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 h-9 rounded-btn bg-primary text-white text-sm font-medium">
          Retry
        </button>
      )}
    </div>
  );
}