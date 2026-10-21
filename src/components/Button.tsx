import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "excel";

const baseClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400",
  danger:
    "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-600",
  excel:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
};

export function buttonClass(variant: ButtonVariant = "primary"): string {
  return `${baseClass} ${variantClass[variant]}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}
