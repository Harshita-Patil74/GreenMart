import React from "react";
export default function AddressCard({ address, selected, onSelect }) {
  return (
    <div onClick={onSelect} className={`cursor-pointer transition-all p-4 rounded-[10px] border ${selected ? "border-[#16803C] bg-emerald-50 shadow-card" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-card-hover"}`}>
      <div className="font-semibold text-gray-900">{address.name}</div>
      <div className="text-sm text-gray-600">{address.line1}, {address.city}</div>
      <div className="text-sm text-gray-500">{address.phone}</div>
    </div>
  );
}
export function AddressForm({ onSave }) {
  const [form, setForm] = React.useState({ name: "", phone: "", line1: "", city: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-2">
      <input className="h-11 border border-gray-200 rounded-[10px] px-3 bg-gray-50 focus:outline-none focus:border-[#16803C] focus:bg-white" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className="h-11 border border-gray-200 rounded-[10px] px-3 bg-gray-50 focus:outline-none focus:border-[#16803C] focus:bg-white" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="h-11 border border-gray-200 rounded-[10px] px-3 bg-gray-50 focus:outline-none focus:border-[#16803C] focus:bg-white" placeholder="Address" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
      <input className="h-11 border border-gray-200 rounded-[10px] px-3 bg-gray-50 focus:outline-none focus:border-[#16803C] focus:bg-white" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      <button className="h-10 bg-[#16803C] hover:bg-[#126B32] text-white rounded-[10px] font-semibold">Save Address</button>
    </form>
  );
}
export function PaymentMethodSelector({ value, onChange }) {
  const opts = ["UPI / PhonePe / GPay / PayTM", "Card (Visa / Mastercard)", "Cash on Delivery"];
  return (
    <div className="flex flex-col gap-2">
      {opts.map((o) => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={value === o} onChange={() => onChange(o)} className="text-[#16803C] accent-[#16803C]" />{o}</label>)}
      <div className="text-xs text-gray-500 mt-2">Demo checkout: no real payment is taken.</div>
    </div>
  );
}
