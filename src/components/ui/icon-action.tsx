import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "success" | "danger" | "secondary";

const variantClasses: Record<Variant, string> = {
  primary: "text-primary hover:bg-primary/10",
  success: "text-success hover:bg-success/10",
  danger: "text-danger hover:bg-danger/10",
  secondary: "text-secondary hover:bg-secondary/10",
};

interface IconActionProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  disabled?: boolean;
}

export function IconAction({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  disabled = false,
}: IconActionProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <Icon size={16} />
    </button>
  );
}
