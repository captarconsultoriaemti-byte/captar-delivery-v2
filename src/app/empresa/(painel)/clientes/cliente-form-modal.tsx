"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/components/ui/toast";
import { X } from "lucide-react";
import { maskWhatsapp, maskCep, maskCpfCnpj } from "@/lib/utils/masks";
import {
  buscarCidadesPorEstado,
  buscarEnderecoPorCep,
  buscarEstados,
  type Cidade,
  type Estado,
} from "@/lib/utils/endereco";
import { createCliente, updateCliente, type ClienteCriado } from "@/lib/actions/clientes";

export interface ClienteParaEdicao {
  id: string;
  nome: string;
  whatsapp: string | null;
  cpf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  ativo: boolean;
}

interface ClienteFormModalProps {
  cliente?: ClienteParaEdicao;
  nomeInicial?: string;
  onClose: () => void;
  onSaved: (clienteCriado?: ClienteCriado) => void;
}

const inputClass =
  "w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none";

function Field({
  label,
  fullWidth = false,
  children,
}: {
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function ClienteFormModal({
  cliente,
  nomeInicial,
  onClose,
  onSaved,
}: ClienteFormModalProps) {
  const { showToast } = useToast();
  const modoEdicao = Boolean(cliente);

  const [nome, setNome] = useState(cliente?.nome ?? nomeInicial ?? "");
  const [whatsapp, setWhatsapp] = useState(maskWhatsapp(cliente?.whatsapp ?? ""));
  const [cpf, setCpf] = useState(maskCpfCnpj(cliente?.cpf ?? ""));
  const [cep, setCep] = useState(maskCep(cliente?.cep ?? ""));
  const [logradouro, setLogradouro] = useState(cliente?.logradouro ?? "");
  const [numero, setNumero] = useState(cliente?.numero ?? "");
  const [complemento, setComplemento] = useState(cliente?.complemento ?? "");
  const [bairro, setBairro] = useState(cliente?.bairro ?? "");
  const [cidade, setCidade] = useState(cliente?.cidade ?? "");
  const [estado, setEstado] = useState(cliente?.estado ?? "");
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const [semCep, setSemCep] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);

  useEffect(() => {
    if (semCep) {
      buscarEstados().then(setEstados);
    }
  }, [semCep]);

  useEffect(() => {
    if (semCep && estado) {
      buscarCidadesPorEstado(estado).then(setCidades);
    }
  }, [semCep, estado]);

  async function handleCepBlur() {
    if (semCep) return;
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setBuscandoCep(true);
    const endereco = await buscarEnderecoPorCep(digits);
    setBuscandoCep(false);

    if (!endereco) {
      showToast("error", "CEP não encontrado. Confira o número ou preencha manualmente.");
      return;
    }

    setLogradouro(endereco.logradouro);
    setBairro(endereco.bairro);
    setCidade(endereco.localidade);
    setEstado(endereco.uf);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.set("nome", nome);
    formData.set("whatsapp", whatsapp);
    formData.set("cpf", cpf);
    formData.set("cep", cep);
    formData.set("logradouro", logradouro);
    formData.set("numero", numero);
    formData.set("complemento", complemento);
    formData.set("bairro", bairro);
    formData.set("cidade", cidade);
    formData.set("estado", estado);
    formData.set("observacoes", observacoes);

    const result = modoEdicao
      ? await updateCliente(cliente!.id, formData)
      : await createCliente(formData);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", modoEdicao ? "Cliente atualizado." : "Cliente cadastrado.");
    onSaved(modoEdicao ? undefined : (result.data as ClienteCriado));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between p-6 pb-2">
          <h2 className="text-lg font-semibold">
            {modoEdicao ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <IconAction icon={X} label="Fechar" onClick={onClose} />
        </div>

        <form
          id="form-cliente"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-2"
        >
          <Field label="Nome">
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="WhatsApp">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </Field>

          <Field label="CPF/CNPJ">
            <input
              value={cpf}
              onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
              placeholder="CPF ou CNPJ"
              className={inputClass}
            />
          </Field>

          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={semCep}
              onChange={(e) => setSemCep(e.target.checked)}
            />
            Não sei o CEP
          </label>

          <Field label="CEP">
            <input
              disabled={semCep}
              value={cep}
              onChange={(e) => setCep(maskCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className={inputClass}
            />
            {buscandoCep && <p className="mt-1 text-xs text-secondary">Buscando endereço...</p>}
          </Field>

          <Field label="Logradouro">
            <input
              disabled={!semCep}
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Número">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Complemento">
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Bairro">
            <input
              disabled={!semCep}
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Estado">
            {semCep ? (
              <Combobox
                options={estados.map((e) => ({ value: e.sigla, label: `${e.nome} (${e.sigla})` }))}
                value={estado}
                onChange={(value) => {
                  setEstado(value);
                  setCidade("");
                }}
                placeholder="Selecione o estado"
              />
            ) : (
              <input disabled value={estado} placeholder="UF" className={inputClass} />
            )}
          </Field>

          <Field label="Cidade">
            {semCep ? (
              <Combobox
                options={cidades.map((c) => ({ value: c.nome, label: c.nome }))}
                value={cidade}
                onChange={setCidade}
                placeholder={estado ? "Selecione a cidade" : "Selecione o estado antes"}
                disabled={!estado}
              />
            ) : (
              <input disabled value={cidade} className={inputClass} />
            )}
          </Field>

          <Field label="Observações" fullWidth>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        </form>

        <div className="mt-2 flex shrink-0 justify-end gap-2 border-t border-secondary/40 p-6 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cliente" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
