import { createClient } from "@/lib/supabase/server";
import { NotificationBellClient, type NotificacaoItem } from "./notification-bell-client";

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export async function NotificationBell() {
  const supabase = await createClient();

  const [{ data: novos }, { data: cancelamentos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, cliente_nome, created_at")
      .eq("origem", "link")
      .eq("etapa_link", "novo")
      .eq("cancelamento_solicitado", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("pedidos")
      .select("id, cliente_nome, created_at")
      .eq("origem", "link")
      .eq("cancelamento_solicitado", true)
      .order("created_at", { ascending: false }),
  ]);

  const itens: NotificacaoItem[] = [
    ...(cancelamentos ?? []).map((p) => ({
      id: `cancelamento-${p.id}`,
      tipo: "cancelamento" as const,
      titulo: `${p.cliente_nome ?? "Cliente"} solicitou cancelamento`,
      horario: formatarHora(p.created_at),
      href: "/empresa/pedidos-online",
    })),
    ...(novos ?? []).map((p) => ({
      id: `novo-${p.id}`,
      tipo: "novo_pedido" as const,
      titulo: `Novo pedido de ${p.cliente_nome ?? "Cliente"}`,
      horario: formatarHora(p.created_at),
      href: "/empresa/pedidos-online",
    })),
  ];

  return <NotificationBellClient itens={itens} />;
}
