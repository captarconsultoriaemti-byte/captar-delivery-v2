import { formatarOpcionaisComQuantidade, agruparOpcionais } from "@/lib/utils/opcionais";

export interface PedidoItemHtml {
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  opcionais_precos?: Record<string, number>;
  observacao: string | null;
  nome: string;
}

export interface PedidoHtml {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  documento_fiscal: string | null;
  observacoes: string | null;
  total: number;
  taxa_entrega: number;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  forma_pagamento: string | null;
  origem: "balcao" | "link";
  tipo_entrega: "entrega" | "retirada";
  created_at: string;
  closed_at: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pedido_itens: PedidoItemHtml[];
}

export type Via = "ambas" | "cliente" | "cozinha";

// impressora termica de 58mm: 32 caracteres por linha em fonte monoespacada
const LARGURA = 32;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function centralizar(texto: string): string {
  if (texto.length >= LARGURA) return texto.slice(0, LARGURA);
  const espacos = LARGURA - texto.length;
  return " ".repeat(Math.floor(espacos / 2)) + texto;
}

function linhaDupla(esquerda: string, direita: string): string {
  const espaco = LARGURA - esquerda.length - direita.length;
  if (espaco < 1) {
    const max = Math.max(LARGURA - direita.length - 1, 0);
    return `${esquerda.slice(0, max)} ${direita}`;
  }
  return esquerda + " ".repeat(espaco) + direita;
}

function separador(): string {
  return "-".repeat(LARGURA);
}

// quebra uma linha longa em varias linhas de ate 32 colunas, sem cortar palavras
function quebrarTexto(texto: string, prefixo = ""): string[] {
  const largura = LARGURA - prefixo.length;
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.map((l, i) => (i === 0 ? prefixo + l : " ".repeat(prefixo.length) + l));
}

function numeroPedido(pedido: PedidoHtml): string {
  return pedido.id ? pedido.id.slice(0, 8).toUpperCase() : "-";
}

function tipoPedido(pedido: PedidoHtml): string {
  if (pedido.origem === "balcao") return "Balcão";
  return pedido.tipo_entrega === "retirada" ? "Retirada" : "Entrega";
}

function linhasItemCliente(item: PedidoItemHtml): string[] {
  const qtdNome = `${item.quantidade}x ${item.nome}`;
  const valor = formatarMoeda(item.preco_unitario * item.quantidade);
  const linhas: string[] = [];

  if (qtdNome.length + 1 + valor.length <= LARGURA) {
    linhas.push(linhaDupla(qtdNome, valor));
  } else {
    linhas.push(...quebrarTexto(qtdNome));
    linhas.push(linhaDupla("", valor));
  }

  if (item.opcionais_selecionados.length > 0) {
    linhas.push(
      ...quebrarTexto(
        formatarOpcionaisComQuantidade(item.opcionais_selecionados, item.opcionais_precos),
        "  ",
      ),
    );
  }
  if (item.observacao) {
    linhas.push(...quebrarTexto(`Obs: ${item.observacao}`, "  "));
  }

  return linhas;
}

function linhasItemCozinha(item: PedidoItemHtml): string[] {
  const linhas = quebrarTexto(`${item.quantidade}x ${item.nome}`);

  for (const { nome, quantidade } of agruparOpcionais(item.opcionais_selecionados)) {
    linhas.push(...quebrarTexto(`Adicional: ${quantidade}x ${nome}`, "  "));
  }
  if (item.observacao) {
    linhas.push(...quebrarTexto(`Obs: ${item.observacao}`, "  "));
  }

  return linhas;
}

