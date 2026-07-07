"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoneyInput, centavosParaReais, reaisParaFormatado } from "@/components/ui/money-input";
import { BairroAutocomplete } from "@/components/ui/bairro-autocomplete";
import { useToast } from "@/components/ui/toast";
import {
  createBairroEntrega,
  updateBairroEntrega,
  deleteBairroEntrega,
} from "@/lib/actions/bairros-entrega";

interface BairroEntrega {
  id: string;
  bairro: string;
  valor: number;
}

export function BairrosEntregaClient({
  bairros,
  cidade,
  estado,
}: {
  bairros: BairroEntrega[];
  cidade: string;
  estado: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [modal, setModal] = useState<"novo" | BairroEntrega | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("0,00");
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<BairroEntrega | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  function abrirNovo() {
    setNome("");
    setValor("0,00");
    setModal("novo");
  }

  function abrirEdicao(bairro: BairroEntrega) {
    setNome(bairro.bairro);
    setValor(reaisParaFormatado(bairro.valor));
    setModal(bairro);
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result =
      modal === "novo"
        ? await createBairroEntrega(nome, centavosParaReais(valor))
        : await updateBairroEntrega(modal!.id, nome, centavosParaReais(valor));

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setModal(null);
    showToast("success", "Bairro salvo.");
    router.refresh();
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteBairroEntrega(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Bairro excluído.");
    router.refresh();
  }

  function formatarMoeda(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={abrirNovo}>Novo Bairro</Button>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<BairroEntrega>
          rows={bairros}
          rowKey={(b) => b.id}
          emptyMessage="Nenhum bairro cadastrado ainda."
          columns={[
            { header: "Bairro", render: (b) => b.bairro },
            { header: "Valor da entrega", render: (b) => formatarMoeda(b.valor) },
            {
              header: "Ações",
              render: (b) => (
                <div className="flex gap-1">
                  <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => abrirEdicao(b)} />
                  <IconAction
                    icon={Trash2}
                    label="Excluir"
                    variant="danger"
                    onClick={() => setExcluindo(b)}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSalvar}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {modal === "novo" ? "Novo Bairro" : "Editar Bairro"}
            </h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Bairro</label>
              <BairroAutocomplete
                required
                cidade={cidade}
                estado={estado}
                value={nome}
                onChange={setNome}
                placeholder="Digite pra buscar o bairro..."
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium">Valor da entrega</label>
              <MoneyInput required value={valor} onChange={setValor} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={excluindo !== null}
        title={`Excluir "${excluindo?.bairro}"?`}
        description="Essa ação não pode ser desfeita."
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
