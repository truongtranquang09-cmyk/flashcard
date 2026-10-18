import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input className={`${fieldClass} ${className}`} {...props} />
    </label>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <textarea
        rows={3}
        className={`${fieldClass} ${className}`}
        {...props}
      />
    </label>
  );
}
