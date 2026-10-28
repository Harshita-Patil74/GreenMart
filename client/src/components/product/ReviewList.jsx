import { useState } from "react";
import Rating from "../common/Rating.jsx";
export default function ReviewList({ reviews }) {
  if (!reviews || !reviews.length) return <div className="text-muted text-sm">No reviews yet.</div>;
  return <div className="flex flex-col gap-3">{reviews.map((r) => (
    <div key={r._id} className="border-b border-border pb-3">
      <div className="flex items-center gap-2"><span className="font-medium text-sm">{r.user?.name || "Customer"}</span><Rating value={r.rating} /></div>
      <p className="text-sm text-muted mt-1">{r.comment}</p>
    </div>
  ))}</div>;
}
export function ReviewForm({ onSubmit, submitting }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ rating, comment }); }} className="flex flex-col gap-2 mt-4">
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="h-9 border border-border rounded-btn px-2" disabled={submitting}>
        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} stars</option>)}
      </select>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="border border-border rounded-btn p-2" placeholder="Write a review..." disabled={submitting} />
      <button className="h-9 bg-primary text-white rounded-btn" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
