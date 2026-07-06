"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { useToast } from "@/components/ui/toast";
import {
  createTipoEstabelecimento,
  deleteTipoEstabelecimento,
  updateTipoEstabelecimento,
} from "@/lib/actions/tipos-estabelecimento";

interface TipoEstabelecimento {
  id: string;
  nome: string;
  ativo: boolean;
  emUsoPor: number;
}

export function TiposEstabelecimentoClient({ tipos }: { tipos: TipoEstabelecimento[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<TipoEstabelecimento | null>(null);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<TipoEstabelecimento | null>(null);
  const [visualizando, setVisualizando] = useState<TipoEstabelecimento | null>(null);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setShowForm(true);
  }

  function abrirEdicao(tipo: TipoEstabelecimento) {
    if (tipo.emUsoPor > 0) {
      showToast(
        "error",
        `Esse tipo esta em uso por ${tipo.emUsoPor} empresa(s) e nao pode ser editado.`,
      );
      return;
    }
    setEditando(tipo);
    setNome(tipo.nome);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = editando
      ? await updateTipoEstabelecimento(editando.id, nome)
      : await createTipoEstabelecimento(nome);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", editando ? "Tipo atualizado com sucesso." : "Tipo criado com sucesso.");
    setShowForm(false);
    router.refresh();
  }

  function pedirExclusao(tipo: TipoEstabelecimento) {
    if (tipo.emUsoPor > 0) {
      showToast(
        "error",
        `Esse tipo esta em uso por ${tipo.emUsoPor} empresa(s) e nao pode ser excluido.`,
      );
      return;
    }
    setExcluindo(tipo);
  }

  async function handleConfirmarExclusao() {
    if (!excluindo) return;

    const result = await deleteTipoEstabelecimento(excluindo.id);
    setExcluindo(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Tipo excluido com sucesso.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={abrirNovo}>Novo Tipo</Button>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<TipoEstabelecimento>
          rows={tipos}
          rowKey={(t) => t.id}
          columns={[
            { header: "Nome", render: (t) => t.nome },
            {
              header: "Em uso",
              render: (t) =>
                t.emUsoPor > 0 ? `${t.emUsoPor} empresa(s)` : "Nenhuma empresa",
            },
            {
              header: "Ações",
              render: (t) => (
                <div className="flex gap-1">
                  <IconAction icon={Eye} label="Visualizar" variant="secondary" onClick={() => setVisualizando(t)} />
                  <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => abrirEdicao(t)} />
                  <IconAction
                    icon={Trash2}
                    label="Excluir"
                    variant="danger"
                    onClick={() => pedirExclusao(t)}
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
              {editando ? "Editar Tipo" : "Novo Tipo"}
            </h2>

            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              required
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Marmitaria"
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
          <DetailField
            label="Em uso"
            value={
              visualizando.emUsoPor > 0 ? `${visualizando.emUsoPor} empresa(s)` : "Nenhuma empresa"
            }
            fullWidth
          />
        </DetailModal>
      )}

      <ConfirmDialog
        open={excluindo !== null}
        title={`Excluir "${excluindo?.nome}"?`}
        description="Essa acao nao pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
