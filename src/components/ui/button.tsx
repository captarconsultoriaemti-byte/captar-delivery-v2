import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "success" | "danger" | "secondary";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90",
  success: "bg-success text-white hover:bg-success/90",
  danger: "bg-danger text-white hover:bg-danger/90",
  secondary: "bg-secondary/10 text-secondary hover:bg-secondary/20",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
