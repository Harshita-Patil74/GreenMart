import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import BackButton from "../../components/common/BackButton.jsx";
import Button from "../../components/common/Button.jsx";
import PasswordInput from "../../components/common/PasswordInput.jsx";
import authApi from "../../api/authApi";
import { passwordValidationMessage } from "../../utils/authValidation.js";

export default function ResetPassword() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    const passwordError = passwordValidationMessage(password);
    if (passwordError) { setError(passwordError); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, password });
      toast.success("Password reset");
      navigate("/login", { replace: true });
    } catch (err) {
      setError("Invalid or expired token");
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full">
      <BackButton fallback="/login" />
      <div className="flex justify-center mb-2"><Logo /></div>
      <h2 className="text-xl font-heading font-semibold text-center">Reset Password</h2>
      {error && <div className="text-danger text-sm mb-3 text-center">{error} <Link to="/forgot-password" className="text-primary">Request new link</Link></div>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <PasswordInput label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <PasswordInput label="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Resetting..." : "Reset Password"}</Button>
      </form>
    </div>
  );
}
