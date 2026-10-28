import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import BackButton from "../../components/common/BackButton.jsx";
import Logo from "../../components/common/Logo.jsx";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import authApi from "../../api/authApi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    await authApi.forgotPassword({ email });
    setDone(true);
    toast.success("Reset link sent");
  };
  return (
    <div className="w-full">
      <BackButton fallback="/login" />
      <div className="flex justify-center mb-2"><Logo /></div>
      <h2 className="text-xl font-heading font-semibold text-center">Forgot Password?</h2>
      <p className="text-sm text-muted text-center mb-4">Enter your email and we'll send you a reset link</p>
      {done ? <p className="text-sm text-center">If an account exists for this email, the password-reset request will be processed.</p> : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full">Send Reset Link</Button>
        </form>
      )}
      <p className="text-sm text-center mt-4"><Link to="/login" className="text-primary">Back to Login</Link></p>
    </div>
  );
}
