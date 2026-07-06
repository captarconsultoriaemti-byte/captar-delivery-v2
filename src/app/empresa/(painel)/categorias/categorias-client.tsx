"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ToggleLeft, ToggleRight, Eye, Trash2 } from "lucide-react";
import { DraggableTable } from "@/components/ui/draggable-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { useToast } from "@/components/ui/toast";
import {
  createCategoria,
  updateCategoria,
  updateCategoriaStatus,
  updateCategoriasOrdem,
  deleteCategoria,
} from "@/lib/actions/categorias";

interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

export function CategoriasClient({ categorias: categoriasIniciais }: { categorias: Categoria[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState<Categoria | null>(null);
  const [visualizando, setVisualizando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  const [prevCategoriasIniciais, setPrevCategoriasIniciais] = useState(categoriasIniciais);
  if (categoriasIniciais !== prevCategoriasIniciais) {
    setPrevCategoriasIniciais(categoriasIniciais);
    setCategorias(categoriasIniciais);
  }

  async function handleReorder(novaOrdem: Categoria[]) {
    setCategorias(novaOrdem);
    const result = await updateCategoriasOrdem(novaOrdem.map((c) => c.id));
    if (result.error) {
      showToast("error", result.error);
      router.refresh();
    }
  }

  function abrirNova() {
    setEditando(null);
    setNome("");
    setShowForm(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setEditando(categoria);
    setNome(categoria.nome);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = editando
      ? await updateCategoria(editando.id, nome)
      : await createCategoria(nome);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", editando ? "Categoria atualizada." : "Categoria criada.");
    setShowForm(false);
    router.refresh();
  }

  async function handleConfirmarStatus() {
    if (!alterandoStatus) return;

    const result = await updateCategoriaStatus(alterandoStatus.id, !alterandoStatus.ativo);
    setAlterandoStatus(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast(
      "success",
      alterandoStatus.ativo ? "Categoria desativada." : "Categoria ativada.",
    );
    router.refresh();
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteCategoria(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Categoria excluída.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={abrirNova}>Nova Categoria</Button>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <DraggableTable<Categoria>
          rows={categorias}
          rowKey={(c) => c.id}
          onReorder={handleReorder}
          columns={[
            { header: "Nome", render: (c) => c.nome },
            {
              header: "Status",
              render: (c) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    c.ativo ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {c.ativo ? "Ativa" : "Inativa"}
                </span>
              ),
            },
            {
              header: "Ações",
              render: (c) => (
                <div className="flex gap-1">
                  <IconAction icon={Eye} label="Visualizar" variant="secondary" onClick={() => setVisualizando(c)} />
                  <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => abrirEdicao(c)} />
                  <IconAction
                    icon={c.ativo ? ToggleRight : ToggleLeft}
                    label={c.ativo ? "Desativar" : "Ativar"}
                    variant={c.ativo ? "success" : "secondary"}
                    onClick={() => setAlterandoStatus(c)}
                  />
                  <IconAction
                    icon={Trash2}
                    label="Excluir"
                    variant="danger"
                    onClick={() => setExcluindo(c)}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold">
              {editando ? "Editar Categoria" : "Nova Categoria"}
            </h2>

            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              required
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mb-6 w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {visualizando && (
        <DetailModal title={visualizando.nome} onClose={() => setVisualizando(null)}>
          <DetailField label="Status" value={visualizando.ativo ? "Ativa" : "Inativa"} fullWidth />
        </DetailModal>
      )}

      <ConfirmDialog
        open={alterandoStatus !== null}
        title={
          alterandoStatus?.ativo
            ? `Desativar "${alterandoStatus.nome}"?`
            : `Ativar "${alterandoStatus?.nome}"?`
        }
        confirmLabel={alterandoStatus?.ativo ? "Desativar" : "Ativar"}
        destructive={alterandoStatus?.ativo}
        onConfirm={handleConfirmarStatus}
        onCancel={() => setAlterandoStatus(null)}
      />

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
