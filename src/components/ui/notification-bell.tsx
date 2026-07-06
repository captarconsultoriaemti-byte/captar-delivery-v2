import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function NotificationBell() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("origem", "link")
    .eq("etapa_link", "novo");

  const totalNovos = count ?? 0;

  return (
    <Link
      href="/empresa/pedidos-online"
      title="Pedidos novos pelo link"
      className="relative inline-flex rounded-md p-2 text-secondary hover:bg-secondary/10"
    >
      <Bell size={20} />
      {totalNovos > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {totalNovos}
        </span>
      )}
    </Link>
  );
}
