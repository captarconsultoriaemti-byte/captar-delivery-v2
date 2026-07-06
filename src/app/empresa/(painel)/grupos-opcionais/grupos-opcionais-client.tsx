"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye } from "lucide-react";
import { DraggableTable } from "@/components/ui/draggable-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { useToast } from "@/components/ui/toast";
import {
  deleteGrupoOpcional,
  updateGruposOpcionaisOrdem,
} from "@/lib/actions/grupos-opcionais";
import { GrupoFormModal, type GrupoParaEdicao } from "./grupo-form-modal";

interface Grupo extends GrupoParaEdicao {
  emUsoPor: number;
  produtosVinculados: string[];
}

export function GruposOpcionaisClient({ grupos: gruposIniciais }: { grupos: Grupo[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [modal, setModal] = useState<"novo" | Grupo | null>(null);
  const [excluindo, setExcluindo] = useState<Grupo | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [visualizando, setVisualizando] = useState<Grupo | null>(null);

  const [prevGruposIniciais, setPrevGruposIniciais] = useState(gruposIniciais);
  if (gruposIniciais !== prevGruposIniciais) {
    setPrevGruposIniciais(gruposIniciais);
    setGrupos(gruposIniciais);
  }

  async function handleReorder(novaOrdem: Grupo[]) {
    setGrupos(novaOrdem);
    const result = await updateGruposOpcionaisOrdem(novaOrdem.map((g) => g.id));
    if (result.error) {
      showToast("error", result.error);
      router.refresh();
    }
  }

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  function pedirExclusao(grupo: Grupo) {
    if (grupo.emUsoPor > 0) {
      showToast(
        "error",
        `Esse grupo esta vinculado a ${grupo.emUsoPor} produto(s) e nao pode ser excluido.`,
      );
      return;
    }
    setExcluindo(grupo);
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteGrupoOpcional(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Grupo excluído.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal("novo")}>Novo Grupo</Button>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <DraggableTable<Grupo>
          rows={grupos}
          rowKey={(g) => g.id}
          onReorder={handleReorder}
          columns={[
            { header: "Nome", render: (g) => g.nome },
            {
              header: "Tipo",
              render: (g) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    g.obrigatorio ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {g.obrigatorio
                    ? `Obrigatório (${g.minimo_selecao}-${g.maximo_selecao > 0 ? g.maximo_selecao : "∞"})`
                    : "Opcional"}
                </span>
              ),
            },
            { header: "Itens", render: (g) => String(g.opcionais.length) },
            {
              header: "Em uso",
              render: (g) => (g.emUsoPor > 0 ? `${g.emUsoPor} produto(s)` : "Nenhum produto"),
            },
            {
              header: "Ações",
              render: (g) => (
                <div className="flex gap-1">
                  <IconAction icon={Eye} label="Visualizar" variant="secondary" onClick={() => setVisualizando(g)} />
                  <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => setModal(g)} />
                  <IconAction
                    icon={Trash2}
                    label="Excluir"
                    variant="danger"
                    onClick={() => pedirExclusao(g)}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {modal === "novo" && <GrupoFormModal onClose={() => setModal(null)} onSaved={handleSaved} />}
      {modal && modal !== "novo" && (
        <GrupoFormModal grupo={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}

      {visualizando && (
        <DetailModal title={visualizando.nome} onClose={() => setVisualizando(null)}>
          <DetailField
            label="Tipo"
            value={
              visualizando.obrigatorio
                ? `Obrigatório (${visualizando.minimo_selecao}-${
                    visualizando.maximo_selecao > 0 ? visualizando.maximo_selecao : "∞"
                  })`
                : "Opcional"
            }
          />
          <DetailField
            label="Produtos vinculados"
            fullWidth
            value={
              visualizando.produtosVinculados.length > 0
                ? visualizando.produtosVinculados.join(", ")
                : "Nenhum produto"
            }
          />
          <DetailField
            label="Itens"
            fullWidth
            value={visualizando.opcionais
              .map((o) =>
                o.preco_adicional > 0
                  ? `${o.nome} (+${o.preco_adicional.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
                  : o.nome,
              )
              .join(", ")}
          />
        </DetailModal>
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
