import React from "react";
import { Check } from "lucide-react";

const ORDER_STEPS = ["Order Placed", "Packed", "Out for Delivery", "Delivered"];

export default function OrderStepper({ history = [], status = "Order Placed" }) {
  const cancelled = status.toLowerCase() === "cancelled";
  const currentIndex = status === "Delivery Failed"
    ? ORDER_STEPS.indexOf("Out for Delivery")
    : ORDER_STEPS.findIndex((step) => step.toLowerCase() === status.toLowerCase());
  const current = currentIndex < 0 ? 0 : currentIndex;
  const steps = cancelled ? [...history] : ORDER_STEPS.map((title) => ({
    title,
    entry: history.find((item) => item.status?.toLowerCase() === title.toLowerCase()),
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      {cancelled ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-700">Order cancelled</h2>
          {(steps.length ? steps : [{ status: "Cancelled" }]).map((step, index) => (
            <div key={`${step.status}-${index}`} className="flex items-center justify-between text-xs text-gray-600">
              <span>{step.status}</span>
              {step.at && <time>{new Date(step.at).toLocaleString("en-IN")}</time>}
            </div>
          ))}
        </div>
      ) : (
        <>
        <div className="mx-auto flex max-w-3xl items-start">
          {steps.map((step, index) => {
            const done = index < current || status.toLowerCase() === "delivered";
            const active = index === current && status.toLowerCase() !== "delivered";
            return (
              <React.Fragment key={step.title}>
                <div className="z-10 flex min-w-0 flex-col items-center text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done || active ? "bg-primary text-white" : "border border-gray-200 bg-gray-50 text-gray-400"}`}>
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`mt-2 text-[10px] font-semibold sm:text-xs ${done || active ? "text-gray-800" : "text-gray-400"}`}>{step.title}</span>
                  {step.entry?.at && <time className="mt-1 text-[9px] text-gray-400 sm:text-[10px]">{new Date(step.entry.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time>}
                </div>
                {index < steps.length - 1 && <div className={`mx-1 mt-4 h-0.5 flex-1 sm:mx-3 ${index < current ? "bg-primary" : "bg-gray-100"}`} />}
              </React.Fragment>
            );
          })}
        </div>
        {status === "Delivery Failed" && (
          <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <p className="font-semibold">Delivery attempt failed</p>
            {history.filter((item) => item.status === "Delivery Failed").map((item, index) => (
              <p key={`${item.at || "failed"}-${index}`} className="mt-1">{item.reason || "The delivery could not be completed."}</p>
            ))}
          </div>
        )}
        </>
      )}
    </div>
  );
}
