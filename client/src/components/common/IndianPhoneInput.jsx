import React from "react";
import { getIndianPhoneDigits } from "../../utils/indianPhone.js";

export default function IndianPhoneInput({ value, onChange, className = "" }) {
  return (
    <div className={`mt-1 flex h-9 overflow-hidden rounded-lg border border-gray-200 focus-within:border-primary ${className}`}>
      <span className="inline-flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">+91</span>
      <input
        aria-label="Phone number"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]{10}"
        maxLength={10}
        required
        value={value}
        onChange={(event) => onChange(getIndianPhoneDigits(event.target.value))}
        placeholder="10-digit mobile number"
        className="h-full min-w-0 flex-1 px-3 text-sm text-gray-900 focus:outline-none"
      />
    </div>
  );
}
