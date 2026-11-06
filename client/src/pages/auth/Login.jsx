import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import Logo from "../../components/common/Logo.jsx";
import { login, logout } from "../../features/auth/authSlice.js";
import { dashboardPathForRole } from "../../utils/roleAccess.js";
import {
  isLegacyDemoEmail,
  isLoginEmailValid,
  normalizeEmail,
  passwordValidationMessage,
} from "../../utils/authValidation.js";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoginEmailValid(email)) {
      setValidationError("Enter a valid lowercase email address.");
      return;
    }
    const normalizedEmail = normalizeEmail(email);
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    const passwordError = passwordValidationMessage(password);
    if (/\s/.test(password) || (!isLegacyDemoEmail(normalizedEmail) && passwordError)) {
      setValidationError(/\s/.test(password) ? "Password must not contain spaces." : passwordError);
      return;
    }
    setValidationError("");
    setLoading(true);
    try {
      const res = await dispatch(login({ email: normalizedEmail, password, remember })).unwrap();
      const destination = dashboardPathForRole(res.user?.role);
      if (destination === "/login") {
        dispatch(logout());
        setValidationError("This account type cannot sign in.");
        return;
      }
      toast.success("Welcome back!");
      navigate(destination, { replace: true });
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
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex justify-center mb-5"
      >
        <Logo subtitle={true} size="md" />
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="space-y-1"
      >
        <h1 className="text-[22px] font-heading font-semibold text-center text-[#1F2937]">Welcome Back</h1>
        <p className="text-[13px] text-muted text-center mt-1">Login to your account to continue</p>
      </motion.div>
      <motion.form
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Email Address</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setValidationError(""); }} placeholder="Enter your email" autoComplete="username" required className="gm-input" />
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
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </motion.form>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="text-xs text-center text-muted mt-5"
      >
        Don't have an account? <Link to="/register" className="font-semibold text-primary hover:underline">Register</Link>
      </motion.div>
    </div>
  );
}
