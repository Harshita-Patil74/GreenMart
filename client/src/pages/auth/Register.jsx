import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import BackButton from "../../components/common/BackButton.jsx";
import Logo from "../../components/common/Logo.jsx";
import { register } from "../../features/auth/authSlice.js";
import { dashboardPathForRole } from "../../utils/roleAccess.js";
import {
  isRegistrationEmailValid,
  normalizeEmail,
  passwordRequirements,
  passwordValidationMessage,
} from "../../utils/authValidation.js";

const roles = ["Customer", "Farmer"];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(() => searchParams.get("role") === "farmer" ? "Farmer" : "Customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [validationError, setValidationError] = useState("");
  const requirements = passwordRequirements(password);
  const emailIsValid = isRegistrationEmailValid(email);
  const passwordIsValid = requirements.every(({ valid }) => valid);
  const formIsValid = name.trim().length > 0
    && emailIsValid
    && passwordIsValid
    && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRegistrationEmailValid(email)) {
      setEmailTouched(true);
      setValidationError("Enter a valid lowercase email address.");
      return;
    }
    const normalizedEmail = normalizeEmail(email);
    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    setValidationError("");
    setLoading(true);
    try {
      const response = await dispatch(register({ name, email: normalizedEmail, password, role: role.toLowerCase() })).unwrap();
      toast.success("Account created successfully!");
      navigate(dashboardPathForRole(response.user?.role), { replace: true });
    } catch (error) {
      setValidationError(error?.response?.data?.message || error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[420px] max-w-full bg-white rounded-[16px] p-8 shadow-card-lg">
      <BackButton fallback="/login" />
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex justify-center mb-6"
      >
        <Logo subtitle={true} size="md" />
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="space-y-1"
      >
        <h1 className="text-[22px] font-semibold text-center text-text">Create Your Account</h1>
        <p className="text-[13px] text-muted text-center mt-1">Join GreenMart and be a part of the organic movement</p>
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex border border-border rounded-lg h-10 mt-5 overflow-hidden"
      >
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 text-sm font-medium transition ${role === r ? "bg-primary text-white" : "bg-white text-text"}`}
          >
            {r}
          </button>
        ))}
      </motion.div>
      <motion.form
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit}
        className="space-y-4 mt-5"
      >
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required className="w-full h-11 px-3.5 text-sm bg-gray-50 border border-border rounded-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Email Address</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); setValidationError(""); }} onBlur={() => setEmailTouched(true)} placeholder="name@gmail.com" autoComplete="username" required aria-invalid={emailTouched && !emailIsValid} aria-describedby={emailTouched && !emailIsValid ? "registration-email-error" : undefined} className="w-full h-11 px-3.5 text-sm bg-gray-50 border border-border rounded-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition" />
          {emailTouched && !emailIsValid && <p id="registration-email-error" className="mt-1 text-xs text-red-600">Use lowercase letters, numbers, and single dots before a valid domain (for example, name@gmail.com).</p>}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setValidationError(""); }} placeholder="Create a strong password" autoComplete="new-password" aria-describedby="password-requirements" required className="w-full h-11 pl-3.5 pr-10 text-sm bg-gray-50 border border-border rounded-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ul id="password-requirements" className="mt-2 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
            {requirements.map(({ label, valid }) => (
              <li key={label} className={valid ? "text-[#16804A]" : password ? "text-red-600" : "text-muted"}>
                <span aria-hidden="true">{valid ? "✓" : password ? "×" : "•"}</span> {label}
              </li>
            ))}
          </ul>
        </div>
        {validationError && <p role="alert" className="text-xs text-red-600">{validationError}</p>}
        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(""); }} placeholder="Confirm your password" required aria-invalid={Boolean(confirmPassword) && password !== confirmPassword} className="w-full h-11 px-3.5 text-sm bg-gray-50 border border-border rounded-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition" />
          {confirmPassword && password !== confirmPassword && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}
        </div>
        <button type="submit" disabled={loading || !formIsValid} className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-btn shadow-btn transition disabled:cursor-not-allowed disabled:opacity-60 mt-3">
          {loading ? "Registering..." : "Register"}
        </button>
      </motion.form>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="text-xs text-center text-muted mt-5"
      >
        Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link>
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="text-xs text-center text-muted mt-3"
      >
        Administrator? <Link to="/login" className="font-semibold text-primary hover:underline">Admin Login</Link>
      </motion.div>
    </div>
  );
}