import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-foreground"
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
