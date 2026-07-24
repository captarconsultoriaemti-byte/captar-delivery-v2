"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, DollarSign, Eye, Printer, Trash2, FileText, Receipt, ChefHat, Plus, X } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { IconLinkAction } from "@/components/ui/icon-link-action";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoneyInput, reaisParaFormatado, centavosParaReais } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import {
  fecharPedido,
  deletePedido,
  atualizarDocumentoPedido,
  type PagamentoDividido,
} from "@/lib/actions/pedidos";
import { imprimirHtml } from "@/lib/qz";
import { gerarHtmlComprovante } from "@/lib/utils/comprovante-html";
import { printReceipt } from "@/lib/print/print-receipt";
import { maskCpfCnpj } from "@/lib/utils/masks";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";
import { createClient } from "@/lib/supabase/client";

// venda direta (balcao) imprime a via da cozinha e a via do cliente (que
// funciona como comprovante/nota manual quando tem cpf ou cnpj preenchido)
function abrirImpressao(pedidoId: string, via: "ambas" | "cliente" | "cozinha" = "ambas") {
  window.open(`/empresa/pedidos/${pedidoId}/imprimir?via=${via}`, "_blank");
}

interface PedidoItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
  produtos: { id: string; nome: string } | null;
  combos: { nome: string } | null;
}

interface Pedido {
  id: string;
  status: "aberto" | "fechado";
  cliente_nome: string | null;
  cliente_telefone: string | null;
  documento_fiscal: string | null;
  observacoes: string | null;
  total: number;
  taxa_entrega: number;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  forma_pagamento: string | null;
  created_at: string;
  closed_at: string | null;
  tipo_entrega: "entrega" | "retirada" | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pedido_itens: PedidoItem[];
}

const formasPagamento = ["Dinheiro", "Cartão", "Pix", "iFood", "WhatsApp"];

