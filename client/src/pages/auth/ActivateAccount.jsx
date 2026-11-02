import React, { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import BackButton from "../../components/common/BackButton.jsx";
import Button from "../../components/common/Button.jsx";
import Logo from "../../components/common/Logo.jsx";
import PasswordInput from "../../components/common/PasswordInput.jsx";
import authApi from "../../api/authApi.js";
import { passwordRequirements } from "../../utils/authValidation.js";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const requirements = passwordRequirements(password);
  const isValid = requirements.every(({ valid }) => valid) && password === confirmPassword;

  const submit = async (event) => {
    event.preventDefault();
    if (!token || !email) {
      setError("This activation link is invalid or incomplete.");
      return;
    }
    if (!isValid) {
      setError(password !== confirmPassword ? "Passwords do not match." : "Choose a password that meets all the requirements.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await authApi.activateAccount({ email, token, password });
      toast.success(data.message);
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError?.message || "This activation link is invalid or expired.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <BackButton fallback="/login" />
      <div className="mb-2 flex justify-center"><Logo /></div>
      <h2 className="text-center text-xl font-heading font-semibold">Activate Farmer Account</h2>
      <p className="mb-4 text-center text-sm text-muted">Create a secure password for {email || "your account"}.</p>
      {error && <div role="alert" className="mb-3 text-center text-sm text-danger">{error}</div>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <PasswordInput label="Create Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <ul aria-label="Password requirements" className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
          {requirements.map(({ label, valid }) => (
            <li key={label} className={valid ? "text-emerald-700" : password ? "text-red-600" : "text-gray-500"}>
              {valid ? "✓" : password ? "×" : "•"} {label}
            </li>
          ))}
        </ul>
        <PasswordInput label="Confirm Password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <Button type="submit" disabled={saving || !isValid} className="w-full">{saving ? "Activating..." : "Activate Account"}</Button>
      </form>
      <p className="mt-4 text-center text-sm"><Link to="/forgot-password" className="text-primary">Forgot password?</Link></p>
    </div>
  );
}
