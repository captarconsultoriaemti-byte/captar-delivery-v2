"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Star, Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { DraggableTable } from "@/components/ui/draggable-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteProduto, updateProdutosOrdem } from "@/lib/actions/produtos";
import { calcularPrecoFinal, formatarTarjaDesconto } from "@/lib/utils/desconto";
import { ProdutoFormModal, type ProdutoParaEdicao } from "./produto-form-modal";
import { ProdutoViewModal } from "./produto-view-modal";

interface Categoria {
  id: string;
  nome: string;
}

interface GrupoOpcionalDisponivel {
  id: string;
  nome: string;
}

interface Produto extends ProdutoParaEdicao {
  categorias?: { nome: string } | null;
}

const ABA_SEM_CATEGORIA = "sem-categoria";

export function CardapioClient({
  produtos: produtosIniciais,
  categorias,
  categoriasTodas,
  gruposDisponiveis,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  categoriasTodas: Categoria[];
  gruposDisponiveis: GrupoOpcionalDisponivel[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [modal, setModal] = useState<"novo" | Produto | null>(null);
  const [visualizando, setVisualizando] = useState<Produto | null>(null);
  const [excluindo, setExcluindo] = useState<Produto | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const temSemCategoria = produtosIniciais.some((p) => p.categoria_ids.length === 0);
  const [abaAtiva, setAbaAtiva] = useState<string>(
    categorias[0]?.id ?? (temSemCategoria ? ABA_SEM_CATEGORIA : ""),
  );
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  const [prevProdutosIniciais, setPrevProdutosIniciais] = useState(produtosIniciais);
  if (produtosIniciais !== prevProdutosIniciais) {
    setPrevProdutosIniciais(produtosIniciais);
    setProdutos(produtosIniciais);
  }

  const categoriaPorId = new Map(categoriasTodas.map((c) => [c.id, c.nome]));

  async function handleReorderProdutos(novaOrdem: Produto[]) {
    setProdutos((prev) => {
      const idsFora = new Set(novaOrdem.map((p) => p.id));
      const resto = prev.filter((p) => !idsFora.has(p.id));
      return [...novaOrdem, ...resto];
    });
    const result = await updateProdutosOrdem(novaOrdem.map((p) => p.id));
    if (result.error) {
      showToast("error", result.error);
      router.refresh();
    }
  }

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteProduto(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Produto excluído.");
    router.refresh();
  }

  const produtosDaAba =
    abaAtiva === ABA_SEM_CATEGORIA
      ? produtos.filter((p) => p.categoria_ids.length === 0)
      : produtos.filter((p) => p.categoria_ids.includes(abaAtiva));

  const produtosFiltrados = produtosDaAba.filter((p) => {
    const bateNome = p.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const bateStatus =
      filtroStatus === "todos" || (filtroStatus === "ativo" ? p.ativo : !p.ativo);
    return bateNome && bateStatus;
  });

  const categoriaVazia = produtosDaAba.length === 0;
  const podeArrastar = filtroNome === "" && filtroStatus === "todos";

  const colunasProdutos = [
    {
      header: "Foto",
      render: (p: Produto) => <ProdutoThumbnail fotoUrl={p.foto_url} nome={p.nome} />,
    },
    {
      header: "Nome",
      render: (p: Produto) => (
        <div className="flex items-center gap-1.5">
          {p.destaque && <Star size={14} className="fill-primary text-primary" />}
          {p.nome}
        </div>
      ),
    },
    {
      header: "Categoria",
      render: (p: Produto) =>
        p.categoria_ids.length > 0
          ? p.categoria_ids.map((id) => categoriaPorId.get(id) ?? "-").join(", ")
          : "-",
    },
    {
      header: "Preço",
      render: (p: Produto) => {
        const tarja = formatarTarjaDesconto(p);
        if (!tarja) {
          return p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        }
        const precoFinal = calcularPrecoFinal(p.preco, p);
        return (
          <div>
            <span className="mr-1 text-xs text-secondary line-through">
              {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="font-medium text-danger">
              {precoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="ml-1 rounded bg-danger/15 px-1.5 py-0.5 text-xs font-semibold text-danger">
              {tarja}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      render: (p: Produto) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            p.ativo ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"
          }`}
        >
          {p.ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      header: "Ações",
      render: (p: Produto) => (
        <div className="flex gap-1">
          <IconAction icon={Eye} label="Visualizar" variant="secondary" onClick={() => setVisualizando(p)} />
          <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => setModal(p)} />
          <IconAction icon={Trash2} label="Excluir" variant="danger" onClick={() => setExcluindo(p)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal("novo")}>Novo Produto</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-secondary/40 pb-2 text-sm">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => setAbaAtiva(categoria.id)}
            className={`rounded-md px-3 py-1.5 font-medium ${
              abaAtiva === categoria.id ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
            }`}
          >
            {categoria.nome}
          </button>
        ))}
        {temSemCategoria && (
          <button
            onClick={() => setAbaAtiva(ABA_SEM_CATEGORIA)}
            className={`rounded-md px-3 py-1.5 font-medium ${
              abaAtiva === ABA_SEM_CATEGORIA ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
            }`}
          >
            Sem categoria
          </button>
        )}
      </div>

      {categoriaVazia ? (
        <div className="rounded-lg border border-secondary/40 bg-white p-6 text-center text-sm text-secondary">
          Nenhum item cadastrado nessa categoria ainda.
        </div>
      ) : (
        <div className="rounded-lg border border-secondary/40 bg-white p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Filtrar por nome"
              className="flex-1 rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as "todos" | "ativo" | "inativo")}
              className="rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {!podeArrastar && (
            <p className="mb-3 text-xs text-secondary">
              Limpe os filtros pra poder reordenar os produtos arrastando.
            </p>
          )}

          {podeArrastar ? (
            <DraggableTable<Produto>
              rows={produtosFiltrados}
              rowKey={(p) => p.id}
              onReorder={handleReorderProdutos}
              emptyMessage="Nenhum produto encontrado com esse filtro."
              columns={colunasProdutos}
            />
          ) : (
            <NumberedTable<Produto>
              rows={produtosFiltrados}
              rowKey={(p) => p.id}
              emptyMessage="Nenhum produto encontrado com esse filtro."
              columns={colunasProdutos}
            />
          )}
        </div>
      )}

      {modal === "novo" && (
        <ProdutoFormModal
          categorias={categoriasTodas}
          gruposDisponiveis={gruposDisponiveis}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal && modal !== "novo" && (
        <ProdutoFormModal
          categorias={categoriasTodas}
          gruposDisponiveis={gruposDisponiveis}
          produto={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {visualizando && (
        <ProdutoViewModal
          produto={{
            ...visualizando,
            categoriasNomes: visualizando.categoria_ids
              .map((id) => categoriaPorId.get(id))
              .filter((nome): nome is string => Boolean(nome)),
            gruposNomes: visualizando.grupo_ids
              .map((id) => gruposDisponiveis.find((g) => g.id === id)?.nome)
              .filter((nome): nome is string => Boolean(nome)),
          }}
          onClose={() => setVisualizando(null)}
        />
      )}

      <ConfirmDialog
        open={excluindo !== null}
        title={`Excluir "${excluindo?.nome}"?`}
        description="Essa acao nao pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        requirePassword
        loading={excluindoLoading}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
