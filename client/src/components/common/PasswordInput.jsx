import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordInput({ label, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <div className="relative">
        <input type={show ? "text" : "password"} className="h-11 w-full rounded-input border border-border px-3 pr-10 placeholder:text-muted focus:outline-none focus:border-primary" {...props} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {show ? <EyeOff size={18}/> : <Eye size={18}/>}
        </button>
      </div>
    </div>
  );
}
