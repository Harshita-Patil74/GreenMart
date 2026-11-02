import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordInput({ label, ...props }) {
  const [show, setShow] = useState(false);
  const inputId = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm text-muted">{label}</label>}
      <div className="relative">
        <input id={inputId} type={show ? "text" : "password"} className="h-11 w-full rounded-input border border-border px-3 pr-10 placeholder:text-muted focus:outline-none focus:border-primary" {...props} />
        <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {show ? <EyeOff size={18}/> : <Eye size={18}/>}
        </button>
      </div>
    </div>
  );
}
