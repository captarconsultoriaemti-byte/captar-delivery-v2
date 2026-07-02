"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { extendTrial, updateEmpresaStatus } from "@/lib/actions/empresas";
import { EmpresaFormModal, type EmpresaParaEdicao } from "./empresa-form-modal";

interface Empresa extends EmpresaParaEdicao {
  status: "trial" | "active" | "suspended" | "cancelled";
  trial_ends_at: string;
  tipo_estabelecimento_nome?: string;
}

interface TipoEstabelecimento {
  id: string;
  nome: string;
}

const statusLabel: Record<Empresa["status"], string> = {
  trial: "Teste",
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

const statusColor: Record<Empresa["status"], string> = {
  trial: "bg-primary/15 text-primary",
  active: "bg-success/15 text-success",
  suspended: "bg-danger/15 text-danger",
  cancelled: "bg-secondary/15 text-secondary",
};

export function EmpresasClient({
  empresas,
  tipos,
}: {
  empresas: Empresa[];
  tipos: TipoEstabelecimento[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [modal, setModal] = useState<"nova" | Empresa | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    empresa: Empresa;
    novoStatus: Empresa["status"];
  } | null>(null);

  async function handleExtendTrial(empresa: Empresa) {
    const result = await extendTrial(empresa.id);
    if (result.error) {
      showToast("error", result.error);
      return;
    }
    showToast("success", `Teste de ${empresa.nome} estendido por mais 30 dias.`);
    router.refresh();
  }

  async function handleConfirmStatusChange() {
    if (!confirmAction) return;
    const { empresa, novoStatus } = confirmAction;

    const result = await updateEmpresaStatus(empresa.id, novoStatus);
    setConfirmAction(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", `Status de ${empresa.nome} atualizado.`);
    router.refresh();
  }

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal("nova")}>Nova Empresa</Button>
      </div>

      <div className="rounded-lg border border-secondary/15 bg-white p-4">
        <NumberedTable<Empresa>
          rows={empresas}
          rowKey={(e) => e.id}
          columns={[
            { header: "Nome", render: (e) => e.nome },
            { header: "Tipo", render: (e) => e.tipo_estabelecimento_nome ?? "-" },
            { header: "E-mail", render: (e) => e.email },
            {
              header: "Status",
              render: (e) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor[e.status]}`}>
                  {statusLabel[e.status]}
                </span>
              ),
            },
            {
              header: "Teste expira em",
              render: (e) => new Date(e.trial_ends_at).toLocaleDateString("pt-BR"),
            },
            {
              header: "Ações",
              render: (e) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setModal(e)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Editar
                  </button>
                  {e.status === "trial" && (
                    <button
                      onClick={() => handleExtendTrial(e)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Estender teste
                    </button>
                  )}
                  {e.status === "suspended" ? (
                    <button
                      onClick={() => setConfirmAction({ empresa: e, novoStatus: "active" })}
                      className="text-xs font-medium text-success hover:underline"
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({ empresa: e, novoStatus: "suspended" })}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Suspender
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {modal === "nova" && (
        <EmpresaFormModal tipos={tipos} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== "nova" && (
        <EmpresaFormModal
          tipos={tipos}
          empresa={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.novoStatus === "suspended"
            ? `Suspender ${confirmAction.empresa.nome}?`
            : `Reativar ${confirmAction?.empresa.nome}?`
        }
        description="Essa acao muda o acesso da empresa ao sistema imediatamente."
        confirmLabel={confirmAction?.novoStatus === "suspended" ? "Suspender" : "Reativar"}
        destructive={confirmAction?.novoStatus === "suspended"}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
