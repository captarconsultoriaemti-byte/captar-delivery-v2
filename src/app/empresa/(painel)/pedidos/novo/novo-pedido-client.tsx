"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Star, Plus, UserPlus, Search, PenLine, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Combobox } from "@/components/ui/combobox";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { useToast } from "@/components/ui/toast";
import { maskWhatsapp, maskCpfCnpj } from "@/lib/utils/masks";
import { salvarPedido, type ItemCarrinho, type PagamentoDividido } from "@/lib/actions/pedidos";
import { calcularPrecoFinal, formatarTarjaDesconto } from "@/lib/utils/desconto";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";
import { ClienteFormModal } from "@/app/empresa/(painel)/clientes/cliente-form-modal";
import type { ClienteCriado } from "@/lib/actions/clientes";

interface OpcionalItem {
  id: string;
  nome: string;
  preco_adicional: number;
}

interface GrupoOpcional {
  id: string;
  nome: string;
  obrigatorio: boolean;
  minimo_selecao: number;
  maximo_selecao: number;
  opcionais: OpcionalItem[];
}

interface ItemOpcional {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  preco: number;
  categoria_ids: string[];
  destaque: boolean;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  grupos: GrupoOpcional[];
  itens_opcionais: ItemOpcional[];
}

interface Categoria {
  id: string;
  nome: string;
}

interface Combo {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  preco: number;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
}

interface ClienteCadastrado {
  id: string;
  nome: string;
  whatsapp: string | null;
  cpf: string | null;
}

interface PedidoItemExistente {
  produto_id: string | null;
  combo_id: string | null;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
}

interface PedidoExistente {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  documento_fiscal: string | null;
  observacoes: string | null;
  pedido_itens: PedidoItemExistente[];
}

interface CarrinhoItem extends ItemCarrinho {
  key: string;
  nome: string;
}

const ABA_DESTAQUES = "destaques";
const ABA_COMBOS = "combos";

