import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "success" | "danger" | "secondary";

const variantClasses: Record<Variant, string> = {
  primary: "text-primary hover:bg-primary/10",
  success: "text-success hover:bg-success/10",
  danger: "text-danger hover:bg-danger/10",
  secondary: "text-secondary hover:bg-secondary/10",
};

export function IconLinkAction({
  icon: Icon,
  label,
  href,
  variant = "secondary",
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  variant?: Variant;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`inline-flex rounded-md p-1.5 transition-colors ${variantClasses[variant]}`}
    >
      <Icon size={16} />
    </Link>
  );
}
