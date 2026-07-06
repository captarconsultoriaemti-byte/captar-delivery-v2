"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const INTERVALO_SEGUNDOS = 20;

// atualiza a pagina periodicamente (o status do pedido muda no painel da
// empresa e essa tela e so leitura, sem realtime) e da a opcao de atualizar
// na hora, sem precisar dar F5 manual no navegador
export function RefreshControls({ slug, etapa }: { slug: string; etapa: string }) {
  const router = useRouter();
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, INTERVALO_SEGUNDOS * 1000);
    return () => clearInterval(timer);
  }, [router]);

  // quando o pedido chega em "entregue" (seja pela atualizacao automatica ou
  // pelo botao), volta pro cardapio depois de um instante pra o cliente ver
  // o status final antes de sair da tela de acompanhamento
  useEffect(() => {
    if (etapa !== "entregue") return;
    const timer = setTimeout(() => {
      router.push(`/loja/${slug}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [etapa, router, slug]);

  function handleClick() {
    setAtualizando(true);
    router.refresh();
    setTimeout(() => setAtualizando(false), 600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <RefreshCw size={13} className={atualizando ? "animate-spin" : ""} />
      Atualizar
    </button>
  );
}
