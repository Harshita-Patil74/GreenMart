import React from "react";

export default function Pagination({
  page,
  pageSize,
  totalRecords,
  recordLabel = "item",
  onChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);
  const recordsLabel = totalRecords === 1 ? recordLabel : `${recordLabel}s`;

  const pageNumbers = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(1)}
          disabled={!hasPrev}
          className="px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F0F5EE]"
        >
          First
        </button>
        <button
          onClick={() => onChange(currentPage - 1)}
          disabled={!hasPrev}
          className="px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F0F5EE]"
        >
          Previous
        </button>
      </div>

      <div className="flex items-center gap-1">
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-9 min-w-[34px] rounded-lg text-xs font-semibold border transition-colors ${currentPage === p ? "bg-[#245C3A] text-white border-[#245C3A]" : "bg-white text-gray-600 border-gray-200 hover:bg-[#F0F5EE] hover:text-[#245C3A]"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(currentPage + 1)}
          disabled={!hasNext}
          className="px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F0F5EE]"
        >
          Next
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={!hasNext}
          className="px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F0F5EE]"
        >
          Last
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>Showing {startRecord}–{endRecord} of {totalRecords} {recordsLabel}</span>
        <select
          value={pageSize}
          onChange={(e) => onChange(1, parseInt(e.target.value, 10))}
          className="h-9 w-24 rounded-lg border border-gray-200 px-2 text-xs bg-[#FAF8F1] focus:outline-none focus:border-[#245C3A]"
          aria-label="Page size"
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
