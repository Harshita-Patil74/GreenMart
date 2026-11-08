import React, { useCallback, useEffect, useState } from "react";
import { MapPin, Phone, Plus, Trash2, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import toast from "react-hot-toast";
import { showDeleteConfirm } from "../../utils/alertUtils";
import addressApi from "../../api/addressApi";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";

const emptyAddress = { name: "", line1: "", city: "", phone: "" };

export default function SavedAddresses({ embedded = false }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddress);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await addressApi.list();
      setAddresses(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load saved addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = (address) => {
    setEditingId(address?._id || null);
    setForm(address ? {
      name: address.name || "",
      line1: address.line1 || "",
      city: address.city || "",
      phone: address.phone || "",
    } : emptyAddress);
    setFormOpen(true);
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.line1.trim() || !form.city.trim() || !form.phone.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!/^\+?[\d\s-]{7,}$/.test(form.phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) await addressApi.update(editingId, form);
      else await addressApi.create(form);
      toast.success(editingId ? "Address updated." : "Address saved.");
      setFormOpen(false);
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(requestError?.message || "Couldn't save this address.");
    } finally {
      setSaving(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);

  const remove = async (id) => {
    const result = await showDeleteConfirm("this address");
    if (!result.isConfirmed) return;
    setDeletingId(id);
    try {
      await addressApi.remove(id);
      setAddresses((current) => current.filter((address) => address._id !== id));
      toast.success("Address removed.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Couldn't remove this address.");
    } finally {
      setDeletingId(null);
    }
  };

  const setDefault = async (id) => {
    try {
      await addressApi.setDefault(id);
      toast.success("Default address updated.");
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Couldn't update default address.");
    }
  };
  if (error && addresses.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-4xl space-y-5 pb-12"}>
      {!embedded && (
        <>
          <BackButton fallback="/customer/profile" />
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-between gap-3"
          >
          <div>
            <h1 className="text-xl font-heading font-bold text-gray-900">Saved Addresses</h1>
            <p className="mt-1 text-xs text-gray-500">Manage your delivery locations.</p>
          </div>
          <button onClick={() => openForm()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover">
            <Plus className="h-4 w-4" /> Add Address
          </button>
        </motion.div>
      </>
    )}
    {embedded && (
        <button onClick={() => openForm()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> Add Address
        </button>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {formOpen && (
        <motion.form
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          onSubmit={saveAddress}
          className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900">{editingId ? "Edit address" : "New address"}</h2>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close address form" className="text-gray-500"><X className="h-4 w-4" /></button>
          </div>
          {[
            ["name", "Recipient name"],
            ["phone", "Phone number"],
            ["line1", "Street address"],
            ["city", "City"],
          ].map(([field, label]) => (
            <label key={field} className="block text-xs font-medium text-gray-600">
              {label}
              <input required value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-primary focus:outline-none" />
            </label>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saving} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Address"}</button>
            <button type="button" onClick={() => setFormOpen(false)} className="h-9 rounded-lg border border-gray-200 px-4 text-xs font-medium text-gray-600">Cancel</button>
          </div>
        </motion.form>
      )}
      {addresses.length === 0 ? (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500"
        >
          No saved addresses yet.
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2"
        >
          {addresses.map((address) => (
            <motion.article
              key={address._id}
              variants={staggerItem}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><MapPin className="h-4 w-4 text-primary" />{address.name}{address.isDefault && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Default</span>}</div>
                <div className="flex gap-1">
                  {!address.isDefault && <button onClick={() => setDefault(address._id)} aria-label="Set as default" className="rounded p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold">Set default</button>}
                  <button onClick={() => openForm(address)} aria-label="Edit address" className="rounded p-1.5 text-gray-500 hover:bg-gray-50 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(address._id)} disabled={deletingId === address._id} aria-label="Delete address" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600">{address.line1}, {address.city}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3.5 w-3.5" />{address.phone}</p>
            </motion.article>
          ))}
        </motion.div>
      )}
    </div>
  );
}
