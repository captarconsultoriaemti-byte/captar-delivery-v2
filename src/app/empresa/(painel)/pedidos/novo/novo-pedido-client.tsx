"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Star, Plus, UserPlus, Search, PenLine, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoneyInput, reaisParaFormatado, centavosParaReais } from "@/components/ui/money-input";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { useToast } from "@/components/ui/toast";
import { maskWhatsapp, maskCpfCnpj, maskCep } from "@/lib/utils/masks";
import { salvarPedido, type ItemCarrinho, type PagamentoDividido } from "@/lib/actions/pedidos";
import { calcularPrecoFinal, formatarTarjaDesconto } from "@/lib/utils/desconto";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";
import { ClienteFormModal } from "@/app/empresa/(painel)/clientes/cliente-form-modal";
import type { ClienteCriado } from "@/lib/actions/clientes";
import { createClient } from "@/lib/supabase/client";
import { imprimirHtml } from "@/lib/qz";
import { gerarHtmlComprovante } from "@/lib/utils/comprovante-html";
import { printReceipt } from "@/lib/print/print-receipt";
import {
  buscarCidadesPorEstado,
  buscarEnderecoPorCep,
  buscarEstados,
  normalizarBairro,
  type Cidade,
  type Estado,
} from "@/lib/utils/endereco";

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
  grupo_titulo: string | null;
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
  estoque_maximo: number | null;
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
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

interface BairroEntrega {
  bairro_normalizado: string;
  valor: number;
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
  tipo_entrega: "entrega" | "retirada" | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pedido_itens: PedidoItemExistente[];
}

interface CarrinhoItem extends ItemCarrinho {
  key: string;
  nome: string;
}

const ABA_DESTAQUES = "destaques";
const ABA_COMBOS = "combos";

// rascunho do pedido em andamento (carrinho, dados do cliente e desconto)
// pra nao sumir se a empresa clicar em outro menu e voltar - so vale pra
// pedido novo (sem ?id na url), pedido existente ja tem seu proprio estado no banco
const RASCUNHO_KEY = "captar-novo-pedido-rascunho";

interface RascunhoPedido {
  carrinho: CarrinhoItem[];
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  documentoFiscal: string;
  temDesconto: boolean;
  descontoTipo: "percentual" | "valor";
  descontoPercentual: string;
  descontoValorReais: string;
}

const formasPagamento = ["Dinheiro", "Cartão", "Pix", "iFood", "WhatsApp"];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function abrirImpressao(pedidoId: string, via: "ambas" | "cliente" | "cozinha" = "ambas") {
  window.open(`/empresa/pedidos/${pedidoId}/imprimir?via=${via}`, "_blank");
}

