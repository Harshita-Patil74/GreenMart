import React, { useEffect, useState } from "react";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const load = () => { setError(null); notificationApi.list().then((r) => setItems(r.data || [])).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, []);
  if (error) return <ErrorState message={error} onRetry={load} />;
  return <div className="flex flex-col gap-2"><BackButton fallback="/" />{items.map((n) => <div key={n._id} className="bg-card border border-border rounded-card p-3">{n.title}: {n.message}</div>)}</div>;
}