import React from "react";
export default function Rating({ value = 0, count }) {
  return <div className="flex items-center gap-1 text-sm"><span className="text-star">★</span><span>{Number(value).toFixed(1)}</span>{count !== undefined && <span className="text-muted">({count})</span>}</div>;
}
