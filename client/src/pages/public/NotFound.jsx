import React from "react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2 className="text-3xl font-heading mb-2">404</h2>
      <p className="text-muted mb-4">Page not found</p>
      <Link to="/" className="text-primary">Go Home</Link>
    </div>
  );
}