const formasPagamento = ["Dinheiro", "Cartão", "Pix", "iFood", "WhatsApp"];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NovoPedidoClient({
  produtos,
  categorias,
  combos,
  clientes,
  pedidoExistente,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  combos: Combo[];
  clientes: ClienteCadastrado[];
  opcionaisHabilitados: boolean;
  pedidoExistente: PedidoExistente | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
  const comboPorId = new Map(combos.map((c) => [c.id, c]));

  const [listaClientes, setListaClientes] = useState<ClienteCadastrado[]>(clientes);
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState(pedidoExistente?.cliente_nome ?? "");
  const [clienteTelefone, setClienteTelefone] = useState(
    maskWhatsapp(pedidoExistente?.cliente_telefone ?? ""),
  );
  const [documentoFiscal, setDocumentoFiscal] = useState(
    maskCpfCnpj(pedidoExistente?.documento_fiscal ?? ""),
  );
  const [buscaCliente, setBuscaCliente] = useState("");
  const [modalCliente, setModalCliente] = useState(false);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [modoCliente, setModoCliente] = useState<"cadastrado" | "manual" | null>(null);
  const temClienteInfo = Boolean(clienteId || clienteNome || clienteTelefone);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>(
    (pedidoExistente?.pedido_itens ?? []).map((item, index) => ({
      key: `existente-${index}`,
      produto_id: item.produto_id,
      combo_id: item.combo_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      opcionais_selecionados: item.opcionais_selecionados,
      observacao: item.observacao ?? "",
      nome:
        (item.produto_id && produtoPorId.get(item.produto_id)?.nome) ||
        (item.combo_id && comboPorId.get(item.combo_id)?.nome) ||
        "Item removido do cardápio",
    })),
  );

  const [configurando, setConfigurando] = useState<
    { tipo: "produto"; item: Produto } | { tipo: "combo"; item: Combo } | null
  >(null);
  const [opcionaisQuantidades, setOpcionaisQuantidades] = useState<Map<string, number>>(new Map());
  const [itensOpcionaisRespostas, setItensOpcionaisRespostas] = useState<Map<string, number>>(
    new Map(),
  );
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [passoModal, setPassoModal] = useState<1 | 2 | 3>(1);
  const temGrupos = configurando?.tipo === "produto" && configurando.item.grupos.length > 0;
  const temItensOpcionais =
    configurando?.tipo === "produto" && configurando.item.itens_opcionais.length > 0;

  const [salvando, setSalvando] = useState<"aberto" | "fechado" | null>(null);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoDividido[]>([
    { forma: formasPagamento[0], valor: 0 },
  ]);

  const [temDesconto, setTemDesconto] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState("");

  const produtosDestaque = produtos.filter((p) => p.destaque);
  const categoriasComProdutos = categorias
    .map((categoria) => ({
      categoria,
      produtosDaCategoria: produtos.filter((p) => p.categoria_ids.includes(categoria.id)),
    }))
    .filter((grupo) => grupo.produtosDaCategoria.length > 0);

  const abas = [
    ...(produtosDestaque.length > 0 ? [{ id: ABA_DESTAQUES, label: "Destaques" }] : []),
    ...(combos.length > 0 ? [{ id: ABA_COMBOS, label: "Combos" }] : []),
    ...categoriasComProdutos.map((g) => ({ id: g.categoria.id, label: g.categoria.nome })),
  ];
  const [abaAtiva, setAbaAtiva] = useState(abas[0]?.id ?? "");

  const subtotal = useMemo(
    () => carrinho.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0),
    [carrinho],
  );

  const total = calcularPrecoFinal(subtotal, {
    tem_desconto: temDesconto,
    desconto_tipo: descontoTipo,
    desconto_valor: Number(descontoValor) || 0,
  });

  const somaPagamentos = pagamentos.reduce((soma, p) => soma + p.valor, 0);
  const restante = Math.round((total - somaPagamentos) * 100) / 100;

  function abrirModalProduto(produto: Produto) {
    setConfigurando({ tipo: "produto", item: produto });
    setOpcionaisQuantidades(new Map());
    setItensOpcionaisRespostas(new Map(produto.itens_opcionais.map((item) => [item.id, 1])));
    setQuantidadeModal(1);
    setPassoModal(1);
  }

  function abrirModalCombo(combo: Combo) {
    setConfigurando({ tipo: "combo", item: combo });
    setOpcionaisQuantidades(new Map());
    setItensOpcionaisRespostas(new Map());
    setQuantidadeModal(1);
    setPassoModal(1);
  }

  function alterarQuantidadeModal(novaQuantidade: number) {
    const quantidadeFinal = Math.max(1, novaQuantidade);
    setItensOpcionaisRespostas((prev) => {
      const novo = new Map(prev);
      for (const [id, valor] of novo) {
        novo.set(id, valor === quantidadeModal ? quantidadeFinal : Math.min(valor, quantidadeFinal));
      }
      return novo;
    });
    setQuantidadeModal(quantidadeFinal);
  }

  function definirRespostaItemOpcional(itemId: string, quantidade: number) {
    const quantidadeFinal = Math.max(0, Math.min(quantidade, quantidadeModal));
    setItensOpcionaisRespostas((prev) => new Map(prev).set(itemId, quantidadeFinal));
  }

  function definirQuantidadeOpcional(grupo: GrupoOpcional, opcionalId: string, quantidade: number) {
    setOpcionaisQuantidades((prev) => {
      const novo = new Map(prev);
      const idsDoGrupo = new Set(grupo.opcionais.map((o) => o.id));
      const somaOutrosNoGrupo = grupo.opcionais
        .filter((o) => o.id !== opcionalId)
        .reduce((soma, o) => soma + (novo.get(o.id) ?? 0), 0);

      let quantidadeFinal = Math.max(0, quantidade);
      if (grupo.maximo_selecao > 0) {
        quantidadeFinal = Math.min(quantidadeFinal, grupo.maximo_selecao - somaOutrosNoGrupo);
      }
      if (grupo.maximo_selecao === 1 && quantidadeFinal > 0) {
        idsDoGrupo.forEach((id) => novo.delete(id));
      }

      if (quantidadeFinal <= 0) novo.delete(opcionalId);
      else novo.set(opcionalId, quantidadeFinal);
      return novo;
    });
  }

  function validarGruposObrigatorios(produto: Produto): string | null {
    for (const grupo of produto.grupos) {
      if (!grupo.obrigatorio) continue;
      const selecionadosNoGrupo = grupo.opcionais.reduce(
        (soma, o) => soma + (opcionaisQuantidades.get(o.id) ?? 0),
        0,
      );
      if (selecionadosNoGrupo < grupo.minimo_selecao) {
        return `Escolha pelo menos ${grupo.minimo_selecao} opção(ões) em "${grupo.nome}".`;
      }
    }
    return null;
  }

  function gerarObservacaoItensOpcionais(produto: Produto): string {
    const notas: string[] = [];
    for (const item of produto.itens_opcionais) {
      const resposta = itensOpcionaisRespostas.get(item.id) ?? quantidadeModal;
      const semItem = quantidadeModal - resposta;
      if (semItem > 0) {
        notas.push(
          quantidadeModal > 1
            ? `${semItem} sem ${item.nome.toLowerCase()}`
            : `sem ${item.nome.toLowerCase()}`,
        );
      }
    }
    return notas.join(", ");
  }

  function confirmarAdicao() {
    if (!configurando) return;

    if (configurando.tipo === "produto") {
      const produto = configurando.item;
      const erro = validarGruposObrigatorios(produto);
      if (erro) {
        showToast("error", erro);
        return;
      }

      const todosOpcionais = produto.grupos.flatMap((g) => g.opcionais);
      const precoOpcionais = todosOpcionais.reduce(
        (soma, o) => soma + o.preco_adicional * (opcionaisQuantidades.get(o.id) ?? 0),
        0,
      );
      const nomesSelecionados = todosOpcionais.flatMap((o) =>
        Array(opcionaisQuantidades.get(o.id) ?? 0).fill(o.nome),
      );

      setCarrinho((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          produto_id: produto.id,
          combo_id: null,
          quantidade: quantidadeModal,
          preco_unitario: calcularPrecoFinal(produto.preco, produto) + precoOpcionais,
          opcionais_selecionados: nomesSelecionados,
          observacao: gerarObservacaoItensOpcionais(produto),
          nome: produto.nome,
        },
      ]);
    } else {
      const combo = configurando.item;
      setCarrinho((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          produto_id: null,
          combo_id: combo.id,
          quantidade: quantidadeModal,
          preco_unitario: combo.preco,
          opcionais_selecionados: [],
          observacao: "",
          nome: combo.nome,
        },
      ]);
    }

    setConfigurando(null);
  }

  function atualizarQuantidade(key: string, quantidade: number) {
    if (quantidade < 1) return;
    setCarrinho((prev) => prev.map((item) => (item.key === key ? { ...item, quantidade } : item)));
  }

  function removerItem(key: string) {
    setCarrinho((prev) => prev.filter((item) => item.key !== key));
  }

  function selecionarCliente(id: string) {
    setClienteId(id);
    const cliente = listaClientes.find((c) => c.id === id);
    if (cliente) {
      setClienteNome(cliente.nome);
      setClienteTelefone(maskWhatsapp(cliente.whatsapp ?? ""));
      if (cliente.cpf) setDocumentoFiscal(maskCpfCnpj(cliente.cpf));
    }
    setModalCliente(false);
    setModoCliente(null);
  }

  function trocarCliente() {
    setClienteId("");
    setClienteNome("");
    setClienteTelefone("");
    setBuscaCliente("");
    setModoCliente(null);
  }

  function confirmarClienteManual() {
    if (!clienteNome.trim()) {
      showToast("error", "Informe o nome do cliente.");
      return;
    }
    setModalCliente(false);
    setModoCliente(null);
  }

  function handleClienteCriado(cliente?: ClienteCriado) {
    setModalNovoCliente(false);
    if (!cliente) return;

    setListaClientes((prev) => [...prev, cliente].sort((a, b) => a.nome.localeCompare(b.nome)));
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteTelefone(maskWhatsapp(cliente.whatsapp ?? ""));
    if (cliente.cpf) setDocumentoFiscal(maskCpfCnpj(cliente.cpf));
    setModalCliente(false);
    setModoCliente(null);
  }

  function adicionarFormaPagamento() {
    setPagamentos((prev) => [
      ...prev,
      { forma: formasPagamento[0], valor: Math.max(0, restante) },
    ]);
  }

  function atualizarPagamento(index: number, campo: "forma" | "valor", valor: string) {
    setPagamentos((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [campo]: campo === "valor" ? Number(valor) || 0 : valor } : p,
      ),
    );
  }

  function removerPagamento(index: number) {
    setPagamentos((prev) => prev.filter((_, i) => i !== index));
  }

  function validarDescontoLocal(): string | null {
    if (!temDesconto) return null;
    const valor = Number(descontoValor) || 0;
    if (descontoTipo === "percentual") {
      if (!valor || valor <= 0 || valor >= 100) return "Informe um percentual entre 1 e 99.";
    } else {
      if (!valor || valor <= 0) return "Informe um valor de desconto maior que zero.";
      if (valor >= subtotal) return "O desconto não pode ser igual ou maior que o total.";
    }
    return null;
  }

  async function handleSalvarAberto() {
    if (!clienteNome.trim()) {
      showToast("error", "Informe o nome do cliente.");
      return;
    }

    const erroDesconto = validarDescontoLocal();
    if (erroDesconto) {
      showToast("error", erroDesconto);
      return;
    }

    setSalvando("aberto");
    const result = await salvarPedido(pedidoExistente?.id ?? null, {
      clienteNome,
      clienteTelefone,
      documentoFiscal,
      observacoes: "",
      itens: carrinho,
      fechar: false,
      formaPagamento: "",
      descontoTipo: temDesconto ? descontoTipo : null,
      descontoValor: Number(descontoValor) || 0,
      pagamentos: [],
    });
    setSalvando(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Pedido salvo como aberto.");
    router.push("/empresa/pedidos");
  }

  async function handleFecharCobrar() {
    if (!clienteNome.trim()) {
      showToast("error", "Informe o nome do cliente.");
      return;
    }

    const erroDesconto = validarDescontoLocal();
    if (erroDesconto) {
      showToast("error", erroDesconto);
      return;
    }

    if (Math.abs(restante) > 0.01) {
      showToast(
        "error",
        restante > 0
          ? `Ainda falta ${formatarMoeda(restante)} nas formas de pagamento.`
          : `As formas de pagamento somam ${formatarMoeda(Math.abs(restante))} a mais que o total.`,
      );
      return;
    }

    setSalvando("fechado");
    const result = await salvarPedido(pedidoExistente?.id ?? null, {
      clienteNome,
      clienteTelefone,
      documentoFiscal,
      observacoes: "",
      itens: carrinho,
      fechar: true,
      formaPagamento: "",
      descontoTipo: temDesconto ? descontoTipo : null,
      descontoValor: Number(descontoValor) || 0,
      pagamentos,
    });
    setSalvando(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Pedido fechado e cobrado.");
    router.push("/empresa/pedidos");
  }

  function renderProdutoCard(produto: Produto) {
    const tarja = formatarTarjaDesconto(produto);
    const precoFinal = calcularPrecoFinal(produto.preco, produto);

    return (
      <button
        key={produto.id}
        onClick={() => abrirModalProduto(produto)}
        className="flex flex-col rounded-md border border-secondary/45 p-3 text-left text-sm hover:border-primary hover:bg-primary/5"
      >
        <ProdutoThumbnail
          fotoUrl={produto.foto_url}
          nome={produto.nome}
          className="mb-2 h-20 w-full"
          iconSize={24}
        />
        <p className="flex items-center gap-1 font-medium">
          {produto.destaque && <Star size={12} className="fill-primary text-primary" />}
          {produto.nome}
        </p>
        {tarja ? (
          <p className="text-xs">
            <span className="mr-1 text-secondary line-through">{formatarMoeda(produto.preco)}</span>
            <span className="font-medium text-danger">{formatarMoeda(precoFinal)}</span>
            <span className="ml-1 rounded bg-danger/15 px-1 py-0.5 font-semibold text-danger">
              {tarja}
            </span>
          </p>
        ) : (
          <p className="text-xs text-secondary">{formatarMoeda(produto.preco)}</p>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-secondary/40 pb-2 text-sm">
          {abas.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`rounded-md px-3 py-1.5 font-medium ${
                abaAtiva === aba.id ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === ABA_DESTAQUES && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {produtosDestaque.map(renderProdutoCard)}
          </div>
        )}

        {abaAtiva === ABA_COMBOS && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {combos.map((combo) => {
              const tarja = formatarTarjaDesconto(combo);
              return (
                <button
                  key={combo.id}
                  onClick={() => abrirModalCombo(combo)}
                  className="flex flex-col rounded-md border border-secondary/45 p-3 text-left text-sm hover:border-primary hover:bg-primary/5"
                >
                  <ProdutoThumbnail
                    fotoUrl={combo.foto_url}
                    nome={combo.nome}
                    className="mb-2 h-20 w-full"
                    iconSize={24}
                  />
                  <p className="font-medium">{combo.nome}</p>
                  <p className="text-xs text-secondary">
                    {formatarMoeda(combo.preco)}
                    {tarja && (
                      <span className="ml-1 rounded bg-danger/15 px-1 py-0.5 font-semibold text-danger">
                        {tarja}
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {categoriasComProdutos
          .filter((g) => g.categoria.id === abaAtiva)
          .map((g) => (
            <div key={g.categoria.id} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {g.produtosDaCategoria.map(renderProdutoCard)}
            </div>
          ))}
      </div>

      <div className="w-full lg:w-96">
        <div className="rounded-lg border border-secondary/40 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Pedido</p>

          {carrinho.length === 0 ? (
            <p className="mb-4 text-sm text-secondary">Nenhum item adicionado.</p>
          ) : (
            <div className="mb-4 flex flex-col gap-2">
              {carrinho.map((item) => (
                <div key={item.key} className="rounded-md border border-secondary/30 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.nome}</p>
                    <IconAction
                      icon={X}
                      label="Remover"
                      variant="danger"
                      onClick={() => removerItem(item.key)}
                    />
                  </div>
                  {item.opcionais_selecionados.length > 0 && (
                    <p className="text-xs text-secondary">
                      {formatarOpcionaisComQuantidade(item.opcionais_selecionados)}
                    </p>
                  )}
                  {item.observacao && (
                    <p className="text-xs text-secondary">Obs: {item.observacao}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => atualizarQuantidade(item.key, item.quantidade - 1)}
                        className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                      >
                        -
                      </button>
                      <span>{item.quantidade}</span>
                      <button
                        onClick={() => atualizarQuantidade(item.key, item.quantidade + 1)}
                        className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-secondary">
                      {formatarMoeda(item.preco_unitario * item.quantidade)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {carrinho.length === 0 ? (
            <p className="rounded-md border border-dashed border-secondary/55 p-3 text-center text-xs text-secondary">
              Adicione pelo menos 1 item do cardápio para continuar o pedido.
            </p>
          ) : (
            <>
          {temClienteInfo ? (
            <div className="mb-4 flex items-center justify-between rounded-md border border-secondary/55 bg-secondary/5 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{clienteNome || "Cliente sem nome"}</p>
                {clienteTelefone && <p className="text-xs text-secondary">{clienteTelefone}</p>}
              </div>
              <IconAction icon={X} label="Remover cliente" variant="secondary" onClick={trocarCliente} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalCliente(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-secondary/65 p-3 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <UserPlus size={16} />
              Adicionar Cliente
            </button>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-secondary">
              CPF/CNPJ na nota (opcional)
            </label>
            <input
              value={documentoFiscal}
              onChange={(e) => setDocumentoFiscal(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou CNPJ"
              className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>


          <div className="mb-3 rounded-md border border-secondary/40 p-3">
            <label className="mb-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={temDesconto}
                onChange={(e) => setTemDesconto(e.target.checked)}
              />
              Aplicar desconto no pedido
            </label>
            {temDesconto && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={descontoTipo}
                  onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
                  className="rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="percentual">Porcentagem (%)</option>
                  <option value="valor">Valor em R$</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step={descontoTipo === "percentual" ? "1" : "0.01"}
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  placeholder={descontoTipo === "percentual" ? "Ex: 10" : "Ex: 5,00"}
                  className="rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-1 border-t border-secondary/40 pt-3 text-sm">
            {temDesconto && (
              <div className="flex justify-between text-secondary">
                <span>Subtotal</span>
                <span className="line-through">{formatarMoeda(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatarMoeda(total)}</span>
            </div>
          </div>

          {mostrarPagamento && (
            <div className="mb-4 rounded-md border border-secondary/40 p-3">
              <p className="mb-2 text-sm font-medium">Formas de pagamento</p>
              <div className="flex flex-col gap-2">
                {pagamentos.map((pagamento, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={pagamento.forma}
                      onChange={(e) => atualizarPagamento(index, "forma", e.target.value)}
                      className="flex-1 rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                    >
                      {formasPagamento.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagamento.valor || ""}
                      onChange={(e) => atualizarPagamento(index, "valor", e.target.value)}
                      placeholder="0,00"
                      className="w-24 rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
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
                className={`mt-2 text-xs ${
                  Math.abs(restante) > 0.01 ? "text-danger" : "text-success"
                }`}
              >
                {Math.abs(restante) <= 0.01
                  ? "Valores conferem com o total."
                  : restante > 0
                    ? `Falta ${formatarMoeda(restante)}`
                    : `${formatarMoeda(Math.abs(restante))} a mais que o total`}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {mostrarPagamento ? (
              <Button variant="success" onClick={handleFecharCobrar} disabled={salvando !== null}>
                {salvando === "fechado" ? "Cobrando..." : "Confirmar Cobrança"}
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={() => {
                  setPagamentos([{ forma: formasPagamento[0], valor: Math.max(0, total) }]);
                  setMostrarPagamento(true);
                }}
                disabled={carrinho.length === 0 || !clienteNome.trim()}
              >
                Fechar e Cobrar
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleSalvarAberto}
              disabled={salvando !== null || carrinho.length === 0 || !clienteNome.trim()}
            >
              {salvando === "aberto" ? "Salvando..." : "Salvar como Aberto"}
            </Button>
          </div>
            </>
          )}
        </div>
      </div>

      {configurando && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold">{configurando.item.nome}</h2>

            {(temItensOpcionais || temGrupos) && (
              <div className="mb-4 flex border-b border-secondary/40 text-sm">
                <div
                  className={`px-3 pb-2 font-medium ${
                    passoModal === 1 ? "border-b-2 border-primary text-primary" : "text-secondary"
                  }`}
                >
                  Produto
                </div>
                {temItensOpcionais && (
                  <div
                    className={`px-3 pb-2 font-medium ${
                      passoModal === 2 ? "border-b-2 border-primary text-primary" : "text-secondary"
                    }`}
                  >
                    Itens Opcionais
                  </div>
                )}
                {temGrupos && (
                  <div
                    className={`px-3 pb-2 font-medium ${
                      passoModal === 3 ? "border-b-2 border-primary text-primary" : "text-secondary"
                    }`}
                  >
                    Adicionais
                  </div>
                )}
              </div>
            )}

            <div className="overflow-y-auto">
              {passoModal === 1 && (
                <>
                  <ProdutoThumbnail
                    fotoUrl={configurando.item.foto_url}
                    nome={configurando.item.nome}
                    className="mb-2 h-32 w-full"
                    iconSize={32}
                  />
                  {configurando.item.descricao && (
                    <p className="mb-3 text-sm text-secondary">{configurando.item.descricao}</p>
                  )}
                  <p className="mb-3 text-sm font-semibold text-primary">
                    {formatarMoeda(
                      configurando.tipo === "produto"
                        ? calcularPrecoFinal(configurando.item.preco, configurando.item)
                        : configurando.item.preco,
                    )}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantidade</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => alterarQuantidadeModal(quantidadeModal - 1)}
                        className="h-7 w-7 rounded bg-secondary/10 text-secondary"
                      >
                        -
                      </button>
                      <span className="w-4 text-center">{quantidadeModal}</span>
                      <button
                        onClick={() => alterarQuantidadeModal(quantidadeModal + 1)}
                        className="h-7 w-7 rounded bg-secondary/10 text-secondary"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}

              {passoModal === 2 &&
                configurando.tipo === "produto" &&
                configurando.item.itens_opcionais.map((item) => {
                  const resposta = itensOpcionaisRespostas.get(item.id) ?? quantidadeModal;
                  return (
                    <div key={item.id} className="mb-3 flex items-center justify-between text-sm">
                      {quantidadeModal === 1 ? (
                        <>
                          <span>Manter {item.nome.toLowerCase()}?</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => definirRespostaItemOpcional(item.id, 1)}
                              className={`rounded-md px-3 py-1 text-xs font-medium ${
                                resposta > 0
                                  ? "bg-primary text-white"
                                  : "bg-secondary/10 text-secondary"
                              }`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => definirRespostaItemOpcional(item.id, 0)}
                              className={`rounded-md px-3 py-1 text-xs font-medium ${
                                resposta === 0
                                  ? "bg-primary text-white"
                                  : "bg-secondary/10 text-secondary"
                              }`}
                            >
                              Não
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>Manter {item.nome.toLowerCase()} em quantas?</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => definirRespostaItemOpcional(item.id, resposta - 1)}
                              className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                            >
                              -
                            </button>
                            <span className="w-4 text-center">{resposta}</span>
                            <button
                              type="button"
                              onClick={() => definirRespostaItemOpcional(item.id, resposta + 1)}
                              className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

              {passoModal === 3 &&
                configurando.tipo === "produto" &&
                configurando.item.grupos.map((grupo) => (
                  <div key={grupo.id} className="mb-4">
                    <p className="mb-1 text-xs font-semibold text-secondary">
                      {grupo.nome}
                      {grupo.obrigatorio && <span className="text-danger"> * </span>}
                      <span className="font-normal">
                        {" "}
                        ({grupo.obrigatorio ? "obrigatório, " : ""}
                        {grupo.maximo_selecao > 0 ? `até ${grupo.maximo_selecao}` : "sem limite"})
                      </span>
                    </p>
                    {grupo.opcionais.map((opcional) => {
                      const qtd = opcionaisQuantidades.get(opcional.id) ?? 0;
                      return (
                        <div
                          key={opcional.id}
                          className="mb-1 flex items-center justify-between text-sm"
                        >
                          <span>
                            {opcional.nome}
                            {opcional.preco_adicional > 0 && (
                              <span className="ml-1 text-xs text-secondary">
                                (+{formatarMoeda(opcional.preco_adicional)})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => definirQuantidadeOpcional(grupo, opcional.id, qtd - 1)}
                              className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                            >
                              -
                            </button>
                            <span className="w-4 text-center">{qtd}</span>
                            <button
                              type="button"
                              onClick={() => definirQuantidadeOpcional(grupo, opcional.id, qtd + 1)}
                              className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-between">
              <Button variant="secondary" onClick={() => setConfigurando(null)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {passoModal > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setPassoModal(passoModal === 3 && temItensOpcionais ? 2 : 1)
                    }
                  >
                    Voltar
                  </Button>
                )}
                {(passoModal === 1 && (temItensOpcionais || temGrupos)) ||
                (passoModal === 2 && temGrupos) ? (
                  <Button
                    onClick={() => setPassoModal(passoModal === 1 && temItensOpcionais ? 2 : 3)}
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button onClick={confirmarAdicao}>Adicionar ao Pedido</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalCliente && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cliente</h2>
              <IconAction
                icon={X}
                label="Fechar"
                onClick={() => {
                  setModalCliente(false);
                  setModoCliente(null);
                }}
              />
            </div>

            {modoCliente === null ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoCliente("cadastrado")}
                  className="flex flex-col items-center gap-1 rounded-md border border-secondary/55 p-3 text-xs font-medium text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Search size={18} />
                  Cliente cadastrado
                </button>
                <button
                  type="button"
                  onClick={() => setModoCliente("manual")}
                  className="flex flex-col items-center gap-1 rounded-md border border-secondary/55 p-3 text-xs font-medium text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <PenLine size={18} />
                  Sem cadastro
                </button>
              </div>
            ) : modoCliente === "cadastrado" ? (
              <div>
                <Combobox
                  options={listaClientes.map((c) => ({ value: c.id, label: c.nome }))}
                  value={clienteId}
                  onChange={selecionarCliente}
                  onQueryChange={setBuscaCliente}
                  placeholder="Buscar cliente cadastrado..."
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModoCliente(null)}
                    className="flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
                  >
                    <ChevronLeft size={13} />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalNovoCliente(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <UserPlus size={13} />
                    Cadastrar novo cliente
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  required
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="mb-2 w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(maskWhatsapp(e.target.value))}
                  placeholder="Telefone (opcional)"
                  className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModoCliente(null)}
                    className="flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
                  >
                    <ChevronLeft size={13} />
                    Voltar
                  </button>
                  <Button onClick={confirmarClienteManual} disabled={!clienteNome.trim()}>
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalNovoCliente && (
        <ClienteFormModal
          nomeInicial={buscaCliente}
          onClose={() => setModalNovoCliente(false)}
          onSaved={handleClienteCriado}
        />
      )}
    </div>
  );
}
