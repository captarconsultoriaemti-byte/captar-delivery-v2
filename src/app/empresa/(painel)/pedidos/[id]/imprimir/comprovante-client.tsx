"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { rotuloDocumento } from "@/lib/utils/masks";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";

interface PedidoItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
  produtos: { nome: string } | null;
  combos: { nome: string } | null;
}

interface Pedido {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  documento_fiscal: string | null;
  observacoes: string | null;
  total: number;
  forma_pagamento: string | null;
  origem: "balcao" | "link";
  tipo_entrega: "entrega" | "retirada";
  created_at: string;
  closed_at: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pedido_itens: PedidoItem[];
}

export type Via = "ambas" | "cliente" | "cozinha";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ViaCliente({
  pedido,
  empresa,
}: {
  pedido: Pedido;
  empresa: { nome: string; mensagem_agradecimento: string | null };
}) {
  const enderecoEntrega = [
    pedido.logradouro,
    pedido.numero && `nº ${pedido.numero}`,
    pedido.complemento,
    pedido.bairro,
    pedido.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-sm text-[14pt] leading-snug text-black">
      <div className="text-center">
        <p className="font-bold">{empresa.nome}</p>
        <p className="text-sm font-semibold uppercase">Via do Cliente</p>
        <p className="text-sm">{pedido.tipo_entrega === "retirada" ? "Retirada" : "Entrega"}</p>
      </div>

      <hr className="my-3 border-black" />

      <p>Cliente: {pedido.cliente_nome || "-"}</p>
      {pedido.cliente_telefone && <p>Telefone: {pedido.cliente_telefone}</p>}
      {pedido.documento_fiscal && (
        <p>
          {rotuloDocumento(pedido.documento_fiscal)}: {pedido.documento_fiscal}
        </p>
      )}
      <p>Data: {new Date(pedido.closed_at ?? pedido.created_at).toLocaleString("pt-BR")}</p>
      {pedido.tipo_entrega === "entrega" && enderecoEntrega && <p>Endereço: {enderecoEntrega}</p>}

      <hr className="my-3 border-black" />

      <ul className="flex flex-col gap-2">
        {pedido.pedido_itens.map((item) => (
          <li key={item.id}>
            <div className="flex justify-between">
              <span>
                {item.quantidade}x {item.produtos?.nome ?? item.combos?.nome ?? "?"}
              </span>
              <span>{formatarMoeda(item.preco_unitario * item.quantidade)}</span>
            </div>
            {item.opcionais_selecionados.length > 0 && (
              <p className="text-sm">{formatarOpcionaisComQuantidade(item.opcionais_selecionados)}</p>
            )}
            {item.observacao && <p className="text-sm">Obs: {item.observacao}</p>}
          </li>
        ))}
      </ul>

      <hr className="my-3 border-black" />

      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>{formatarMoeda(pedido.total)}</span>
      </div>
      {pedido.forma_pagamento && <p>Pagamento: {pedido.forma_pagamento}</p>}

      {empresa.mensagem_agradecimento && (
        <p className="mt-4 text-center">{empresa.mensagem_agradecimento}</p>
      )}
    </div>
  );
}

function ViaCozinha({ pedido }: { pedido: Pedido }) {
  return (
    <div className="mx-auto max-w-sm text-[14pt] leading-snug text-black">
      <div className="text-center">
        <p className="font-bold">Via da Cozinha</p>
        <p className="text-sm">
          {pedido.origem === "link" ? "Pedido pelo link" : "Venda direta"} —{" "}
          {new Date(pedido.closed_at ?? pedido.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {pedido.cliente_nome && <p className="text-sm">Cliente: {pedido.cliente_nome}</p>}
      </div>

      <hr className="my-3 border-black" />

      <ul className="flex flex-col gap-2">
        {pedido.pedido_itens.map((item) => (
          <li key={item.id}>
            <p className="font-semibold">
              {item.quantidade}x {item.produtos?.nome ?? item.combos?.nome ?? "?"}
            </p>
            {item.opcionais_selecionados.length > 0 && (
              <p className="text-sm">{formatarOpcionaisComQuantidade(item.opcionais_selecionados)}</p>
            )}
            {item.observacao && <p className="text-sm">Obs: {item.observacao}</p>}
          </li>
        ))}
      </ul>

      {pedido.observacoes && (
        <>
          <hr className="my-3 border-black" />
          <p className="font-semibold">Obs: {pedido.observacoes}</p>
        </>
      )}
    </div>
  );
}

export function ComprovanteClient({
  pedido,
  empresa,
  via,
}: {
  pedido: Pedido;
  empresa: { nome: string; mensagem_agradecimento: string | null };
  via: Via;
}) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 200);
    return () => clearTimeout(timer);
  }, []);

  const mostrarCliente = via === "ambas" || via === "cliente";
  const mostrarCozinha = via === "ambas" || via === "cozinha";

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => window.close()}>
          Fechar
        </Button>
        <Button onClick={() => window.print()}>Imprimir novamente</Button>
      </div>

      {mostrarCliente && (
        <div className={mostrarCozinha ? "break-after-page" : ""}>
          <ViaCliente pedido={pedido} empresa={empresa} />
        </div>
      )}
      {mostrarCozinha && <ViaCozinha pedido={pedido} />}
    </div>
  );
}
