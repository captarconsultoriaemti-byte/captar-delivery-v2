"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { IconLinkAction } from "@/components/ui/icon-link-action";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteCombo } from "@/lib/actions/combos";
import { calcularPrecoOriginal } from "@/lib/utils/desconto";
import type { ComboParaEdicao } from "./combo-form";

export function CombosClient({ combos }: { combos: ComboParaEdicao[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [excluindo, setExcluindo] = useState<ComboParaEdicao | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteCombo(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Combo excluído.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link href="/empresa/combos/novo">
          <Button>Novo Combo</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<ComboParaEdicao>
          rows={combos}
          rowKey={(c) => c.id}
          columns={[
            {
              header: "Foto",
              render: (c) => <ProdutoThumbnail fotoUrl={c.foto_url} nome={c.nome} />,
            },
            { header: "Nome", render: (c) => c.nome },
            { header: "Qtd. produtos", render: (c) => String(c.combo_itens.length) },
            {
              header: "Preço",
              render: (c) => (
                <div>
                  {c.tem_desconto && (
                    <div className="text-xs text-secondary line-through">
                      {calcularPrecoOriginal(c.preco, c).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                  )}
                  <div>
                    {c.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {c.tem_desconto && (
                      <span className="ml-1 rounded bg-danger/15 px-1.5 py-0.5 text-xs font-semibold text-danger">
                        {c.desconto_tipo === "percentual"
                          ? `-${c.desconto_valor}%`
                          : `-${(c.desconto_valor ?? 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}`}
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              header: "Status",
              render: (c) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    c.ativo ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {c.ativo ? "Ativo" : "Inativo"}
                </span>
              ),
            },
            {
              header: "Ações",
              render: (c) => (
                <div className="flex gap-1">
                  <IconLinkAction
                    icon={Eye}
                    label="Visualizar"
                    variant="secondary"
                    href={`/empresa/combos/${c.id}`}
                  />
                  <IconLinkAction
                    icon={Pencil}
                    label="Editar"
                    variant="primary"
                    href={`/empresa/combos/${c.id}/editar`}
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
