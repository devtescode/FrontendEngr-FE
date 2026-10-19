import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

type FormInputProps = Omit<ComponentProps<"input">, "onChange" | "type" | "value"> & {
  label: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  value: string;
};

export function FormInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  minLength,
  placeholder,
  required = true,
}: FormInputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          required={required}
          className={`h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-brand-accent focus-visible:ring-4 focus-visible:ring-brand-accent/10 ${
            isPassword ? "pr-12" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((isVisible) => !isVisible)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
