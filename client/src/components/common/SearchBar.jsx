import React, { useEffect, useRef, useCallback, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Reusable debounced search bar with clear button.
 *
 * @param {Object} props
 * @param {string} props.value - Controlled search value
 * @param {Function} props.onChange - Called with debounced search value
 * @param {string} props.placeholder - Input placeholder text
 * @param {string} props.ariaLabel - ARIA label for the input
 * @param {number} props.debounceMs - Debounce delay in ms (default 300)
 * @param {boolean} props.showClear - Show clear (X) button when value present
 * @param {string} props.className - Additional className for wrapper
 */
export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Search...",
  ariaLabel = "Search",
  debounceMs = 300,
  showClear = true,
  className = "",
}) {
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleChange = useCallback(
    (event) => {
      const val = event.target.value;
      setDraftValue(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(val);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (inputRef.current) inputRef.current.value = "";
    setDraftValue("");
    inputRef.current?.focus();
    onChange("");
  };

  return (
    <div className={`relative min-w-[180px] flex-1 ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={draftValue}
        onChange={handleChange}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`h-9 w-full appearance-none rounded-lg border pl-9 ${showClear ? "pr-9" : "pr-3"} text-xs focus:border-primary focus:outline-none`}
      />
      {showClear && draftValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
