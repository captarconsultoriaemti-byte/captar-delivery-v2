"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, X, ShoppingCart, Clock, Info, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Combobox } from "@/components/ui/combobox";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { useToast } from "@/components/ui/toast";
import { maskWhatsapp, maskCep, maskCpf, unmask } from "@/lib/utils/masks";
import {
  buscarCidadesPorEstado,
  buscarEnderecoPorCep,
  buscarEstados,
  normalizarBairro,
  type Cidade,
  type Estado,
} from "@/lib/utils/endereco";
import { calcularPrecoFinal, formatarTarjaDesconto } from "@/lib/utils/desconto";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";
import { calcularStatusFuncionamento, formatarTurnos, type HorarioDia } from "@/lib/utils/horario";
import { criarPedidoLink } from "@/lib/actions/loja";

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
  preco: number;
  foto_url: string | null;
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
  preco: number;
  foto_url: string | null;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
}

interface CarrinhoItem {
  key: string;
  produto_id: string | null;
  combo_id: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string;
}

const ABA_DESTAQUES = "destaques";
const ABA_COMBOS = "combos";

const formasPagamento = ["Dinheiro na entrega", "Cartão na entrega", "Pix"];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LojaClient({
  slug,
  empresa,
  categorias,
  produtos,
  combos,
  bairrosEntrega,
}: {
  slug: string;
  empresa: {
    nome: string;
    logoUrl: string | null;
    tempoMedioEntrega: string | null;
    tempoEstimadoPreparo: number | null;
    taxaEntregaPadrao: number;
    horarioFuncionamento: HorarioDia[];
    pausaManual: boolean;
    whatsapp: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
  };
  categorias: Categoria[];
  produtos: Produto[];
  combos: Combo[];
  bairrosEntrega: { bairro_normalizado: string; valor: number }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [mostrarHorarios, setMostrarHorarios] = useState(false);
  const [mostrarInfo, setMostrarInfo] = useState(false);

  const { aberto, horarioHoje } = useMemo(
    () => calcularStatusFuncionamento(empresa.horarioFuncionamento, empresa.pausaManual),
    [empresa.horarioFuncionamento, empresa.pausaManual],
  );

  const enderecoLinha = [empresa.logradouro, empresa.numero && `nº ${empresa.numero}`, empresa.complemento]
    .filter(Boolean)
    .join(", ");

  const bairroCidadeLinha = [
    empresa.bairro && `Bairro: ${empresa.bairro}`,
    empresa.cidade && `Cidade: ${empresa.cidade}${empresa.estado ? ` - ${empresa.estado}` : ""}`,
  ]
    .filter(Boolean)
    .join(" / ");

  const enderecoParaMapa = [
    empresa.logradouro,
    empresa.numero,
    empresa.bairro,
    empresa.cidade,
    empresa.estado,
    empresa.cep,
  ]
    .filter(Boolean)
    .join(", ");

  const linkMapa = enderecoParaMapa
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoParaMapa)}`
    : null;

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
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
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
  const [checkout, setCheckout] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [observacao, setObservacao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"entrega" | "retirada">("entrega");

  const [semCep, setSemCep] = useState(false);
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);

  const subtotal = useMemo(
    () => carrinho.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0),
    [carrinho],
  );

  const taxaEntrega = useMemo(() => {
    if (tipoEntrega !== "entrega") return 0;
    if (!bairro.trim()) return empresa.taxaEntregaPadrao;
    const encontrado = bairrosEntrega.find(
      (b) => b.bairro_normalizado === normalizarBairro(bairro),
    );
    return encontrado ? encontrado.valor : empresa.taxaEntregaPadrao;
  }, [tipoEntrega, bairro, bairrosEntrega, empresa.taxaEntregaPadrao]);

  const total = subtotal + taxaEntrega;

  async function handleCepBlur() {
    if (semCep) return;
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setBuscandoCep(true);
    const endereco = await buscarEnderecoPorCep(digits);
    setBuscandoCep(false);

    if (!endereco) {
      showToast("error", "CEP não encontrado. Confira o número ou preencha manualmente.");
      return;
    }

    setLogradouro(endereco.logradouro);
    setBairro(endereco.bairro);
    setCidade(endereco.localidade);
    setEstado(endereco.uf);
  }

  function carregarEstados() {
    if (estados.length === 0) buscarEstados().then(setEstados);
  }

  function handleEstadoSemCep(value: string) {
    setEstado(value);
    setCidade("");
    buscarCidadesPorEstado(value).then(setCidades);
  }

  function abrirModalProduto(produto: Produto) {
    if (!aberto) {
      showToast("error", "A loja está fechada no momento.");
      return;
    }
    setConfigurando({ tipo: "produto", item: produto });
    setOpcionaisQuantidades(new Map());
    setItensOpcionaisRespostas(
      new Map(
        produto.itens_opcionais.filter((item) => !item.grupo_titulo).map((item) => [item.id, 1]),
      ),
    );
    setEscolhasOpcionais(new Map());
    setQuantidadeModal(1);
    setPassoModal(1);
  }

  function abrirModalCombo(combo: Combo) {
    if (!aberto) {
      showToast("error", "A loja está fechada no momento.");
      return;
    }
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
      const erro = validarGruposObrigatorios(produto) ?? validarEscolhasObrigatorias(produto);
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
          nome: produto.nome,
          quantidade: quantidadeModal,
          preco_unitario: calcularPrecoFinal(produto.preco, produto) + precoOpcionais,
          opcionais_selecionados: nomesSelecionados,
          observacao: gerarObservacaoItensOpcionais(produto),
        },
      ]);
      showToast("success", `${produto.nome} adicionado ao carrinho.`);
    } else {
      const combo = configurando.item;
      setCarrinho((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          produto_id: null,
          combo_id: combo.id,
          nome: combo.nome,
          quantidade: quantidadeModal,
          preco_unitario: combo.preco,
          opcionais_selecionados: [],
          observacao: "",
        },
      ]);
      showToast("success", `${combo.nome} adicionado ao carrinho.`);
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

  async function handleFinalizarPedido() {
    if (!aberto) {
      showToast("error", "A loja está fechada no momento.");
      return;
    }
    if (!nome.trim()) {
      showToast("error", "Informe seu nome.");
      return;
    }
    if (unmask(whatsapp).length < 10) {
      showToast("error", "Informe um WhatsApp válido, com DDD.");
      return;
    }
    if (
      tipoEntrega === "entrega" &&
      (!logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim())
    ) {
      showToast("error", "Preencha o endereço de entrega completo.");
      return;
    }
    if (!formaPagamento) {
      showToast("error", "Selecione a forma de pagamento.");
      return;
    }

    setEnviando(true);
    const result = await criarPedidoLink(slug, {
      clienteNome: nome,
      clienteWhatsapp: whatsapp,
      clienteCpf: cpf,
      tipoEntrega,
      endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
      observacao,
      formaPagamento,
      itens: carrinho.map((item) => ({
        produto_id: item.produto_id,
        combo_id: item.combo_id,
        quantidade: item.quantidade,
        opcionais_selecionados: item.opcionais_selecionados,
        observacao: item.observacao,
      })),
    });
    setEnviando(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    router.push(`/loja/${slug}/pedido/${result.data!.id}`);
  }

  function renderProdutoCard(produto: Produto) {
    const tarja = formatarTarjaDesconto(produto);
    const precoFinal = calcularPrecoFinal(produto.preco, produto);

    return (
      <button
        key={produto.id}
        onClick={() => abrirModalProduto(produto)}
        className={`flex flex-col rounded-lg border border-secondary/45 bg-white p-3 text-left text-sm ${
          aberto ? "hover:border-primary hover:bg-primary/5" : "cursor-not-allowed opacity-50"
        }`}
      >
        <ProdutoThumbnail
          fotoUrl={produto.foto_url}
          nome={produto.nome}
          className="mb-2 h-24 w-full"
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
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        {empresa.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logoUrl} alt={empresa.nome} className="h-14 w-14 rounded object-cover" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{empresa.nome}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                aberto ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
              }`}
            >
              {aberto ? "Aberto agora" : "Fechado"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-secondary">
            {empresa.tempoMedioEntrega && <span>Entrega: {empresa.tempoMedioEntrega}</span>}
            <button
              onClick={() => setMostrarHorarios(true)}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Clock size={13} />
              Hoje: {horarioHoje ? formatarTurnos(horarioHoje) : "Fechado"}
            </button>
            <button
              onClick={() => setMostrarInfo(true)}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Info size={13} />
              Informações
            </button>
          </div>
        </div>
      </div>

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {produtosDestaque.map(renderProdutoCard)}
        </div>
      )}

      {abaAtiva === ABA_COMBOS && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {combos.map((combo) => {
            const tarja = formatarTarjaDesconto(combo);
            return (
              <button
                key={combo.id}
                onClick={() => abrirModalCombo(combo)}
                className={`flex flex-col rounded-lg border border-secondary/45 bg-white p-3 text-left text-sm ${
                  aberto ? "hover:border-primary hover:bg-primary/5" : "cursor-not-allowed opacity-50"
                }`}
              >
                <ProdutoThumbnail
                  fotoUrl={combo.foto_url}
                  nome={combo.nome}
                  className="mb-2 h-24 w-full"
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
          <div key={g.categoria.id} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.produtosDaCategoria.map(renderProdutoCard)}
          </div>
        ))}

      <button
        onClick={() => setCarrinhoAberto(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <ShoppingCart size={18} />
        Carrinho {carrinho.length > 0 && `(${carrinho.length})`}
      </button>

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
                  <Button
                    onClick={() => setPassoModal(passoModal === 1 && temItensOpcionais ? 2 : 3)}
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button onClick={confirmarAdicao}>Adicionar</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {carrinhoAberto && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary/40 p-4">
              <h2 className="text-lg font-semibold">{checkout ? "Finalizar pedido" : "Carrinho"}</h2>
              <IconAction
                icon={X}
                label="Fechar"
                onClick={() => {
                  setCarrinhoAberto(false);
                  setCheckout(false);
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!checkout ? (
                carrinho.length === 0 ? (
                  <p className="text-sm text-secondary">Seu carrinho está vazio.</p>
                ) : (
                  <div className="flex flex-col gap-2">
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
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nome</label>
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">WhatsApp</label>
                      <input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
                        placeholder="(00) 00000-0000"
                        required
                        className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">CPF (opcional)</label>
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Como você quer receber?</label>
                    <div className="flex gap-2">
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
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("retirada")}
                        className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                          tipoEntrega === "retirada"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-secondary/55 text-secondary"
                        }`}
                      >
                        Retirar no local
                      </button>
                    </div>
                  </div>

                  {tipoEntrega === "retirada" ? (
                    <div className="rounded-md border border-secondary/40 bg-secondary/5 p-3 text-sm">
                      <p className="mb-1 font-medium">Retirar em:</p>
                      {enderecoLinha && <p className="text-secondary">{enderecoLinha}</p>}
                      {bairroCidadeLinha && <p className="text-secondary">{bairroCidadeLinha}</p>}
                      {empresa.tempoEstimadoPreparo != null && (
                        <p className="mt-2 text-secondary">
                          Tempo estimado de preparo: {empresa.tempoEstimadoPreparo} min
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-sm">
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
                        <label className="mb-1 block text-sm font-medium">CEP</label>
                        <input
                          disabled={semCep}
                          value={cep}
                          onChange={(e) => setCep(maskCep(e.target.value))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                        />
                        {buscandoCep && (
                          <p className="mt-1 text-xs text-secondary">Buscando endereço...</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Logradouro</label>
                          <input
                            disabled={!semCep}
                            value={logradouro}
                            onChange={(e) => setLogradouro(e.target.value)}
                            className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Número</label>
                          <input
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                            className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Complemento</label>
                          <input
                            value={complemento}
                            onChange={(e) => setComplemento(e.target.value)}
                            className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Bairro</label>
                          <input
                            disabled={!semCep}
                            value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                            className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Estado</label>
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
                            <input disabled value={estado} className="w-full rounded-md border border-secondary/55 bg-secondary/10 px-3 py-2 text-sm" />
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Cidade</label>
                          {semCep ? (
                            <Combobox
                              options={cidades.map((c) => ({ value: c.nome, label: c.nome }))}
                              value={cidade}
                              onChange={setCidade}
                              placeholder={estado ? "Selecione a cidade" : "Selecione o estado antes"}
                              disabled={!estado}
                            />
                          ) : (
                            <input disabled value={cidade} className="w-full rounded-md border border-secondary/55 bg-secondary/10 px-3 py-2 text-sm" />
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">Observação</label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Forma de pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      required
                      className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="" disabled>
                        Selecione...
                      </option>
                      {formasPagamento.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-secondary/40 p-4">
              <div className="flex justify-between text-sm text-secondary">
                <span>Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>
              {tipoEntrega === "entrega" && (
                <div className="flex justify-between text-sm text-secondary">
                  <span>Taxa de entrega</span>
                  <span>{formatarMoeda(taxaEntrega)}</span>
                </div>
              )}
              <div className="mb-3 flex justify-between border-t border-secondary/30 pt-1.5 text-sm font-semibold">
                <span>Total</span>
                <span>{formatarMoeda(total)}</span>
              </div>
              {!checkout ? (
                <Button
                  className="w-full"
                  onClick={() => setCheckout(true)}
                  disabled={carrinho.length === 0}
                >
                  Continuar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setCheckout(false)}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleFinalizarPedido}
                    disabled={enviando || !aberto}
                  >
                    {enviando ? "Enviando..." : aberto ? "Confirmar Pedido" : "Loja fechada"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarHorarios && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Horário de funcionamento</h2>
              <IconAction icon={X} label="Fechar" onClick={() => setMostrarHorarios(false)} />
            </div>
            <ul className="text-sm">
              {empresa.horarioFuncionamento.map((h) => (
                <li
                  key={h.dia}
                  className={`flex justify-between border-b border-secondary/30 py-1.5 ${
                    h.dia === horarioHoje?.dia ? "font-semibold text-primary" : ""
                  }`}
                >
                  <span>{h.dia}</span>
                  <span className="text-secondary">{formatarTurnos(h)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {mostrarInfo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{empresa.nome}</h2>
              <IconAction icon={X} label="Fechar" onClick={() => setMostrarInfo(false)} />
            </div>
            <div className="flex flex-col gap-3 text-sm">
              {empresa.whatsapp && (
                <div>
                  <p className="text-xs text-secondary">WhatsApp</p>
                  <p className="font-medium">{empresa.whatsapp}</p>
                  <a
                    href={`https://wa.me/55${unmask(empresa.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-xs font-medium text-success hover:underline"
                  >
                    <MessageCircle size={13} />
                    Chamar no WhatsApp
                  </a>
                </div>
              )}
              {empresa.tempoMedioEntrega && (
                <div>
                  <p className="text-xs text-secondary">Tempo médio de entrega</p>
                  <p className="font-medium">{empresa.tempoMedioEntrega}</p>
                </div>
              )}
              {enderecoLinha && (
                <div>
                  <p className="text-xs text-secondary">Localização</p>
                  <p className="font-medium">Endereço: {enderecoLinha}</p>
                  {bairroCidadeLinha && <p className="font-medium">{bairroCidadeLinha}</p>}
                  {linkMapa && (
                    <a
                      href={linkMapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <MapPin size={13} />
                      Ver no mapa
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
