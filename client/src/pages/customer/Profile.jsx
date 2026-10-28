import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import BackButton from "../../components/common/BackButton.jsx";
import { ShieldCheck, UserRound, MapPin, KeyRound } from "lucide-react";
import authApi from "../../api/authApi";
import userApi from "../../api/userApi";
import { updateUser } from "../../features/auth/authSlice.js";
import SavedAddresses from "./SavedAddresses.jsx";
import IndianPhoneInput from "../../components/common/IndianPhoneInput.jsx";
import { formatIndianPhoneNumber, getIndianPhoneDigits, isValidIndianPhoneDigits } from "../../utils/indianPhone.js";
import getImageUrl from "../../utils/imageUrl";

const tabs = [
  { id: "personal", label: "Personal Information", icon: UserRound },
  { id: "addresses", label: "Saved Addresses", icon: MapPin },
  { id: "password", label: "Change Password", icon: KeyRound },
];

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [tab, setTab] = useState("personal");
  const [form, setForm] = useState({ name: "", email: "", phone: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.me();
      dispatch(updateUser(data));
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: getIndianPhoneDigits(data.phone),
        avatar: data.avatar || "",
      });
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load your profile.");
      setForm({
        name: user?.name || "",
        email: user?.email || "",
        phone: getIndianPhoneDigits(user?.phone),
        avatar: user?.avatar || "",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(getImageUrl(form.avatar));
      return undefined;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile, form.avatar]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!isValidIndianPhoneDigits(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updates = new FormData();
      updates.append("name", form.name);
      updates.append("phone", formatIndianPhoneNumber(form.phone));
      if (avatarFile) updates.append("avatar", avatarFile);
      const { data } = await userApi.updateMe(updates);
      dispatch(updateUser(data));
      setForm((current) => ({ ...current, avatar: data.avatar || "" }));
      setAvatarFile(null);
      toast.success("Profile updated.");
    } catch (requestError) {
      setError(requestError?.message || "Couldn't update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!form.email) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email: form.email });
      setResetSent(true);
      toast.success("If your account exists, the password-reset request will be processed.");
    } catch (requestError) {
      setError(requestError?.message || "Couldn't request a password reset.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <BackButton fallback="/customer/dashboard" />
      <div>
        <h1 className="text-xl font-heading font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-xs text-gray-500">Manage your account information and delivery addresses.</p>
      </div>

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-emerald-100 bg-emerald-50">
          {form.avatar ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><UserRound className="h-6 w-6 text-primary" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-gray-900">{form.name || user?.name || "Customer"}</h2>
          <p className="text-xs capitalize text-gray-500">{user?.role || "Customer"} account</p>
        </div>
        {user?.status && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700">{user.status}</span>}
        {user?.createdAt && <span className="text-[10px] text-gray-500">Member since {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>}
      </section>

      <nav aria-label="Profile sections" className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${tab === id ? "bg-emerald-50 text-primary" : "text-gray-500 hover:bg-gray-50"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button onClick={loadProfile} className="ml-1 font-semibold underline">Retry</button></p>}

      {tab === "personal" && (
        <form onSubmit={saveProfile} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
          {loading ? <p className="mt-4 text-xs text-gray-500">Loading profile...</p> : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-gray-600">Full name
                  <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-primary focus:outline-none" />
                </label>
                <label className="text-xs font-medium text-gray-600">Email address
                  <input type="email" readOnly value={form.email} className="mt-1 h-9 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500" />
                </label>
                <label className="text-xs font-medium text-gray-600">Phone number
                  <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                </label>
                <label className="text-xs font-medium text-gray-600">Profile photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:border-primary focus:outline-none" />
                </label>
                <label className="text-xs font-medium text-gray-600">Account role
                  <div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm capitalize text-gray-600"><ShieldCheck className="h-4 w-4 text-primary" />{user?.role || "customer"}</div>
                </label>
              </div>
              <button disabled={saving || loading} className="mt-4 h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
            </>
          )}
        </form>
      )}

      {tab === "addresses" && <SavedAddresses embedded />}

      {tab === "password" && (
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-gray-500">For account security, we’ll email a password-reset link to your registered address. The link expires after one hour.</p>
          {resetSent ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">If an account exists for this email, the password-reset request will be processed.</p>
          ) : (
            <button onClick={sendPasswordReset} disabled={saving || !form.email} className="mt-4 h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60">{saving ? "Sending..." : "Send Password Reset Link"}</button>
          )}
        </section>
      )}
    </div>
  );
}
