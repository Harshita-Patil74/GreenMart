import React from "react";
import { Check } from "lucide-react";

export default function CheckoutStepper({ step = 0, setStep }) {
  const steps = [
    { num: 1, title: "Shipping" },
    { num: 2, title: "Payment" },
    { num: 3, title: "Review" },
  ];

  return (
    <div className="flex items-center justify-center max-w-md mx-auto mb-8 px-4">
      {steps.map((s, idx) => {
        const isActive = step === idx;
        const isDone = step > idx;

        return (
          <React.Fragment key={s.num}>
            <div
              onClick={() => setStep && setStep(idx)}
              className={`flex items-center gap-2 cursor-pointer transition select-none ${
                isActive
                  ? "text-[#16803C] font-bold"
                  : isDone
                  ? "text-[#16803C] font-semibold"
                  : "text-gray-400 font-medium"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm ${
                  isActive
                    ? "bg-[#16803C] text-white ring-4 ring-emerald-100"
                    : isDone
                    ? "bg-[#16803C] text-white"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="text-xs sm:text-sm">{s.title}</span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-3 sm:mx-4 transition-colors ${
                  step > idx ? "bg-[#16803C]" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
