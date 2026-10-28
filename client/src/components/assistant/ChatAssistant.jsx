import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ImageWithFallback from "../common/ImageWithFallback.jsx";
import { askAssistant, addMessage } from "../../features/assistant/assistantSlice.js";
import { formatCurrency } from "../../utils/constants.js";

export function ChatProductCard({ p }) {
  return (
    <div className="border border-border rounded-card p-2 flex gap-2 items-center">
      <ImageWithFallback src={p.image} className="w-12 h-12 object-cover rounded" />
      <div className="flex-1">
        <Link to={`/product/${p.id}`} className="text-sm font-medium text-primary">{p.name}</Link>
        <div className="text-sm">{formatCurrency(p.price, p.unit)}</div>
      </div>
    </div>
  );
}

export function ChatMessage({ role, text, products }) {
  return (
    <div className={`mb-2 ${role === "user" ? "text-right" : "text-left"}`}>
      <div className={`inline-block p-2 rounded-btn text-sm ${role === "user" ? "bg-primary text-white" : "bg-gray-100"}`}>{text}</div>
      {products && products.map((p) => <ChatProductCard key={p.id} p={p} />)}
    </div>
  );
}

export function ChatAssistant() {
  const dispatch = useDispatch();
  const { messages, loading, error } = useSelector((s) => s.assistant);
  const [input, setInput] = useState("");
  const send = (event) => {
    event?.preventDefault();
    const msg = input.trim();
    if (!msg || msg.length > 500 || loading) return;
    dispatch(addMessage({ role: "user", text: msg }));
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    dispatch(askAssistant({ message: msg, history }));
    setInput("");
  };
  const errMsg = error?.message || "";
  return (
    <section aria-labelledby="assistant-heading" className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h2 id="assistant-heading" className="mb-1 font-semibold text-sm text-gray-900">AI Shopping Assistant</h2>
      <div className="mb-3 text-xs text-gray-500">Ask about products, recipes, or sustainable choices.</div>
      <div aria-live="polite" className="mb-3 max-h-64 min-h-16 space-y-2 overflow-y-auto rounded-lg bg-emerald-50/60 p-3">
        {messages.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} products={m.products} />)}
        {!messages.length && !loading && <p className="text-xs text-gray-500">Start a conversation with your GreenMart shopping assistant.</p>}
        {loading && <div role="status" className="text-xs text-emerald-800">GreenMart is thinking…</div>}
        {error && <div role="alert" className="text-xs text-red-700">{errMsg}</div>}
      </div>
      <form className="flex gap-2" onSubmit={send}>
        <label className="sr-only" htmlFor="assistant-question">Ask the AI Shopping Assistant</label>
        <input id="assistant-question" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder="Ask about fresh produce..." />
        <button type="submit" disabled={!input.trim() || loading} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}

export function ChatFloatingButton() { return <button className="fixed bottom-4 right-4 bg-primary text-white rounded-full w-12 h-12">AI</button>; }