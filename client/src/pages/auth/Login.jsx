import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import Logo from "../../components/common/Logo.jsx";
import { login, logout } from "../../features/auth/authSlice.js";
import { dashboardPathForRole } from "../../utils/roleAccess.js";
import {
  isLegacyDemoEmail,
  isLoginEmailValid,
  normalizeEmail,
  passwordValidationMessage,
} from "../../utils/authValidation.js";

export default function Login({ initialRole = "customer" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [selectedRole, setSelectedRole] = useState(() => (
    initialRole !== "customer" ? initialRole : searchParams.get("role") === "farmer" ? "farmer" : "customer"
  ));
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    if (!isLoginEmailValid(normalizedEmail)) {
      setValidationError("Enter a valid lowercase email address.");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    if (!isLegacyDemoEmail(normalizedEmail) && passwordValidationMessage(password)) {
      setValidationError(passwordValidationMessage(password));
      return;
    }
    setValidationError("");
    setLoading(true);
    try {
      const res = await dispatch(login({ email: normalizedEmail, password, remember })).unwrap();
      if (res.user?.role !== selectedRole) {
        dispatch(logout());
        setValidationError(`These credentials are not authorized for ${selectedRole} login.`);
        return;
      }
      toast.success("Welcome back!");
      navigate(res.user?.role === "customer" ? "/" : dashboardPathForRole(res.user?.role), { replace: true });
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || "Invalid email or password.";
      setValidationError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[400px] max-w-full bg-white rounded-[18px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
      <div className="flex justify-center mb-5">
        <Logo subtitle={true} size="md" />
      </div>
      <h1 className="text-[22px] font-heading font-semibold text-center text-[#1F2937]">Welcome Back</h1>
      <p className="text-[13px] text-muted text-center mt-1">Login to your account to continue</p>
      <div role="group" aria-label="Choose account type" className="mt-5 flex h-10 overflow-hidden rounded-lg border border-border">
        {[
          ["customer", "Customer Login"],
          ["farmer", "Farmer Login"],
          ["admin", "Admin Login"],
        ].map(([role, label]) => (
          <button
            key={role}
            type="button"
            aria-pressed={selectedRole === role}
            onClick={() => { setSelectedRole(role); setValidationError(""); }}
            className={`flex-1 px-1 text-[11px] font-medium transition sm:text-xs ${selectedRole === role ? "bg-primary text-white" : "bg-white text-text hover:bg-emerald-50"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Email Address</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setValidationError(""); }} onBlur={() => setEmail(normalizeEmail(email))} placeholder="Enter your email" autoComplete="username" required className="gm-input" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="gm-input pr-10"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {validationError && <p role="alert" className="text-xs text-red-600">{validationError}</p>}
        </div>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-text-light cursor-pointer">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-[8px] shadow-btn disabled:opacity-60">
          {loading ? "Logging in..." : selectedRole === "admin" ? "Admin Login" : selectedRole === "farmer" ? "Farmer Login" : "Login"}
        </button>
      </form>

      <p className="text-xs text-center text-muted mt-5">
        Don't have an account? <Link to="/register" className="font-semibold text-primary hover:underline">Register</Link>
      </p>
      {selectedRole !== "admin" && (
        <p className="text-xs text-center text-muted mt-3">
          Administrator? <Link to="/admin/login" className="font-semibold text-primary hover:underline">Admin Login</Link>
        </p>
      )}
    </div>
  );
}