export function PedidosClient({
  pedidos,
  empresa,
  impressaoAutomatica,
  impressoraAutomatica,
  data,
}: {
  pedidos: Pedido[];
  empresa: { nome: string; mensagem_agradecimento: string | null };
  impressaoAutomatica: boolean;
  impressoraAutomatica: string | null;
  data: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [aba, setAba] = useState<"aberto" | "fechado">("aberto");
  const [fechando, setFechando] = useState<Pedido | null>(null);
  const [visualizando, setVisualizando] = useState<Pedido | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoDividido[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoImpressao, setConfirmandoImpressao] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Pedido | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [editandoDocumento, setEditandoDocumento] = useState<Pedido | null>(null);
  const [documentoInput, setDocumentoInput] = useState("");
  const [salvandoDocumento, setSalvandoDocumento] = useState(false);
  const [reimprimindo, setReimprimindo] = useState<Pedido | null>(null);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroDocumento, setFiltroDocumento] = useState("");

  async function montarHtmlComprovante(pedido: Pedido, via: "ambas" | "cliente" | "cozinha") {
    // busca o preco atual dos adicionais dos produtos do pedido, pra mostrar
    // o valor do opcional junto no comprovante impresso
    const produtoIds = [
      ...new Set(pedido.pedido_itens.map((i) => i.produtos?.id).filter((id): id is string => Boolean(id))),
    ];
    const supabase = createClient();
    const { data: vinculos } = produtoIds.length
      ? await supabase
          .from("produto_grupos_opcionais")
          .select("produto_id, grupos_opcionais(opcionais(nome, preco_adicional))")
          .in("produto_id", produtoIds)
      : { data: [] };

    const precosPorProduto = new Map<string, Record<string, number>>();
    for (const vinculo of (vinculos ?? []) as unknown as {
      produto_id: string;
      grupos_opcionais: { opcionais: { nome: string; preco_adicional: number }[] } | null;
    }[]) {
      const mapa = precosPorProduto.get(vinculo.produto_id) ?? {};
      for (const opcional of vinculo.grupos_opcionais?.opcionais ?? []) {
        mapa[opcional.nome] = opcional.preco_adicional;
      }
      precosPorProduto.set(vinculo.produto_id, mapa);
    }

    return gerarHtmlComprovante(
      {
        id: pedido.id,
        cliente_nome: pedido.cliente_nome,
        cliente_telefone: pedido.cliente_telefone,
        documento_fiscal: pedido.documento_fiscal,
        observacoes: pedido.observacoes,
        total: pedido.total,
        taxa_entrega: pedido.taxa_entrega,
        desconto_tipo: pedido.desconto_tipo,
        desconto_valor: pedido.desconto_valor,
        forma_pagamento: pedido.forma_pagamento,
        origem: "balcao",
        tipo_entrega: pedido.tipo_entrega ?? "retirada",
        created_at: pedido.created_at,
        closed_at: pedido.closed_at,
        cep: pedido.cep,
        logradouro: pedido.logradouro,
        numero: pedido.numero,
        complemento: pedido.complemento,
        bairro: pedido.bairro,
        cidade: pedido.cidade,
        estado: pedido.estado,
        pedido_itens: pedido.pedido_itens.map((item) => ({
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          opcionais_selecionados: item.opcionais_selecionados,
          opcionais_precos: item.produtos?.id ? precosPorProduto.get(item.produtos.id) : undefined,
          observacao: item.observacao,
          nome: item.produtos?.nome ?? item.combos?.nome ?? "?",
        })),
      },
      empresa,
      via,
    );
  }

  async function imprimirAutomaticamente(pedido: Pedido) {
    if (!impressoraAutomatica) return;

    const html = await montarHtmlComprovante(pedido, "ambas");
    const result = await imprimirHtml(impressoraAutomatica, html);
    if (result.error) {
      showToast("error", `${result.error} Abrindo impressão pelo navegador.`);
      printReceipt(pedido.id);
    }
  }

  // reimpressao de pedido ja fechado: tenta QZ Tray primeiro (igual a
  // impressao automatica), so cai pro dialogo do navegador se nao tiver
  // impressora configurada ou o QZ Tray falhar/nao estiver conectado
  async function reimprimir(pedido: Pedido, via: "cliente" | "cozinha") {
    if (!impressoraAutomatica) {
      abrirImpressao(pedido.id, via);
      return;
    }

    const html = await montarHtmlComprovante(pedido, via);
    const result = await imprimirHtml(impressoraAutomatica, html);
    if (result.error) {
      showToast("error", `${result.error} Abrindo impressão pelo navegador.`);
      abrirImpressao(pedido.id, via);
    }
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    const nomeOk = p.cliente_nome?.toLowerCase().includes(filtroNome.toLowerCase()) ?? !filtroNome;
    const documentoOk = filtroDocumento
      ? (p.documento_fiscal ?? "").replace(/\D/g, "").includes(filtroDocumento.replace(/\D/g, ""))
      : true;
    return nomeOk && documentoOk;
  });
  const abertos = pedidosFiltrados.filter((p) => p.status === "aberto");
  const fechados = pedidosFiltrados.filter((p) => p.status === "fechado");
  const listaAtual = aba === "aberto" ? abertos : fechados;

  function resumoItens(pedido: Pedido) {
    return pedido.pedido_itens
      .map((item) => `${item.quantidade}x ${item.produtos?.nome ?? item.combos?.nome ?? "?"}`)
      .join(", ");
  }

  const somaPagamentos = pagamentos.reduce((soma, p) => soma + p.valor, 0);
  const restante = fechando ? Math.round((fechando.total - somaPagamentos) * 100) / 100 : 0;

  function abrirFechamento(pedido: Pedido) {
    setFechando(pedido);
    setPagamentos([{ forma: formasPagamento[0], valor: pedido.total }]);
  }

  function formasDisponiveis(index: number) {
    const usadas = new Set(pagamentos.filter((_, i) => i !== index).map((p) => p.forma));
    return formasPagamento.filter((f) => !usadas.has(f));
  }

  function adicionarFormaPagamento() {
    const usadas = new Set(pagamentos.map((p) => p.forma));
    const proximaForma = formasPagamento.find((f) => !usadas.has(f)) ?? formasPagamento[0];
    setPagamentos((prev) => [...prev, { forma: proximaForma, valor: Math.max(0, restante) }]);
  }

  function atualizarPagamento(index: number, campo: "forma" | "valor", valor: string) {
    setPagamentos((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [campo]: campo === "valor" ? centavosParaReais(valor) : valor } : p,
      ),
    );
  }

  function removerPagamento(index: number) {
    setPagamentos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFecharCobrar() {
    if (!fechando) return;

    if (Math.abs(restante) > 0.01) {
      showToast(
        "error",
        restante > 0
          ? `Ainda falta ${restante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} nas formas de pagamento.`
          : `As formas de pagamento somam ${Math.abs(restante).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a mais que o total.`,
      );
      return;
    }

    setSalvando(true);

    const result = await fecharPedido(fechando.id, pagamentos);
    setSalvando(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Pedido fechado e cobrado.");
    const pedidoFechado = fechando;
    setFechando(null);
    router.refresh();

    if (impressaoAutomatica) {
      imprimirAutomaticamente(pedidoFechado);
    } else {
      setConfirmandoImpressao(pedidoFechado.id);
    }
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deletePedido(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Pedido excluído.");
    router.refresh();
  }

  function abrirEdicaoDocumento(pedido: Pedido) {
    setEditandoDocumento(pedido);
    setDocumentoInput(maskCpfCnpj(pedido.documento_fiscal ?? ""));
  }

  async function handleSalvarDocumento() {
    if (!editandoDocumento) return;
    setSalvandoDocumento(true);

    const result = await atualizarDocumentoPedido(editandoDocumento.id, documentoInput);
    setSalvandoDocumento(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setEditandoDocumento(null);
    showToast("success", "CPF/CNPJ salvo.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setAba("aberto")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              aba === "aberto" ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
            }`}
          >
            Abertos ({abertos.length})
          </button>
          <button
            onClick={() => setAba("fechado")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              aba === "fechado" ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
            }`}
          >
            Fechados ({fechados.length})
          </button>
        </div>
        <Link href="/empresa/pedidos/novo">
          <Button>Novo Pedido</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-secondary/40 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => router.push(`/empresa/pedidos?data=${e.target.value}`)}
            className="rounded-md border border-secondary/55 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Nome do cliente</label>
          <input
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            placeholder="Filtrar por nome"
            className="rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">CPF/CNPJ</label>
          <input
            value={filtroDocumento}
            onChange={(e) => setFiltroDocumento(e.target.value)}
            placeholder="Filtrar por CPF/CNPJ"
            className="rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<Pedido>
          rows={listaAtual}
          rowKey={(p) => p.id}
          columns={[
            { header: "Cliente", render: (p) => p.cliente_nome ?? "Balcão" },
            { header: "Itens", render: (p) => resumoItens(p) },
            {
              header: "Total",
              render: (p) => p.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            },
            {
              header: "Horário",
              render: (p) => new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            },
            {
              header: "Ações",
              render: (p) => (
                <div className="flex items-center gap-1">
                  <IconAction
                    icon={Eye}
                    label="Visualizar"
                    variant="secondary"
                    onClick={() => setVisualizando(p)}
                  />
                  <IconAction
                    icon={Printer}
                    label="Reimprimir"
                    variant="secondary"
                    onClick={() => setReimprimindo(p)}
                  />
                  <IconAction
                    icon={FileText}
                    label="CPF/CNPJ"
                    variant="secondary"
                    onClick={() => abrirEdicaoDocumento(p)}
                  />
                  {p.status === "aberto" ? (
                    <>
                      <IconLinkAction
                        icon={Pencil}
                        label="Editar"
                        variant="primary"
                        href={`/empresa/pedidos/novo?id=${p.id}`}
                      />
                      <IconAction
                        icon={DollarSign}
                        label="Fechar e Cobrar"
                        variant="success"
                        onClick={() => abrirFechamento(p)}
                      />
                      <IconAction
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                        onClick={() => setExcluindo(p)}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-secondary">{p.forma_pagamento}</span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {visualizando && (
        <DetailModal
          title={visualizando.cliente_nome ?? "Balcão"}
          onClose={() => setVisualizando(null)}
        >
          <DetailField
            label="Status"
            value={visualizando.status === "aberto" ? "Aberto" : "Fechado"}
          />
          <DetailField label="Telefone" value={visualizando.cliente_telefone} />
          <DetailField
            label="Tipo"
            value={visualizando.tipo_entrega === "entrega" ? "Entrega" : "Retirada / Balcão"}
          />
          {visualizando.tipo_entrega === "entrega" && (
            <DetailField
              label="Endereço"
              fullWidth
              value={[
                visualizando.logradouro,
                visualizando.numero && `nº ${visualizando.numero}`,
                visualizando.complemento,
                visualizando.bairro,
                visualizando.cidade && visualizando.estado
                  ? `${visualizando.cidade}/${visualizando.estado}`
                  : visualizando.cidade,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          )}
          <DetailField
            label="Horário"
            value={new Date(visualizando.created_at).toLocaleString("pt-BR")}
          />
          <DetailField label="Forma de pagamento" value={visualizando.forma_pagamento} />
          <DetailField label="Observações" value={visualizando.observacoes} fullWidth />
          <DetailField
            label="Itens"
            fullWidth
            value={
              <ul className="flex flex-col gap-1">
                {visualizando.pedido_itens.map((item) => (
                  <li key={item.id}>
                    {item.quantidade}x {item.produtos?.nome ?? item.combos?.nome ?? "?"} —{" "}
                    {item.preco_unitario.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                    {item.opcionais_selecionados.length > 0 && (
                      <span className="block text-xs text-secondary">
                        {formatarOpcionaisComQuantidade(item.opcionais_selecionados)}
                      </span>
                    )}
                    {item.observacao && (
                      <span className="block text-xs text-secondary">Obs: {item.observacao}</span>
                    )}
                  </li>
                ))}
              </ul>
            }
          />
          <DetailField
            label="Total"
            fullWidth
            value={visualizando.total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          />
        </DetailModal>
      )}

      {fechando && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Fechar e Cobrar</h2>
            <p className="mb-4 text-sm text-secondary">
              Total:{" "}
              <span className="font-semibold text-foreground">
                {fechando.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>

            <p className="mb-2 text-sm font-medium">Formas de pagamento</p>
            <div className="flex flex-col gap-2">
              {pagamentos.map((pagamento, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={pagamento.forma}
                    onChange={(e) => atualizarPagamento(index, "forma", e.target.value)}
                    className="flex-1 rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  >
                    {formasDisponiveis(index).map((forma) => (
                      <option key={forma} value={forma}>
                        {forma}
                      </option>
                    ))}
                  </select>
                  <MoneyInput
                    value={reaisParaFormatado(pagamento.valor)}
                    onChange={(valorFormatado) => atualizarPagamento(index, "valor", valorFormatado)}
                    className="w-24"
                  />
                  {pagamentos.length > 1 && (
                    <IconAction
                      icon={X}
                      label="Remover forma"
                      variant="danger"
                      onClick={() => removerPagamento(index)}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={adicionarFormaPagamento}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={13} />
              Adicionar forma de pagamento
            </button>
            <p
              className={`mb-4 mt-2 text-xs ${
                Math.abs(restante) > 0.01 ? "text-danger" : "text-success"
              }`}
            >
              {Math.abs(restante) <= 0.01
                ? "Valores conferem com o total."
                : restante > 0
                  ? `Falta ${restante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                  : `${Math.abs(restante).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a mais que o total`}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFechando(null)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={handleFecharCobrar} disabled={salvando}>
                {salvando ? "Cobrando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmandoImpressao !== null}
        title="Imprimir o pedido?"
        description="Deseja imprimir a via da cozinha e a via do cliente desse pedido agora?"
        confirmLabel="Imprimir"
        onConfirm={() => {
          if (confirmandoImpressao) abrirImpressao(confirmandoImpressao);
          setConfirmandoImpressao(null);
        }}
        onCancel={() => setConfirmandoImpressao(null)}
      />

      <ConfirmDialog
        open={excluindo !== null}
        title="Tem certeza que deseja excluir este pedido?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        requirePassword
        loading={excluindoLoading}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />

      {editandoDocumento && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold">CPF/CNPJ do pedido</h2>
            <p className="mb-4 text-sm text-secondary">
              Impresso na via do cliente como comprovante. Pode adicionar ou alterar mesmo com o
              pedido já fechado e reimprimir em seguida.
            </p>
            <input
              value={documentoInput}
              onChange={(e) => setDocumentoInput(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou CNPJ"
              className="mb-6 w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditandoDocumento(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarDocumento} disabled={salvandoDocumento}>
                {salvandoDocumento ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {reimprimindo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Reimprimir pedido</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  reimprimir(reimprimindo, "cliente");
                  setReimprimindo(null);
                }}
                className="flex flex-col items-center gap-1 rounded-md border border-secondary/55 p-3 text-xs font-medium text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Receipt size={18} />
                Via do Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  reimprimir(reimprimindo, "cozinha");
                  setReimprimindo(null);
                }}
                className="flex flex-col items-center gap-1 rounded-md border border-secondary/55 p-3 text-xs font-medium text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <ChefHat size={18} />
                Via da Cozinha
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setReimprimindo(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
