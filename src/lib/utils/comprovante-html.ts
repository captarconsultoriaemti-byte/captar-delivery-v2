import { rotuloDocumento } from "@/lib/utils/masks";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";

export interface PedidoItemHtml {
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
  nome: string;
}

export interface PedidoHtml {
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
  pedido_itens: PedidoItemHtml[];
}

export type Via = "ambas" | "cliente" | "cozinha";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function viaClienteHtml(
  pedido: PedidoHtml,
  empresa: { nome: string; mensagem_agradecimento: string | null },
) {
  const endereco = [
    pedido.logradouro,
    pedido.numero && `nº ${pedido.numero}`,
    pedido.complemento,
    pedido.bairro,
    pedido.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  const itensHtml = pedido.pedido_itens
    .map((item) => {
      const opcionais = item.opcionais_selecionados.length
        ? `<p style="font-size:0.85em;margin:0;">${escaparHtml(formatarOpcionaisComQuantidade(item.opcionais_selecionados))}</p>`
        : "";
      const obs = item.observacao
        ? `<p style="font-size:0.85em;margin:0;">Obs: ${escaparHtml(item.observacao)}</p>`
        : "";
      return `<li style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;">
          <span>${item.quantidade}x ${escaparHtml(item.nome)}</span>
          <span>${formatarMoeda(item.preco_unitario * item.quantidade)}</span>
        </div>
        ${opcionais}${obs}
      </li>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;font-size:14pt;line-height:1.3;color:#000;max-width:320px;">
      <div style="text-align:center;">
        <p style="font-weight:bold;margin:0;">${escaparHtml(empresa.nome)}</p>
        <p style="font-size:0.85em;font-weight:600;text-transform:uppercase;margin:0;">Via do Cliente</p>
        <p style="font-size:0.85em;margin:0;">${pedido.tipo_entrega === "retirada" ? "Retirada" : "Entrega"}</p>
      </div>
      <hr style="border-color:#000;margin:12px 0;" />
      <p style="margin:0;">Cliente: ${escaparHtml(pedido.cliente_nome || "-")}</p>
      ${pedido.cliente_telefone ? `<p style="margin:0;">Telefone: ${escaparHtml(pedido.cliente_telefone)}</p>` : ""}
      ${pedido.documento_fiscal ? `<p style="margin:0;">${rotuloDocumento(pedido.documento_fiscal)}: ${escaparHtml(pedido.documento_fiscal)}</p>` : ""}
      <p style="margin:0;">Data: ${new Date(pedido.closed_at ?? pedido.created_at).toLocaleString("pt-BR")}</p>
      ${pedido.tipo_entrega === "entrega" && endereco ? `<p style="margin:0;">Endereço: ${escaparHtml(endereco)}</p>` : ""}
      <hr style="border-color:#000;margin:12px 0;" />
      <ul style="list-style:none;padding:0;margin:0;">${itensHtml}</ul>
      <hr style="border-color:#000;margin:12px 0;" />
      <div style="display:flex;justify-content:space-between;font-weight:bold;">
        <span>Total</span><span>${formatarMoeda(pedido.total)}</span>
      </div>
      ${pedido.forma_pagamento ? `<p style="margin:0;">Pagamento: ${escaparHtml(pedido.forma_pagamento)}</p>` : ""}
      ${empresa.mensagem_agradecimento ? `<p style="text-align:center;margin-top:16px;">${escaparHtml(empresa.mensagem_agradecimento)}</p>` : ""}
    </div>
  `;
}

function viaCozinhaHtml(pedido: PedidoHtml) {
  const itensHtml = pedido.pedido_itens
    .map((item) => {
      const opcionais = item.opcionais_selecionados.length
        ? `<p style="font-size:0.85em;margin:0;">${escaparHtml(formatarOpcionaisComQuantidade(item.opcionais_selecionados))}</p>`
        : "";
      const obs = item.observacao
        ? `<p style="font-size:0.85em;margin:0;">Obs: ${escaparHtml(item.observacao)}</p>`
        : "";
      return `<li style="margin-bottom:8px;">
        <p style="font-weight:600;margin:0;">${item.quantidade}x ${escaparHtml(item.nome)}</p>
        ${opcionais}${obs}
      </li>`;
    })
    .join("");

  const hora = new Date(pedido.closed_at ?? pedido.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div style="font-family:sans-serif;font-size:14pt;line-height:1.3;color:#000;max-width:320px;">
      <div style="text-align:center;">
        <p style="font-weight:bold;margin:0;">Via da Cozinha</p>
        <p style="font-size:0.85em;margin:0;">${pedido.origem === "link" ? "Pedido pelo link" : "Venda direta"} — ${hora}</p>
        ${pedido.cliente_nome ? `<p style="font-size:0.85em;margin:0;">Cliente: ${escaparHtml(pedido.cliente_nome)}</p>` : ""}
      </div>
      <hr style="border-color:#000;margin:12px 0;" />
      <ul style="list-style:none;padding:0;margin:0;">${itensHtml}</ul>
      ${
        pedido.observacoes
          ? `<hr style="border-color:#000;margin:12px 0;" /><p style="margin:0;font-weight:600;">Obs: ${escaparHtml(pedido.observacoes)}</p>`
          : ""
      }
    </div>
  `;
}

export function gerarHtmlComprovante(
  pedido: PedidoHtml,
  empresa: { nome: string; mensagem_agradecimento: string | null },
  via: Via,
): string {
  const mostrarCliente = via === "ambas" || via === "cliente";
  const mostrarCozinha = via === "ambas" || via === "cozinha";

  const partes: string[] = [];
  if (mostrarCliente) partes.push(viaClienteHtml(pedido, empresa));
  if (mostrarCozinha) partes.push(viaCozinhaHtml(pedido));

  return partes.join('<div style="page-break-after:always;"></div>');
}
