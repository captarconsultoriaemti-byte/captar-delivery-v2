"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { solicitarCancelamentoPedido } from "@/lib/actions/loja";
import { MOTIVOS_CANCELAMENTO } from "@/lib/utils/cancelamento";

export function CancelamentoControls({
  slug,
  pedidoId,
  etapa,
  cancelamentoSolicitado,
}: {
  slug: string;
  pedidoId: string;
  etapa: string;
  cancelamentoSolicitado: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_CANCELAMENTO[0]);
  const [loading, setLoading] = useState(false);

  if (etapa !== "novo") return null;

  if (cancelamentoSolicitado) {
    return (
      <div>
        <div className="mt-3 rounded-md bg-danger/10 p-3 text-center text-sm font-semibold text-danger">
          Cancelamento solicitado, aguardando confirmação da loja.
        </div>
        <div className="mt-3 text-center">
          <Link
            href={`/loja/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Home size={16} />
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  async function handleConfirmar() {
    setLoading(true);
    const result = await solicitarCancelamentoPedido(slug, pedidoId, motivo);
    setLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setAberto(false);
    showToast("success", "Cancelamento solicitado.");
    router.refresh();
  }

  return (
    <>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="text-xs font-medium text-danger hover:underline"
        >
          Solicitar cancelamento
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Solicitar cancelamento</h2>
            <p className="mt-2 text-sm text-secondary">
              A loja vai receber seu pedido de cancelamento e confirmar em seguida.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Motivo</label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {MOTIVOS_CANCELAMENTO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAberto(false)}>
                Voltar
              </Button>
              <Button variant="danger" onClick={handleConfirmar} disabled={loading}>
                {loading ? "Enviando..." : "Confirmar solicitação"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
