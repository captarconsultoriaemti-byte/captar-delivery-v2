"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, CalendarPlus, Ban, PlayCircle, Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { extendTrial, updateEmpresaStatus } from "@/lib/actions/empresas";
import { EmpresaFormModal, type EmpresaParaEdicao } from "./empresa-form-modal";
import { EmpresaViewModal } from "./empresa-view-modal";

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
  const [visualizando, setVisualizando] = useState<Empresa | null>(null);
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

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<Empresa>
          rows={empresas}
          rowKey={(e) => e.id}
          columns={[
            { header: "Nome", render: (e) => e.nome },
            { header: "Tipo", render: (e) => e.tipo_estabelecimento_nome ?? "-" },
            {
              header: "Status",
              render: (e) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor[e.status]}`}>
                  {statusLabel[e.status]}
                </span>
              ),
            },
            {
              header: "Ações",
              render: (e) => (
                <div className="flex gap-1">
                  <IconAction icon={Eye} label="Visualizar" variant="secondary" onClick={() => setVisualizando(e)} />
                  <IconAction icon={Pencil} label="Editar" variant="primary" onClick={() => setModal(e)} />
                  {e.status === "trial" && (
                    <IconAction
                      icon={CalendarPlus}
                      label="Estender teste"
                      variant="primary"
                      onClick={() => handleExtendTrial(e)}
                    />
                  )}
                  {e.status === "suspended" ? (
                    <IconAction
                      icon={PlayCircle}
                      label="Reativar"
                      variant="success"
                      onClick={() => setConfirmAction({ empresa: e, novoStatus: "active" })}
                    />
                  ) : (
                    <IconAction
                      icon={Ban}
                      label="Suspender"
                      variant="danger"
                      onClick={() => setConfirmAction({ empresa: e, novoStatus: "suspended" })}
                    />
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

      {visualizando && (
        <EmpresaViewModal empresa={visualizando} onClose={() => setVisualizando(null)} />
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
