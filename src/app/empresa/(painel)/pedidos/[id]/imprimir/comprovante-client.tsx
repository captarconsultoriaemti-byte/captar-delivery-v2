"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { gerarTextoViaCliente, gerarTextoViaCozinha, type PedidoHtml } from "@/lib/utils/comprovante-html";

export type Via = "ambas" | "cliente" | "cozinha";

export function ComprovanteClient({
  pedido,
  empresa,
  via,
  autoFechar,
}: {
  pedido: PedidoHtml;
  empresa: { nome: string; mensagem_agradecimento: string | null };
  via: Via;
  autoFechar?: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 200);
    return () => clearTimeout(timer);
  }, []);

  // fallback do QZ Tray: essa aba foi aberta so pra imprimir uma vez e fechar
  // sozinha, sem exigir que alguem clique em "Fechar" depois
  useEffect(() => {
    if (!autoFechar) return;

    function fecharAposImprimir() {
      window.close();
    }

    window.addEventListener("afterprint", fecharAposImprimir);
    // alguns navegadores nao disparam "afterprint" de forma confiavel numa
    // aba aberta via window.open; fecha de qualquer forma depois de um tempo
    const timeoutFechar = setTimeout(() => window.close(), 5000);

    return () => {
      window.removeEventListener("afterprint", fecharAposImprimir);
      clearTimeout(timeoutFechar);
    };
  }, [autoFechar]);

  const mostrarCliente = via === "ambas" || via === "cliente";
  const mostrarCozinha = via === "ambas" || via === "cozinha";

  return (
    <div className="p-6">
      {/* sem isso o navegador imprime no tamanho de pagina padrao (A4/Carta)
          configurado no driver, em vez da largura real da bobina termica */}
      <style>{`@page { size: 58mm auto; margin: 0; }`}</style>

      {!autoFechar && (
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.close()}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>Imprimir novamente</Button>
        </div>
      )}

      {mostrarCliente && (
        <pre
          className={`mx-auto w-[32ch] whitespace-pre-wrap break-words font-mono text-[10pt] leading-snug text-black ${
            mostrarCozinha ? "break-after-page" : ""
          }`}
        >
          {gerarTextoViaCliente(pedido, empresa)}
        </pre>
      )}
      {mostrarCozinha && (
        <pre className="mx-auto w-[32ch] whitespace-pre-wrap break-words font-mono text-[10pt] leading-snug text-black">
          {gerarTextoViaCozinha(pedido)}
        </pre>
      )}
    </div>
  );
}
