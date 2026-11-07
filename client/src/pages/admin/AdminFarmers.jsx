import React, { useEffect, useMemo, useState } from "react";
import adminApi from "../../api/adminApi";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import toast from "react-hot-toast";
import { isRegistrationEmailValid, normalizeEmail } from "../../utils/authValidation.js";
import Pagination from "../../components/common/Pagination.jsx";

export default function AdminFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [tab, setTab] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", farmName: "", farmAddress: "", farmCategory: "", about: "", certificationName: "", certificateNumber: "" });
  const [certFile, setCertFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const isCreateFarmerFormValid = form.name.trim().length > 0 && isRegistrationEmailValid(form.email);
  const [activationLink, setActivationLink] = useState("");
  const [viewFarmer, setViewFarmer] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.farmers({ page, limit: pageSize, search });
      setFarmers(Array.isArray(data?.items) ? data.items : data);
      setTotal(data?.total || 0);
    } catch (e) {
      setError(e?.message || "Couldn't load farmer profiles.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [page, pageSize, search]);

  const createFarmer = async (e) => {
    e.preventDefault();
    if (!isCreateFarmerFormValid) {
      toast.error("Enter a name and a valid lowercase email address.");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (certFile) fd.append("certificate", certFile);
      if (photoFile) fd.append("farmPhoto", photoFile);
      const { data } = await adminApi.createFarmer(fd);
      setActivationLink(data?.activationLink || "");
      toast.success(data?.message || "Farmer created. Activation instructions were sent by email.");
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", farmName: "", farmAddress: "", farmCategory: "", about: "", certificationName: "", certificateNumber: "" });
      setCertFile(null);
      setPhotoFile(null);
      await load();
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Failed to create farmer.");
    } finally {
      setCreating(false);
    }
  };

  const isRejected = (f) => Boolean(f.certification?.rejectedByAdmin);
  const isVerified = (f) => Boolean(f.certification?.verifiedByAdmin);
  const isResubmitted = (f) => f.verificationStatus === "Pending" && Array.isArray(f.verificationHistory) && f.verificationHistory.length > 0 && f.verificationHistory[f.verificationHistory.length - 1].action === "Resubmitted";

  const filtered=useMemo(()=>farmers.filter(f=>tab==="All"||(tab==="Pending"?(!isVerified(f)&&!isRejected(f)):(tab==="Verified"?isVerified(f):isRejected(f)))),[farmers,tab]);

  const verify = async (farmer) => {
    const id = farmer.user?._id || farmer.user;
    if (!id) return;
    setSaving(String(id));
    setError(null);
    try {
      const { data } = await adminApi.verifyFarmer(id);
      setFarmers((list) => list.map((item) => String(item.user?._id || item.user) === String(id) ? { ...item, ...data } : item));
    } catch (e) {
      setError(e?.message || "Couldn't verify this farmer.");
    } finally {
      setSaving("");
    }
  };

  const reject = async (farmer) => {
    const id = farmer.user?._id || farmer.user;
    if (!id) return;
    if (!window.confirm("Reject this farmer application?")) return;
    const reason = window.prompt("Rejection reason (optional):") || "";
    setSaving(String(id));
    setError(null);
    try {
      const { data } = await adminApi.rejectFarmer(id, reason);
      setFarmers((list) => list.map((item) => String(item.user?._id || item.user) === String(id) ? { ...item, ...data } : item));
    } catch (e) {
      setError(e?.message || "Couldn't reject this farmer.");
    } finally {
      setSaving("");
    }
  };

  const requestChanges = async (farmer) => {
    const id = farmer.user?._id || farmer.user;
    if (!id) return;
    const instructions = window.prompt("Correction instructions (required):");
    if (!instructions || !instructions.trim()) return;
    setSaving(String(id));
    setError(null);
    try {
      const { data } = await adminApi.requestFarmerChanges(id, instructions.trim());
      setFarmers((list) => list.map((item) => String(item.user?._id || item.user) === String(id) ? { ...item, ...data } : item));
      toast.success("Changes requested.");
    } catch (e) {
      setError(e?.message || "Couldn't request changes.");
    } finally {
      setSaving("");
    }
  };

  const resendActivation = async (farmer) => {
    const id = farmer.user?._id || farmer.user;
    if (!id) return;
    setSaving(String(id));
    setError(null);
    try {
      const { data } = await adminApi.resendFarmerActivation(id);
      setActivationLink(data?.activationLink || "");
      toast.success(data?.message || "Activation link sent.");
    } catch (e) {
      setError(e?.message || "Couldn't resend the activation link.");
    } finally {
      setSaving("");
    }
  };

  if (error && !farmers.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4 pb-10">
      <BackButton fallback="/admin/dashboard" />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">Farmer Verification</h1>
          <p className="mt-1 text-xs text-gray-500">Review farmer profiles and verify submitted certifications.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Add Farmer</button>
      </header>
      {activationLink && (
        <aside role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Development-only activation link</p>
          <p className="mt-1">Share this link with the farmer so they can set their own password. It expires in 24 hours and can be used once.</p>
          <a className="mt-2 inline-block break-all font-medium underline" href={activationLink}>{activationLink}</a>
        </aside>
      )}
      {showForm && (
        <form onSubmit={createFarmer} className="space-y-2 rounded-xl border bg-white p-4">
          <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded border px-3 py-2 text-xs" />
          <div>
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required aria-invalid={Boolean(form.email) && !isRegistrationEmailValid(form.email)} className="w-full rounded border px-3 py-2 text-xs" />
            {Boolean(form.email) && !isRegistrationEmailValid(form.email) && <p className="mt-1 text-xs text-red-600">Enter a valid lowercase email address.</p>}
          </div>
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <input placeholder="Farm Name" value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <input placeholder="Farm Address" value={form.farmAddress} onChange={(e) => setForm({ ...form, farmAddress: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <input placeholder="Farm Category" value={form.farmCategory} onChange={(e) => setForm({ ...form, farmCategory: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <textarea placeholder="About Your Farm" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <input placeholder="Certification Name (e.g. Organic Farming Certificate)" value={form.certificationName} onChange={(e) => setForm({ ...form, certificationName: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <input placeholder="Certificate Number (e.g. OFC2026KA5724)" value={form.certificateNumber} onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })} className="w-full rounded border px-3 py-2 text-xs" />
          <label className="block text-xs text-gray-600">Farmer Certificate<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded border px-3 py-2 text-xs" />{certFile && <span className="text-[10px] text-gray-500">{certFile.name}</span>}</label>
          <label className="block text-xs text-gray-600">Farm Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded border px-3 py-2 text-xs" />{photoFile && <span className="text-[10px] text-gray-500">{photoFile.name}</span>}</label>
          <div className="flex gap-2"><button disabled={creating || !isCreateFarmerFormValid} type="submit" className="rounded bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creating..." : "Create"}</button><button type="button" onClick={() => setShowForm(false)} className="rounded border px-3 py-2 text-xs">Cancel</button></div>
        </form>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">{["Pending", "Verified", "Rejected", "All"].map((item) => (
        <button key={item} onClick={() => { setTab(item); setPage(1); }} className={`rounded-lg px-3 py-2 text-xs ${tab === item ? "bg-primary text-white" : "border bg-white text-gray-600"}`}>{item} ({item === "Pending" ? farmers.filter((f) => !isVerified(f) && !isRejected(f)).length : item === "Verified" ? farmers.filter((f) => isVerified(f)).length : item === "Rejected" ? farmers.filter((f) => isRejected(f)).length : farmers.length})</button>
      ))}</div>
      <div className="flex items-center gap-2 mb-3">
        <input placeholder="Search farmers" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 flex-1 rounded-[8px] border px-2 text-xs bg-[#FAF8F1] border-[#E2E6DF]" />
      </div>
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <th className="px-3 py-3">Farmer</th>
                <th className="px-3 py-3">Farm Name</th>
                <th className="px-3 py-3">Certification</th>
                <th className="px-3 py-3">Submitted</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading farmer profiles...</td></tr> : filtered.map((f) => {
                const decisionRecorded = isVerified(f) || isRejected(f);
                const certificationName = f.certificateName || f.certification?.body;
                const certificationNumber = f.certificateNumber || f.certification?.number;
                const userId = String(f.user?._id || f.user);
                return (
                  <tr key={f._id}>
                    <td className="px-3 py-3 font-medium">{f.user?.name || "Farmer"}<div className="text-[10px] text-gray-400">{f.user?.email || ""}</div></td>
                    <td className="px-3 py-3">{f.farmName}</td>
                    <td className="px-3 py-3">{certificationName ? (<><div className="font-medium">{certificationName}</div>{certificationNumber && <div className="text-[10px] text-gray-400">{certificationNumber}</div>}</>) : "Not provided"}</td>
                    <td className="px-3 py-3 text-gray-500">{f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-US") : "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] ${isVerified(f) ? "bg-emerald-50 text-emerald-700" : isRejected(f) ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{isResubmitted(f) ? "Resubmitted" : isVerified(f) ? "Verified" : isRejected(f) ? "Rejected" : "Pending"}</span>{f.user?.accountActivated === false && <div className="mt-1 text-[10px] text-gray-500">Account: activation pending</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setViewFarmer(f)} className="rounded border px-3 py-1.5 text-[10px] font-semibold text-gray-700">View Details</button>
                        {!decisionRecorded && (
                          <>
                            <button disabled={saving === userId} onClick={() => verify(f)} className="rounded bg-primary px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">{saving === userId ? "Saving..." : "Verify"}</button>
                            <button disabled={saving === userId} onClick={() => reject(f)} className="rounded bg-red-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">Reject</button>
                            <button disabled={saving === userId} onClick={() => requestChanges(f)} className="rounded bg-[#F59E0B] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">Request Changes</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !filtered.length && <tr><td colSpan="6" className="p-8 text-center text-gray-500">No farmer profiles in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {!loading && total > 0 && (
        <Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(p, ps) => { setPage(p); if (ps) setPageSize(ps); }} />
      )}
    </div>
  );
}
