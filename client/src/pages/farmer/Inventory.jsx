import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Check, PackageX } from "lucide-react";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";
import productApi from "../../api/productApi";
import getImageUrl from "../../utils/imageUrl";
import { getStatusClasses, unwrapList } from "./farmerUtils";

function stockState(product) {
  const stock = Number(product.stock) || 0;
  const threshold = Number(product.lowStockThreshold ?? 5) || 0;
  if (stock <= 0) return "Out of stock";
  return stock <= threshold ? "Low stock" : "In stock";
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState({});
  const [stockValues, setStockValues] = useState({});
  const [thresholdValues, setThresholdValues] = useState({});
  const [saving, setSaving] = useState({});

  const loadInventory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await productApi.mine();
      setItems(unwrapList(response.data));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your inventory.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadInventory(); }, []);

  const summary = useMemo(() => ({
    total: items.length,
    low: items.filter((item) => stockState(item) === "Low stock").length,
    out: items.filter((item) => stockState(item) === "Out of stock").length,
  }), [items]);

  const toggleAll = () => {
    if (Object.values(editing).filter(Boolean).length === items.length) {
      setEditing({});
      return;
    }
    const next = Object.fromEntries(items.map((item) => [item._id, true]));
    setEditing(next);
    setStockValues(Object.fromEntries(items.map((item) => [item._id, Number(item.stock) || 0])));
    setThresholdValues(Object.fromEntries(items.map((item) => [item._id, Number(item.lowStockThreshold ?? 5) || 0])));
  };

  const saveStock = async (product) => {
    const value = Number(stockValues[product._id]);
    const threshold = Number(thresholdValues[product._id]);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Stock must be zero or greater.");
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error("Minimum stock must be zero or greater.");
      return;
    }
    setSaving((current) => ({ ...current, [product._id]: true }));
    try {
      const form = new FormData();
      form.append("stock", String(value));
      form.append("lowStockThreshold", String(threshold));
      const response = await productApi.update(product._id, form);
      setItems((current) => current.map((item) => item._id === product._id ? { ...item, ...response.data, stock: value, lowStockThreshold: threshold } : item));
      setEditing((current) => ({ ...current, [product._id]: false }));
      toast.success("Stock updated.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't update stock.");
    } finally {
      setSaving((current) => ({ ...current, [product._id]: false }));
    }
  };

  return (
    <section className="space-y-4 pb-5 text-[13px] text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Inventory</h1>
          <p className="mt-1 text-xs text-[#71817D]">Track stock levels and manage your products.</p>
        </div>
        <button type="button" onClick={toggleAll} disabled={!items.length} className="h-8 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42] disabled:opacity-50">
          {Object.keys(editing).length === items.length && items.length ? "Done Updating" : "Update Stock"}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Stock Items", value: summary.total, icon: Boxes, accent: "text-[#0891B2]", iconBg: "bg-cyan-50" },
          { label: "Low Stock Items", value: summary.low, icon: AlertTriangle, accent: "text-[#D97706]", iconBg: "bg-amber-50" },
          { label: "Out of Stock", value: summary.out, icon: PackageX, accent: "text-[#DC4C43]", iconBg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, accent, iconBg }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-[#E7EEEC] bg-white p-3.5 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
            <span className={`flex h-9 w-9 items-center justify-center rounded-md ${iconBg} ${accent}`}><Icon size={17} /></span>
            <div><p className="text-[10px] text-[#7C8985]">{label}</p><p className={`mt-0.5 text-lg font-bold leading-none ${accent}`}>{value}</p></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-[#6A7773]">
            <p>{error}</p><button type="button" onClick={loadInventory} className="mt-3 font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-[#778681]">Loading inventory…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead className="border-b border-[#E9EFED] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
                <tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Current Stock</th><th className="px-3 py-2.5">Minimum Stock</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F0]">
                {items.map((item) => {
                  const state = stockState(item);
                  const isEditing = Boolean(editing[item._id]);
                  return (
                    <tr key={item._id} className={state === "Out of stock" ? "bg-red-50/30" : state === "Low stock" ? "bg-amber-50/20" : "hover:bg-[#FBFCFC]"}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <img src={getImageUrl(item.images?.[0])} alt="" className="h-7 w-7 rounded-md border border-[#E9EFEC] object-cover" />
                          <span className="font-medium text-[#33443F]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#475852]">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input aria-label={`${item.name} stock`} type="number" min="0" step="any" value={stockValues[item._id] ?? item.stock ?? 0} onChange={(event) => setStockValues((current) => ({ ...current, [item._id]: event.target.value }))} className="h-7 w-20 rounded border border-[#DDE6E2] px-2 text-xs outline-none focus:border-[#179361]" />
                            <span className="text-[10px] text-[#899691]">{item.unit}</span>
                          </div>
                        ) : `${item.stock ?? 0} ${item.unit || ""}`}
                      </td>
                      <td className="px-3 py-2 text-[#74827E]">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input aria-label={`${item.name} minimum stock`} type="number" min="0" step="any" value={thresholdValues[item._id] ?? item.lowStockThreshold ?? 5} onChange={(event) => setThresholdValues((current) => ({ ...current, [item._id]: event.target.value }))} className="h-7 w-20 rounded border border-[#DDE6E2] px-2 text-xs outline-none focus:border-[#179361]" />
                            <span className="text-[10px] text-[#899691]">{item.unit}</span>
                          </div>
                        ) : `${item.lowStockThreshold ?? 5} ${item.unit || ""}`}
                      </td>
                      <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(state)}`}>{state}</span></td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <span className="inline-flex items-center gap-1">
                            <button type="button" disabled={saving[item._id]} onClick={() => saveStock(item)} aria-label={`Save ${item.name} stock`} className="rounded border border-[#B9D9CC] p-1 text-[#087449] hover:bg-[#F1F8F4] disabled:opacity-50"><Check size={13} /></button>
                            <button type="button" onClick={() => setEditing((current) => ({ ...current, [item._id]: false }))} className="rounded px-1.5 py-1 text-[10px] text-[#75827D] hover:bg-[#F3F6F5]">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => { setEditing((current) => ({ ...current, [item._id]: true })); setStockValues((current) => ({ ...current, [item._id]: Number(item.stock) || 0 })); setThresholdValues((current) => ({ ...current, [item._id]: Number(item.lowStockThreshold ?? 5) })); }} className="h-6 rounded border border-[#C9DCD4] px-2 text-[10px] font-medium text-[#087449] hover:bg-[#F1F8F4]">Update</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!items.length && <tr><td colSpan="5" className="px-3 py-10 text-center text-xs text-[#82908B]">No products found. Products you add will appear here.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}