function gerarTextoViaCliente(
  pedido: PedidoHtml,
  empresa: { nome: string; mensagem_agradecimento: string | null },
): string {
  const endereco = [
    pedido.logradouro,
    pedido.numero && `nº ${pedido.numero}`,
    pedido.complemento,
    pedido.bairro,
    pedido.cidade && pedido.estado ? `${pedido.cidade}/${pedido.estado}` : pedido.cidade,
    pedido.cep && `CEP ${pedido.cep}`,
  ]
    .filter(Boolean)
    .join(", ");

  const subtotal = pedido.pedido_itens.reduce(
    (soma, item) => soma + item.preco_unitario * item.quantidade,
    0,
  );
  const taxaEntrega = pedido.taxa_entrega || 0;
  const desconto = Math.max(0, Math.round((subtotal - (pedido.total - taxaEntrega)) * 100) / 100);

  const linhas: string[] = [];
  linhas.push(centralizar(empresa.nome.toUpperCase()));
  linhas.push(centralizar(new Date(pedido.closed_at ?? pedido.created_at).toLocaleString("pt-BR")));
  linhas.push(centralizar(`Pedido #${numeroPedido(pedido)}`));
  linhas.push(separador());

  linhas.push(...quebrarTexto(`${tipoPedido(pedido)} - ${pedido.cliente_nome || "Balcão"}`));
  if (pedido.cliente_telefone) linhas.push(...quebrarTexto(`Tel: ${pedido.cliente_telefone}`));
  if (pedido.tipo_entrega === "entrega" && endereco) {
    linhas.push(...quebrarTexto(endereco, "End: "));
  }
  linhas.push(separador());

  for (const item of pedido.pedido_itens) linhas.push(...linhasItemCliente(item));
  linhas.push(separador());

  linhas.push(linhaDupla("Subtotal:", formatarMoeda(subtotal)));
  if (desconto > 0) linhas.push(linhaDupla("Desconto:", `-${formatarMoeda(desconto)}`));
  if (taxaEntrega > 0) linhas.push(linhaDupla("Taxa entrega:", formatarMoeda(taxaEntrega)));
  linhas.push(linhaDupla("TOTAL:", formatarMoeda(pedido.total)));
  linhas.push(separador());

  if (pedido.forma_pagamento) {
    linhas.push(...quebrarTexto(pedido.forma_pagamento));
    linhas.push(separador());
  }

  if (empresa.mensagem_agradecimento) {
    for (const l of quebrarTexto(empresa.mensagem_agradecimento)) linhas.push(centralizar(l));
  }

  return linhas.join("\n");
}

function gerarTextoViaCozinha(pedido: PedidoHtml): string {
  const linhas: string[] = [];
  linhas.push(centralizar("VIA DA COZINHA"));

  const hora = new Date(pedido.closed_at ?? pedido.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  linhas.push(centralizar(`${pedido.origem === "link" ? "Pedido pelo link" : "Venda direta"} ${hora}`));
  if (pedido.cliente_nome) linhas.push(centralizar(pedido.cliente_nome));
  linhas.push(separador());

  for (const item of pedido.pedido_itens) linhas.push(...linhasItemCozinha(item));

  if (pedido.observacoes) {
    linhas.push(separador());
    linhas.push(...quebrarTexto(`Obs: ${pedido.observacoes}`));
  }

  return linhas.join("\n");
}

function paraHtmlPre(texto: string): string {
  return `<pre style="font-family:'Courier New',monospace;font-size:10pt;line-height:1.35;color:#000;margin:0;padding:0;width:${LARGURA}ch;white-space:pre-wrap;word-break:break-word;">${escaparHtml(texto)}</pre>`;
}

export function gerarHtmlComprovante(
  pedido: PedidoHtml,
  empresa: { nome: string; mensagem_agradecimento: string | null },
  via: Via,
): string {
  const mostrarCliente = via === "ambas" || via === "cliente";
  const mostrarCozinha = via === "ambas" || via === "cozinha";

  const partes: string[] = [];
  if (mostrarCliente) partes.push(paraHtmlPre(gerarTextoViaCliente(pedido, empresa)));
  if (mostrarCozinha) partes.push(paraHtmlPre(gerarTextoViaCozinha(pedido)));

  return partes.join('<div style="page-break-after:always;"></div>');
}

export { gerarTextoViaCliente, gerarTextoViaCozinha };
