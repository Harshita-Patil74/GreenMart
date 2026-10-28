import React from "react";
import BackButton from "../../components/common/BackButton.jsx";
export default function Settings() { return <div className="p-6"><BackButton fallback="/customer/dashboard" /><h1 className="text-2xl font-heading">Settings</h1><p className="text-muted">Notification preferences and account info.</p></div>; }
