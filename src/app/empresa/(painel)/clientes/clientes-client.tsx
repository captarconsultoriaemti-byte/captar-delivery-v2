"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteCliente } from "@/lib/actions/clientes";
import { ClienteFormModal, type ClienteParaEdicao } from "./cliente-form-modal";
import { ClienteViewModal } from "./cliente-view-modal";

export function ClientesClient({ clientes }: { clientes: ClienteParaEdicao[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [modal, setModal] = useState<"novo" | ClienteParaEdicao | null>(null);
  const [visualizando, setVisualizando] = useState<ClienteParaEdicao | null>(null);
  const [excluindo, setExcluindo] = useState<ClienteParaEdicao | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [filtroNome, setFiltroNome] = useState("");

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  async function handleConfirmarExclusao(senha?: string) {
    if (!excluindo) return;
    setExcluindoLoading(true);

    const result = await deleteCliente(excluindo.id, senha ?? "");
    setExcluindoLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setExcluindo(null);
    showToast("success", "Cliente excluído.");
    router.refresh();
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(filtroNome.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal("novo")}>Novo Cliente</Button>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <div className="mb-4">
          <input
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            placeholder="Filtrar por nome"
            className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none sm:w-72"
          />
        </div>

        <NumberedTable<ClienteParaEdicao>
          rows={clientesFiltrados}
          rowKey={(c) => c.id}
          emptyMessage="Nenhum cliente encontrado."
          columns={[
            { header: "Nome", render: (c) => c.nome },
            { header: "WhatsApp", render: (c) => c.whatsapp || "-" },
            { header: "Cidade", render: (c) => c.cidade || "-" },
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
                  <IconAction
                    icon={Eye}
                    label="Visualizar"
                    variant="secondary"
                    onClick={() => setVisualizando(c)}
                  />
                  <IconAction
                    icon={Pencil}
                    label="Editar"
                    variant="primary"
                    onClick={() => setModal(c)}
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

      {modal === "novo" && (
        <ClienteFormModal onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== "novo" && (
        <ClienteFormModal cliente={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}

      {visualizando && (
        <ClienteViewModal cliente={visualizando} onClose={() => setVisualizando(null)} />
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
