"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, MessageCircle, Plus, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoneyInput, reaisParaFormatado, centavosParaReais } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import {
  updateConfiguracoes,
  atualizarPausaManual,
  atualizarImpressaoAutomatica,
} from "@/lib/actions/configuracoes";
import { validarHorarioFuncionamento, type HorarioDia } from "@/lib/utils/horario";
import { listarImpressoras } from "@/lib/qz";

interface ConfiguracoesClientProps {
  podeCompartilharLink: boolean;
  pausaManual: boolean;
  impressaoAutomatica: boolean;
  impressoraAutomatica: string | null;
  slug: string;
  taxaEntregaPadrao: number;
  tempoMedioEntrega: string;
  tempoEstimadoPreparo: number;
  mensagemAgradecimento: string;
  horarioFuncionamento: HorarioDia[];
  opcionaisHabilitados: boolean;
}

export function ConfiguracoesClient({
  podeCompartilharLink,
  pausaManual,
  impressaoAutomatica,
  impressoraAutomatica,
  slug: slugSalvo,
  taxaEntregaPadrao,
  tempoMedioEntrega,
  tempoEstimadoPreparo,
  mensagemAgradecimento,
  horarioFuncionamento,
  opcionaisHabilitados,
}: ConfiguracoesClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [taxaEntrega, setTaxaEntrega] = useState(reaisParaFormatado(taxaEntregaPadrao));
  const [tempoMedio, setTempoMedio] = useState(tempoMedioEntrega);
  const [tempoPreparo, setTempoPreparo] = useState(String(tempoEstimadoPreparo || ""));
  const [mensagem, setMensagem] = useState(mensagemAgradecimento);
  const [horarios, setHorarios] = useState<HorarioDia[]>(horarioFuncionamento);
  const [opcionaisAtivos, setOpcionaisAtivos] = useState(opcionaisHabilitados);
  const [saving, setSaving] = useState(false);
  const [pausada, setPausada] = useState(pausaManual);
  const [alterandoPausa, setAlterandoPausa] = useState(false);
  const [confirmandoPausa, setConfirmandoPausa] = useState(false);

  const [autoAtiva, setAutoAtiva] = useState(impressaoAutomatica);
  const [impressoraEscolhida, setImpressoraEscolhida] = useState(impressoraAutomatica ?? "");
  const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<string[]>(
    impressoraAutomatica ? [impressoraAutomatica] : [],
  );
  const [detectando, setDetectando] = useState(false);
  const [salvandoAuto, setSalvandoAuto] = useState(false);
  const [confirmandoAuto, setConfirmandoAuto] = useState(false);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // window só existe no cliente; não dá pra derivar isso durante o render por causa do SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const linkCardapio = origin && slugSalvo ? `${origin}/loja/${slugSalvo}` : "";

  function atualizarAtivo(index: number, ativo: boolean) {
    setHorarios((prev) => prev.map((h, i) => (i === index ? { ...h, ativo } : h)));
  }

  function atualizarTurno(
    diaIndex: number,
    turnoIndex: number,
    campo: "abre" | "fecha",
    valor: string,
  ) {
    setHorarios((prev) =>
      prev.map((h, i) =>
        i === diaIndex
          ? {
              ...h,
              turnos: h.turnos.map((t, ti) => (ti === turnoIndex ? { ...t, [campo]: valor } : t)),
            }
          : h,
      ),
    );
  }

  function adicionarTurno(diaIndex: number) {
    setHorarios((prev) =>
      prev.map((h, i) =>
        i === diaIndex ? { ...h, turnos: [...h.turnos, { abre: null, fecha: null }] } : h,
      ),
    );
  }

  function removerTurno(diaIndex: number, turnoIndex: number) {
    setHorarios((prev) =>
      prev.map((h, i) =>
        i === diaIndex ? { ...h, turnos: h.turnos.filter((_, ti) => ti !== turnoIndex) } : h,
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const erroHorario = validarHorarioFuncionamento(horarios);
    if (erroHorario) {
      showToast("error", erroHorario);
      return;
    }

    setSaving(true);

    const result = await updateConfiguracoes({
      taxaEntregaPadrao: centavosParaReais(taxaEntrega),
      tempoMedioEntrega: tempoMedio,
      tempoEstimadoPreparo: Number(tempoPreparo) || 0,
      mensagemAgradecimento: mensagem,
      horarioFuncionamento: horarios,
      opcionaisHabilitados: opcionaisAtivos,
    });

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Configurações salvas com sucesso.");
    router.refresh();
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkCardapio);
    showToast("success", "Link copiado.");
  }

  function enviarPeloWhatsapp() {
    const texto = encodeURIComponent(`Confira nosso cardápio: ${linkCardapio}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  }

  async function handleAlterarPausa() {
    setAlterandoPausa(true);
    const result = await atualizarPausaManual(!pausada);
    setAlterandoPausa(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setPausada(!pausada);
    setConfirmandoPausa(false);
    showToast("success", !pausada ? "Loja fechada." : "Loja reaberta.");
    router.refresh();
  }

  async function handleDetectarImpressoras() {
    setDetectando(true);
    const result = await listarImpressoras();
    setDetectando(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setImpressorasDisponiveis(result.impressoras ?? []);
    if (!impressoraEscolhida && result.impressoras?.[0]) {
      setImpressoraEscolhida(result.impressoras[0]);
    }
    showToast("success", `${result.impressoras?.length ?? 0} impressora(s) encontrada(s).`);
  }

  async function handleAlterarImpressaoAutomatica() {
    const novoValor = !autoAtiva;

    if (novoValor && !impressoraEscolhida) {
      showToast("error", "Detecte e selecione uma impressora antes de ativar.");
      setConfirmandoAuto(false);
      return;
    }

    setSalvandoAuto(true);
    const result = await atualizarImpressaoAutomatica(
      novoValor,
      novoValor ? impressoraEscolhida : impressoraEscolhida || null,
    );
    setSalvandoAuto(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setAutoAtiva(novoValor);
    setConfirmandoAuto(false);
    showToast("success", novoValor ? "Impressão automática ativada." : "Impressão automática desativada.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        className={`rounded-lg border p-6 ${
          pausada ? "border-danger/30 bg-danger/5" : "border-secondary/40 bg-white"
        }`}
      >
        <h2 className="mb-1 text-sm font-semibold">
          {pausada ? "Loja fechada manualmente" : "Pausar loja"}
        </h2>
        <p className="mb-4 text-xs text-secondary">
          {pausada
            ? "Sua loja não está recebendo pedidos pelo link, mesmo dentro do horário de funcionamento. Reabra quando quiser voltar a vender."
            : "Feche a loja rapidamente em caso de imprevisto (sem mexer no horário de funcionamento cadastrado)."}
        </p>
        <Button
          type="button"
          variant={pausada ? "success" : "danger"}
          onClick={() => setConfirmandoPausa(true)}
          disabled={alterandoPausa}
        >
          {alterandoPausa ? "Salvando..." : pausada ? "Reabrir loja" : "Fechar loja agora"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmandoPausa}
        title={pausada ? "Reabrir a loja?" : "Fechar a loja agora?"}
        description={
          pausada
            ? "A loja volta a receber pedidos pelo link normalmente."
            : "A loja para de receber pedidos pelo link até você reabrir manualmente."
        }
        confirmLabel={pausada ? "Reabrir loja" : "Fechar loja"}
        destructive={!pausada}
        loading={alterandoPausa}
        onConfirm={handleAlterarPausa}
        onCancel={() => setConfirmandoPausa(false)}
      />

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold">Impressão de pedidos</h2>
        <p className="mb-4 text-xs text-secondary">
          Por padrão, a impressão é <strong>manual</strong>: o sistema pergunta se quer imprimir a
          cada pedido. Ative a impressão automática pra imprimir direto na impressora térmica, sem
          perguntar. Isso exige o programa{" "}
          <a
            href="https://qz.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            QZ Tray
          </a>{" "}
          instalado e aberto neste computador, com a impressora conectada.
        </p>

        <div className="mb-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDetectarImpressoras}
            disabled={detectando}
            className="flex items-center gap-2"
          >
            <Printer size={16} />
            {detectando ? "Procurando impressoras..." : "Detectar impressoras"}
          </Button>
        </div>

        {impressorasDisponiveis.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Impressora</label>
            <select
              value={impressoraEscolhida}
              onChange={(e) => setImpressoraEscolhida(e.target.value)}
              className="w-full max-w-sm rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {impressorasDisponiveis.map((imp) => (
                <option key={imp} value={imp}>
                  {imp}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="button"
          variant={autoAtiva ? "secondary" : "primary"}
          onClick={() => setConfirmandoAuto(true)}
          disabled={salvandoAuto}
        >
          {salvandoAuto
            ? "Salvando..."
            : autoAtiva
              ? "Desativar impressão automática"
              : "Ativar impressão automática"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmandoAuto}
        title={autoAtiva ? "Desativar impressão automática?" : "Ativar impressão automática?"}
        description={
          autoAtiva
            ? "Os pedidos voltam a perguntar antes de imprimir."
            : `Os pedidos serão impressos automaticamente na impressora "${impressoraEscolhida}", sem perguntar.`
        }
        confirmLabel={autoAtiva ? "Desativar" : "Ativar"}
        loading={salvandoAuto}
        onConfirm={handleAlterarImpressaoAutomatica}
        onCancel={() => setConfirmandoAuto(false)}
      />

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">Operação</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Taxa de entrega padrão <span className="text-danger">*</span>
            </label>
            <MoneyInput required value={taxaEntrega} onChange={setTaxaEntrega} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tempo médio de entrega <span className="text-danger">*</span>
            </label>
            <input
              required
              value={tempoMedio}
              onChange={(e) => setTempoMedio(e.target.value)}
              placeholder="Ex: 40 a 60 min"
              className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Tempo estimado de entrega/preparo (minutos) <span className="text-danger">*</span>
            </label>
            <input
              required
              type="number"
              min="0"
              value={tempoPreparo}
              onChange={(e) => setTempoPreparo(e.target.value)}
              className="w-full max-w-xs rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-secondary">
              Usado para calcular a previsão do pedido e destacar pedidos atrasados.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold">Funcionamento</h2>
        <p className="mb-4 text-xs text-secondary">
          Informe os dias e horários em que seu estabelecimento atende.
        </p>
        <div className="flex flex-col gap-2">
          {horarios.map((horario, diaIndex) => (
            <div
              key={horario.dia}
              className="flex flex-col gap-2 rounded-md border border-secondary/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={horario.ativo}
                    onChange={(e) => atualizarAtivo(diaIndex, e.target.checked)}
                  />
                  {horario.dia}
                </label>
                {horario.ativo && (
                  <button
                    type="button"
                    onClick={() => adicionarTurno(diaIndex)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus size={13} />
                    Adicionar turno
                  </button>
                )}
              </div>

              {horario.ativo &&
                horario.turnos.map((turno, turnoIndex) => (
                  <div key={turnoIndex} className="ml-6 flex items-center gap-2 text-sm">
                    <span className="text-secondary">Abre</span>
                    <input
                      type="time"
                      value={turno.abre ?? ""}
                      onChange={(e) =>
                        atualizarTurno(diaIndex, turnoIndex, "abre", e.target.value)
                      }
                      className="rounded-md border border-secondary/55 px-2 py-1 text-sm"
                    />
                    <span className="text-secondary">Fecha</span>
                    <input
                      type="time"
                      value={turno.fecha ?? ""}
                      onChange={(e) =>
                        atualizarTurno(diaIndex, turnoIndex, "fecha", e.target.value)
                      }
                      className="rounded-md border border-secondary/55 px-2 py-1 text-sm"
                    />
                    {horario.turnos.length > 1 && (
                      <IconAction
                        icon={X}
                        label="Remover turno"
                        variant="danger"
                        onClick={() => removerTurno(diaIndex, turnoIndex)}
                      />
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">Comprovante</h2>
        <label className="mb-1 block text-sm font-medium">
          Mensagem de agradecimento <span className="text-danger">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold">Opcionais</h2>
        <p className="mb-3 text-xs text-secondary">
          Controla se a pergunta de opcionais (Salada, Sobremesa, Fritas, etc.) aparece na hora de
          montar um pedido, para produtos que tiverem opcionais cadastrados.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={opcionaisAtivos}
            onChange={(e) => setOpcionaisAtivos(e.target.checked)}
          />
          Perguntar opcionais no momento da venda
        </label>
      </div>

      {podeCompartilharLink && (
        <div className="rounded-lg border border-secondary/40 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold">Link do cardápio</h2>
          <p className="mb-4 text-xs text-secondary">
            O endereço do seu cardápio público é definido pelo Admin Master. Compartilhe com seus
            clientes pelos botões abaixo.
          </p>

          {linkCardapio ? (
            <>
              <label className="mb-1 block text-sm font-medium">Link público</label>
              <input
                readOnly
                value={linkCardapio}
                className="mb-3 w-full rounded-md border border-secondary/55 bg-secondary/5 px-3 py-2 text-sm text-secondary"
              />
              <div className="flex flex-wrap gap-2">
                <IconAction icon={Copy} label="Copiar link" variant="secondary" onClick={copiarLink} />
                <IconAction
                  icon={ExternalLink}
                  label="Abrir cardápio"
                  variant="secondary"
                  onClick={() => window.open(linkCardapio, "_blank")}
                />
                <IconAction
                  icon={MessageCircle}
                  label="Enviar pelo WhatsApp"
                  variant="success"
                  onClick={enviarPeloWhatsapp}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-secondary">
              Seu link ainda não foi configurado. Fale com o suporte pra que seja definido.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