export function NovoPedidoClient({
  produtos,
  categorias,
  combos,
  clientes,
  bairrosEntrega,
  taxaEntregaPadrao,
  pedidoExistente,
  empresa,
  impressaoAutomatica,
  impressoraAutomatica,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  combos: Combo[];
  bairrosEntrega: BairroEntrega[];
  taxaEntregaPadrao: number;
  clientes: ClienteCadastrado[];
  opcionaisHabilitados: boolean;
  pedidoExistente: PedidoExistente | null;
  empresa: { nome: string; mensagem_agradecimento: string | null };
  impressaoAutomatica: boolean;
  impressoraAutomatica: string | null;
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

  const [tipoEntrega, setTipoEntrega] = useState<"entrega" | "retirada">(
    pedidoExistente?.tipo_entrega ?? "retirada",
  );
  const [cep, setCep] = useState(pedidoExistente?.cep ?? "");
  const [logradouro, setLogradouro] = useState(pedidoExistente?.logradouro ?? "");
  const [numero, setNumero] = useState(pedidoExistente?.numero ?? "");
  const [complemento, setComplemento] = useState(pedidoExistente?.complemento ?? "");
  const [bairro, setBairro] = useState(pedidoExistente?.bairro ?? "");
  const [cidade, setCidade] = useState(pedidoExistente?.cidade ?? "");
  const [estado, setEstado] = useState(pedidoExistente?.estado ?? "");
  const [semCep, setSemCep] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);

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
  const [escolhasOpcionais, setEscolhasOpcionais] = useState<Map<string, string>>(new Map());
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [passoModal, setPassoModal] = useState<1 | 2 | 3>(1);
  const temGrupos = configurando?.tipo === "produto" && configurando.item.grupos.length > 0;
  const temItensOpcionais =
    configurando?.tipo === "produto" && configurando.item.itens_opcionais.length > 0;

  const [salvando, setSalvando] = useState<"aberto" | "fechado" | null>(null);
  const [confirmandoImpressao, setConfirmandoImpressao] = useState<string | null>(null);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoDividido[]>([
    { forma: formasPagamento[0], valor: 0 },
  ]);

  const [temDesconto, setTemDesconto] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoPercentual, setDescontoPercentual] = useState("");
  const [descontoValorReais, setDescontoValorReais] = useState("0,00");
  const descontoValor =
    descontoTipo === "percentual" ? Number(descontoPercentual) || 0 : centavosParaReais(descontoValorReais);

  // carrega o rascunho salvo (se houver) assim que a tela monta - so pra
  // pedido novo, nao quando esta editando um pedido ja existente
  const rascunhoCarregadoRef = useRef(false);
  useEffect(() => {
    if (pedidoExistente) {
      rascunhoCarregadoRef.current = true;
      return;
    }

    const bruto = localStorage.getItem(RASCUNHO_KEY);
    if (bruto) {
      try {
        const dados = JSON.parse(bruto) as RascunhoPedido;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (dados.carrinho?.length) setCarrinho(dados.carrinho);
        if (dados.clienteId) setClienteId(dados.clienteId);
        if (dados.clienteNome) setClienteNome(dados.clienteNome);
        if (dados.clienteTelefone) setClienteTelefone(dados.clienteTelefone);
        if (dados.documentoFiscal) setDocumentoFiscal(dados.documentoFiscal);
        if (dados.temDesconto) setTemDesconto(dados.temDesconto);
        if (dados.descontoTipo) setDescontoTipo(dados.descontoTipo);
        if (dados.descontoPercentual) setDescontoPercentual(dados.descontoPercentual);
        if (dados.descontoValorReais) setDescontoValorReais(dados.descontoValorReais);
      } catch {
        localStorage.removeItem(RASCUNHO_KEY);
      }
    }
    rascunhoCarregadoRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // salva o rascunho a cada mudanca no carrinho/cliente/desconto, so depois
  // que o carregamento inicial (efeito acima) ja rodou, senao o estado vazio
  // do primeiro render sobrescreveria o rascunho antes de le-lo
  useEffect(() => {
    if (pedidoExistente || !rascunhoCarregadoRef.current) return;

    if (carrinho.length === 0 && !clienteNome.trim() && !clienteTelefone.trim()) {
      localStorage.removeItem(RASCUNHO_KEY);
      return;
    }

    const rascunho: RascunhoPedido = {
      carrinho,
      clienteId,
      clienteNome,
      clienteTelefone,
      documentoFiscal,
      temDesconto,
      descontoTipo,
      descontoPercentual,
      descontoValorReais,
    };
    localStorage.setItem(RASCUNHO_KEY, JSON.stringify(rascunho));
  }, [
    pedidoExistente,
    carrinho,
    clienteId,
    clienteNome,
    clienteTelefone,
    documentoFiscal,
    temDesconto,
    descontoTipo,
    descontoPercentual,
    descontoValorReais,
  ]);

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

  const taxaEntrega = useMemo(() => {
    if (tipoEntrega !== "entrega") return 0;
    if (!bairro.trim()) return taxaEntregaPadrao;
    const encontrado = bairrosEntrega.find(
      (b) => b.bairro_normalizado === normalizarBairro(bairro),
    );
    return encontrado ? encontrado.valor : taxaEntregaPadrao;
  }, [tipoEntrega, bairro, bairrosEntrega, taxaEntregaPadrao]);

  const total =
    calcularPrecoFinal(subtotal, {
      tem_desconto: temDesconto,
      desconto_tipo: descontoTipo,
      desconto_valor: descontoValor,
    }) + taxaEntrega;

  const somaPagamentos = pagamentos.reduce((soma, p) => soma + p.valor, 0);
  const restante = Math.round((total - somaPagamentos) * 100) / 100;

  function abrirModalProduto(produto: Produto) {
    if (produto.estoque_maximo === 0) {
      showToast("error", "Esse produto está esgotado no momento.");
      return;
    }
    setConfigurando({ tipo: "produto", item: produto });
    setOpcionaisQuantidades(new Map());
    setItensOpcionaisRespostas(new Map());
    setEscolhasOpcionais(new Map());
    setQuantidadeModal(1);
    setPassoModal(1);
  }

  function abrirModalCombo(combo: Combo) {
    setConfigurando({ tipo: "combo", item: combo });
    setOpcionaisQuantidades(new Map());
    setItensOpcionaisRespostas(new Map());
    setEscolhasOpcionais(new Map());
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

  function avancarPassoModal() {
    if (passoModal === 2 && configurando?.tipo === "produto") {
      const erro =
        validarItensOpcionaisObrigatorios(configurando.item) ??
        validarEscolhasObrigatorias(configurando.item);
      if (erro) {
        showToast("error", erro);
        return;
      }
    }
    setPassoModal(passoModal === 1 && temItensOpcionais ? 2 : 3);
  }

  function definirEscolhaOpcional(grupoTitulo: string, nome: string) {
    setEscolhasOpcionais((prev) => new Map(prev).set(grupoTitulo, nome));
  }

  function gruposEscolhaDoProduto(produto: Produto): Map<string, ItemOpcional[]> {
    const grupos = new Map<string, ItemOpcional[]>();
    for (const item of produto.itens_opcionais) {
      if (!item.grupo_titulo) continue;
      const lista = grupos.get(item.grupo_titulo) ?? [];
      lista.push(item);
      grupos.set(item.grupo_titulo, lista);
    }
    return grupos;
  }

  function validarEscolhasObrigatorias(produto: Produto): string | null {
    for (const titulo of gruposEscolhaDoProduto(produto).keys()) {
      if (!escolhasOpcionais.get(titulo)) {
        return `Escolha uma opção em "${titulo}".`;
      }
    }
    return null;
  }

  function validarItensOpcionaisObrigatorios(produto: Produto): string | null {
    for (const item of produto.itens_opcionais) {
      if (item.grupo_titulo) continue;
      if (itensOpcionaisRespostas.get(item.id) === undefined) {
        return `Responda se quer manter "${item.nome}".`;
      }
    }
    return null;
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
      if (item.grupo_titulo) continue;
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
    for (const escolhido of escolhasOpcionais.values()) {
      notas.push(escolhido);
    }
    return notas.join(", ");
  }

  function confirmarAdicao() {
    if (!configurando) return;

    if (configurando.tipo === "produto") {
      const produto = configurando.item;
      const erro =
        validarItensOpcionaisObrigatorios(produto) ??
        validarEscolhasObrigatorias(produto) ??
        validarGruposObrigatorios(produto);
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
      if (cliente.logradouro) {
        setTipoEntrega("entrega");
        setCep(cliente.cep ?? "");
        setLogradouro(cliente.logradouro ?? "");
        setNumero(cliente.numero ?? "");
        setComplemento(cliente.complemento ?? "");
        setBairro(cliente.bairro ?? "");
        setCidade(cliente.cidade ?? "");
        setEstado(cliente.estado ?? "");
      }
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
    setTipoEntrega("retirada");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
  }

  async function handleCepBlur() {
    if (semCep) return;
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setBuscandoCep(true);
    const enderecoEncontrado = await buscarEnderecoPorCep(digits);
    setBuscandoCep(false);

    if (!enderecoEncontrado) {
      showToast("error", "CEP não encontrado. Confira o número ou preencha manualmente.");
      return;
    }

    setLogradouro(enderecoEncontrado.logradouro);
    setBairro(enderecoEncontrado.bairro);
    setCidade(enderecoEncontrado.localidade);
    setEstado(enderecoEncontrado.uf);
  }

  function carregarEstados() {
    if (estados.length === 0) buscarEstados().then(setEstados);
  }

  function handleEstadoSemCep(value: string) {
    setEstado(value);
    setCidade("");
    buscarCidadesPorEstado(value).then(setCidades);
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
    if (cliente.logradouro) {
      setTipoEntrega("entrega");
      setCep(cliente.cep ?? "");
      setLogradouro(cliente.logradouro ?? "");
      setNumero(cliente.numero ?? "");
      setComplemento(cliente.complemento ?? "");
      setBairro(cliente.bairro ?? "");
      setCidade(cliente.cidade ?? "");
      setEstado(cliente.estado ?? "");
    }
    setModalCliente(false);
    setModoCliente(null);
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

  function validarDescontoLocal(): string | null {
    if (!temDesconto) return null;
    const valor = descontoValor;
    if (descontoTipo === "percentual") {
      if (!valor || valor <= 0 || valor >= 100) return "Informe um percentual entre 1 e 99.";
    } else {
      if (!valor || valor <= 0) return "Informe um valor de desconto maior que zero.";
      if (valor >= subtotal) return "O desconto não pode ser igual ou maior que o total.";
    }
    return null;
  }

  function validarEnderecoLocal(): string | null {
    if (tipoEntrega !== "entrega") return null;
    if (!logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
      return "Preencha o endereço de entrega completo.";
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

    const erroEndereco = validarEnderecoLocal();
    if (erroEndereco) {
      showToast("error", erroEndereco);
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
      descontoValor: descontoValor,
      pagamentos: [],
      tipoEntrega,
      endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
    });
    setSalvando(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Pedido salvo como aberto.");
    localStorage.removeItem(RASCUNHO_KEY);
    router.push("/empresa/pedidos");
  }

  async function imprimirAutomaticamente(pedidoId: string) {
    if (!impressoraAutomatica) return;

    // busca o preco atual dos adicionais dos produtos do pedido, pra mostrar
    // o valor do opcional junto no comprovante impresso
    const produtoIds = [
      ...new Set(carrinho.map((i) => i.produto_id).filter((id): id is string => Boolean(id))),
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

    const html = gerarHtmlComprovante(
      {
        id: pedidoId,
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone,
        documento_fiscal: documentoFiscal,
        observacoes: null,
        total,
        taxa_entrega: taxaEntrega,
        desconto_tipo: temDesconto ? descontoTipo : null,
        desconto_valor: temDesconto ? descontoValor : null,
        forma_pagamento: pagamentos.map((p) => p.forma).join(" + "),
        origem: "balcao",
        tipo_entrega: tipoEntrega,
        created_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
        cep: tipoEntrega === "entrega" ? cep : null,
        logradouro: tipoEntrega === "entrega" ? logradouro : null,
        numero: tipoEntrega === "entrega" ? numero : null,
        complemento: tipoEntrega === "entrega" ? complemento : null,
        bairro: tipoEntrega === "entrega" ? bairro : null,
        cidade: tipoEntrega === "entrega" ? cidade : null,
        estado: tipoEntrega === "entrega" ? estado : null,
        pedido_itens: carrinho.map((item) => ({
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          opcionais_selecionados: item.opcionais_selecionados,
          opcionais_precos: item.produto_id ? precosPorProduto.get(item.produto_id) : undefined,
          observacao: item.observacao,
          nome: item.nome,
        })),
      },
      empresa,
      "ambas",
    );

    const result = await imprimirHtml(impressoraAutomatica, html);
    if (result.error) {
      showToast("error", `${result.error} Abrindo impressão pelo navegador.`);
      printReceipt(pedidoId);
    }
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

    const erroEndereco = validarEnderecoLocal();
    if (erroEndereco) {
      showToast("error", erroEndereco);
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
      descontoValor: descontoValor,
      pagamentos,
      tipoEntrega,
      endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
    });
    setSalvando(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Pedido finalizado.");
    localStorage.removeItem(RASCUNHO_KEY);

    if (impressaoAutomatica) {
      await imprimirAutomaticamente(result.data!.id);
      router.push("/empresa/pedidos");
    } else {
      setConfirmandoImpressao(result.data!.id);
    }
  }

  function renderProdutoCard(produto: Produto) {
    const tarja = formatarTarjaDesconto(produto);
    const precoFinal = calcularPrecoFinal(produto.preco, produto);
    const esgotado = produto.estoque_maximo === 0;

    return (
      <button
        key={produto.id}
        onClick={() => abrirModalProduto(produto)}
        className={`relative flex flex-col rounded-md border border-secondary/45 p-3 text-left text-sm ${
          esgotado ? "cursor-not-allowed opacity-50" : "hover:border-primary hover:bg-primary/5"
        }`}
      >
        {esgotado && (
          <span className="absolute right-2 top-2 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
            Esgotado
          </span>
        )}
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
            <p className="mb-2 text-sm font-medium">Como vai ser entregue?</p>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTipoEntrega("retirada")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  tipoEntrega === "retirada"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/55 text-secondary"
                }`}
              >
                Retirada / Balcão
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega("entrega")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  tipoEntrega === "entrega"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/55 text-secondary"
                }`}
              >
                Entrega
              </button>
            </div>

            {tipoEntrega === "entrega" && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={semCep}
                    onChange={(e) => {
                      setSemCep(e.target.checked);
                      if (e.target.checked) carregarEstados();
                    }}
                  />
                  Não sei o CEP
                </label>

                <div>
                  <label className="mb-1 block text-xs font-medium">CEP</label>
                  <input
                    disabled={semCep}
                    value={cep}
                    onChange={(e) => setCep(maskCep(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="w-full rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                  />
                  {buscandoCep && (
                    <p className="mt-1 text-xs text-secondary">Buscando endereço...</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Logradouro</label>
                    <input
                      disabled={!semCep}
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      className="w-full rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Número</label>
                    <input
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Complemento</label>
                    <input
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Bairro</label>
                    <input
                      disabled={!semCep}
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Estado</label>
                    {semCep ? (
                      <Combobox
                        options={estados.map((e) => ({
                          value: e.sigla,
                          label: `${e.nome} (${e.sigla})`,
                        }))}
                        value={estado}
                        onChange={handleEstadoSemCep}
                        placeholder="Selecione o estado"
                      />
                    ) : (
                      <input
                        disabled
                        value={estado}
                        className="w-full rounded-md border border-secondary/55 bg-secondary/10 px-3 py-1.5 text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Cidade</label>
                    {semCep ? (
                      <Combobox
                        options={cidades.map((c) => ({ value: c.nome, label: c.nome }))}
                        value={cidade}
                        onChange={setCidade}
                        placeholder={estado ? "Selecione a cidade" : "Selecione o estado antes"}
                        disabled={!estado}
                      />
                    ) : (
                      <input
                        disabled
                        value={cidade}
                        className="w-full rounded-md border border-secondary/55 bg-secondary/10 px-3 py-1.5 text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
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
                {descontoTipo === "percentual" ? (
                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    value={descontoPercentual}
                    onChange={(e) => setDescontoPercentual(e.target.value)}
                    placeholder="Ex: 10"
                    className="rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                ) : (
                  <MoneyInput value={descontoValorReais} onChange={setDescontoValorReais} />
                )}
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
            {tipoEntrega === "entrega" && (
              <div className="flex justify-between text-secondary">
                <span>Taxa de entrega</span>
                <span>{formatarMoeda(taxaEntrega)}</span>
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
                {salvando === "fechado" ? "Finalizando..." : "Finalizar Pedido"}
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

              {passoModal === 2 && configurando.tipo === "produto" && (
                <>
                  {configurando.item.itens_opcionais
                    .filter((item) => !item.grupo_titulo)
                    .map((item) => {
                      const resposta = itensOpcionaisRespostas.get(item.id);
                      const naoRespondido = resposta === undefined;
                      return (
                        <div
                          key={item.id}
                          className={`mb-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                            naoRespondido ? "border-danger bg-danger/10" : "border-transparent"
                          }`}
                        >
                          {quantidadeModal === 1 ? (
                            <>
                              <span>Manter {item.nome.toLowerCase()}?</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => definirRespostaItemOpcional(item.id, 1)}
                                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                                    resposta !== undefined && resposta > 0
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
                                  onClick={() =>
                                    definirRespostaItemOpcional(item.id, (resposta ?? 0) - 1)
                                  }
                                  className="h-6 w-6 rounded bg-secondary/10 text-secondary"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center">{resposta ?? 0}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    definirRespostaItemOpcional(item.id, (resposta ?? 0) + 1)
                                  }
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

                  {Array.from(gruposEscolhaDoProduto(configurando.item).entries()).map(
                    ([titulo, opcoes]) => (
                      <div key={titulo} className="mb-4">
                        <p className="mb-1 text-xs font-semibold text-secondary">
                          {titulo}
                          <span className="text-danger"> * </span>
                        </p>
                        {opcoes.map((opcao) => {
                          const selecionado = escolhasOpcionais.get(titulo) === opcao.nome;
                          return (
                            <button
                              key={opcao.id}
                              type="button"
                              onClick={() => definirEscolhaOpcional(titulo, opcao.nome)}
                              className={`mb-1 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                                selecionado
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-secondary/45 text-secondary"
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  selecionado ? "border-primary" : "border-secondary/55"
                                }`}
                              >
                                {selecionado && <span className="h-2 w-2 rounded-full bg-primary" />}
                              </span>
                              {opcao.nome}
                            </button>
                          );
                        })}
                      </div>
                    ),
                  )}
                </>
              )}

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
                    {grupo.maximo_selecao === 1
                      ? grupo.opcionais.map((opcional) => {
                          const selecionado = (opcionaisQuantidades.get(opcional.id) ?? 0) > 0;
                          return (
                            <button
                              key={opcional.id}
                              type="button"
                              onClick={() =>
                                definirQuantidadeOpcional(grupo, opcional.id, selecionado ? 0 : 1)
                              }
                              className={`mb-1 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                                selecionado
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-secondary/45 text-secondary"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                    selecionado ? "border-primary" : "border-secondary/55"
                                  }`}
                                >
                                  {selecionado && <span className="h-2 w-2 rounded-full bg-primary" />}
                                </span>
                                {opcional.nome}
                              </span>
                              {opcional.preco_adicional > 0 && (
                                <span className="text-xs">
                                  (+{formatarMoeda(opcional.preco_adicional)})
                                </span>
                              )}
                            </button>
                          );
                        })
                      : grupo.opcionais.map((opcional) => {
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
                  <Button onClick={avancarPassoModal}>Próximo</Button>
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

      <ConfirmDialog
        open={confirmandoImpressao !== null}
        title="Imprimir o pedido?"
        description="Deseja imprimir a via da cozinha e a via do cliente desse pedido agora?"
        confirmLabel="Imprimir"
        onConfirm={() => {
          if (confirmandoImpressao) abrirImpressao(confirmandoImpressao);
          setConfirmandoImpressao(null);
          router.push("/empresa/pedidos");
        }}
        onCancel={() => {
          setConfirmandoImpressao(null);
          router.push("/empresa/pedidos");
        }}
      />
    </div>
  );
}
