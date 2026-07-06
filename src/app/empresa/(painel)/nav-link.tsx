import Link from "next/link";
import { Lock, type LucideIcon } from "lucide-react";

export function NavLink({
  href,
  label,
  icon: Icon,
  bloqueado,
  motivo,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  bloqueado: boolean;
  motivo?: string;
}) {
  if (bloqueado) {
    return (
      <span
        title={motivo}
        className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-secondary/50"
      >
        <Lock size={14} />
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-secondary/10">
      <Icon size={16} />
      {label}
    </Link>
  );
}
