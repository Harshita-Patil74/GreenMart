import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "../../components/common/BackButton.jsx";
import { Camera, Check } from "lucide-react";
import toast from "react-hot-toast";
import authApi from "../../api/authApi";
import farmerApi from "../../api/farmerApi";
import userApi from "../../api/userApi";
import { updateUser } from "../../features/auth/authSlice.js";
import getImageUrl from "../../utils/imageUrl";
import IndianPhoneInput from "../../components/common/IndianPhoneInput.jsx";
import { formatIndianPhoneNumber, getIndianPhoneDigits, isValidIndianPhoneDigits } from "../../utils/indianPhone.js";
import { formatDate } from "./farmerUtils";

const tabs = ["Personal Information", "Farm Details", "Change Password"];

function Field({ label, value, onChange, type = "text", disabled = false, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-[#65756F]">{label}</span>
      <input type={type} value={value ?? ""} onChange={onChange} disabled={disabled} required={required} className={`h-8 w-full rounded-md border px-2.5 text-xs outline-none focus:border-[#16885A] ${disabled ? "border-[#E8EEEC] bg-[#F7F9F8] text-[#7B8883]" : "border-[#DCE5E1] bg-white text-[#354640]"}`} />
    </label>
  );
}

export default function FarmerProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userId = user?._id || user?.id;
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [farm, setFarm] = useState({ farmName: "", address: "", category: "", description: "", photo: "" });
  const [personal, setPersonal] = useState({ name: user?.name || "", email: user?.email || "", phone: getIndianPhoneDigits(user?.phone), avatar: user?.avatar || "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [farmPhotoFile, setFarmPhotoFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [farmPhotoPreview, setFarmPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);

  useEffect(() => {
    setPersonal({ name: user?.name || "", email: user?.email || "", phone: getIndianPhoneDigits(user?.phone), avatar: user?.avatar || "" });
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(getImageUrl(personal.avatar));
      return undefined;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile, personal.avatar]);

  useEffect(() => {
    if (!farmPhotoFile) {
      setFarmPhotoPreview(getImageUrl(farm.photo));
      return undefined;
    }
    const previewUrl = URL.createObjectURL(farmPhotoFile);
    setFarmPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [farmPhotoFile, farm.photo]);

  const loadProfile = async () => {
    if (!userId) {
      setError("Your signed-in account could not be identified.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [farmResponse, userResponse] = await Promise.all([
        farmerApi.get(userId),
        authApi.me(),
      ]);
      dispatch(updateUser(userResponse.data));
      const data = farmResponse.data;
      if (data) {
        setFarm({
          farmName: data.farmName || "",
          address: data.address || "",
          category: data.category || "",
          description: data.description || "",
          photo: data.photo || "",
        });
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your farm details.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadProfile(); }, [userId]);

  const savePersonal = async (event) => {
    event.preventDefault();
    if (!isValidIndianPhoneDigits(personal.phone)) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }
    setSaving(true);
    try {
      const updates = new FormData();
      updates.append("name", personal.name);
      updates.append("phone", formatIndianPhoneNumber(personal.phone));
      const { data } = await userApi.updateMe(updates);
      dispatch(updateUser(data));
      toast.success("Personal information updated.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't update personal information.");
    } finally {
      setSaving(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    setSavingAvatar(true);
    try {
      const updates = new FormData();
      updates.append("avatar", avatarFile);
      const { data } = await userApi.updateMe(updates);
      dispatch(updateUser(data));
      setPersonal((current) => ({ ...current, avatar: data.avatar || "" }));
      setAvatarFile(null);
      setEditingPhoto(false);
      toast.success("Profile photo updated.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't update your profile photo.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const saveFarm = async (event) => {
    event.preventDefault();
    setSavingFarm(true);
    try {
      const updates = new FormData();
      for (const field of ["farmName", "address", "category", "description"]) updates.append(field, farm[field]);
      if (farmPhotoFile) updates.append("photo", farmPhotoFile);
      const { data } = await farmerApi.updateMe(updates);
      setFarm((current) => ({ ...current, ...data }));
      setFarmPhotoFile(null);
      toast.success("Farm details updated.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't update farm details.");
    } finally {
      setSavingFarm(false);
    }
  };

  return (
    <section className="space-y-4 pb-5 text-[13px] text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[#172A27]">My Profile</h1>
        <p className="mt-1 text-xs text-[#71817D]">Manage your account information and farm details.</p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-[#DFE8E4]">
        {tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-t-md px-3 py-2 text-[11px] font-medium ${activeTab === tab ? "border-b-2 border-[#07814E] bg-white text-[#087449]" : "text-[#778680] hover:bg-white/70"}`}>{tab}</button>)}
      </div>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button type="button" onClick={loadProfile} className="ml-2 font-semibold underline">Try again</button></div>}
      {loading ? <div className="rounded-lg border border-[#E7EEEC] bg-white p-8 text-center text-xs text-[#778681]">Loading profile…</div> : (
        <>
          {activeTab === "Personal Information" && (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(205px,0.9fr)]">
              <form onSubmit={savePersonal} className="space-y-3 rounded-lg border border-[#E7EEEC] bg-white p-4 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
                <h2 className="text-xs font-semibold text-[#344640]">Personal Information</h2>
                <Field label="Full Name" value={personal.name} onChange={(event) => setPersonal({ ...personal, name: event.target.value })} required />
                <Field label="Email Address" value={personal.email} disabled type="email" />
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-[#65756F]">Phone Number</span>
                  <IndianPhoneInput value={personal.phone} onChange={(phone) => setPersonal({ ...personal, phone })} className="h-8 rounded-md border-[#DCE5E1]" />
                </label>
                <Field label="Role" value="Farmer" disabled />
                <button type="submit" disabled={saving} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#07814E] text-xs font-semibold text-white hover:bg-[#066B42] disabled:opacity-60">
                  <Check size={14} /> {saving ? "Saving…" : "Update Profile"}
                </button>
              </form>

              <aside className="space-y-3">
                <div className="rounded-lg border border-[#E7EEEC] bg-white p-4 text-center shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
                  <h2 className="text-left text-xs font-semibold text-[#344640]">Profile Picture</h2>
                  <img src={avatarPreview} alt="Profile" className="mx-auto mt-3 h-[76px] w-[76px] rounded-full border-2 border-[#DDEDE5] object-cover" />
                  {editingPhoto ? (
                    <div className="mt-3 space-y-2 text-left">
                      <label className="block text-left">
                        <span className="mb-1 block text-[10px] font-medium text-[#65756F]">Profile photo</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} className="w-full rounded-md border border-[#DCE5E1] px-2 py-1.5 text-xs" />
                      </label>
                      {avatarFile && <button type="button" onClick={saveAvatar} disabled={savingAvatar} className="flex h-8 w-full items-center justify-center rounded-md bg-[#07814E] text-xs font-semibold text-white hover:bg-[#066B42] disabled:opacity-60">{savingAvatar ? "Saving photo…" : "Save profile photo"}</button>}
                      <button type="button" onClick={() => { setAvatarFile(null); setEditingPhoto(false); }} className="text-[10px] font-medium text-[#087449]">Cancel</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setEditingPhoto(true)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2.5 py-1 text-[10px] font-semibold text-[#087449]"><Camera size={12} /> Change Photo</button>
                  )}
                </div>
                <div className="space-y-3 rounded-lg border border-[#E7EEEC] bg-white p-4 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
                  <p className="text-[10px] text-[#7B8883]">Member Since</p>
                  <p className="text-xs font-medium text-[#394A45]">{formatDate(user?.createdAt)}</p>
                  <div className="border-t border-[#EDF1F0] pt-3">
                    <p className="text-[10px] text-[#7B8883]">Account Status</p>
                    <span className="mt-1 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-700">{user?.status || "Active"}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {activeTab === "Farm Details" && (
            <form onSubmit={saveFarm} className="max-w-2xl space-y-3 rounded-lg border border-[#E7EEEC] bg-white p-4 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
              <h2 className="text-xs font-semibold text-[#344640]">Farm Details</h2>
              <Field label="Farm Name" value={farm.farmName} onChange={(event) => setFarm({ ...farm, farmName: event.target.value })} required />
              <Field label="Farm Address" value={farm.address} onChange={(event) => setFarm({ ...farm, address: event.target.value })} />
              <Field label="Farm Category" value={farm.category} onChange={(event) => setFarm({ ...farm, category: event.target.value })} />
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-[#65756F]">About your farm</span>
                <textarea value={farm.description} onChange={(event) => setFarm({ ...farm, description: event.target.value })} rows={4} className="w-full resize-y rounded-md border border-[#DCE5E1] p-2.5 text-xs outline-none focus:border-[#16885A]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-[#65756F]">Farm Photo</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFarmPhotoFile(event.target.files?.[0] || null)} className="w-full rounded-md border border-[#DCE5E1] px-2 py-1.5 text-xs" />
                {farm.photo && <img src={farmPhotoPreview} alt="Farm" className="mt-2 h-24 w-36 rounded-md border border-[#DDEDE5] object-cover" />}
              </label>
              <button type="submit" disabled={savingFarm} className="h-8 w-full rounded-md bg-[#07814E] text-xs font-semibold text-white hover:bg-[#066B42] disabled:opacity-60">{savingFarm ? "Saving…" : "Save Farm Details"}</button>
            </form>
          )}

          {activeTab === "Change Password" && (
            <div className="max-w-xl rounded-lg border border-[#E7EEEC] bg-white p-5 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
              <h2 className="text-xs font-semibold text-[#344640]">Change Password</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#71817D]">For account security, password changes are completed through the existing email verification and password reset process.</p>
              <Link to="/forgot-password" className="mt-4 inline-flex h-8 items-center rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42]">Send password reset email</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
