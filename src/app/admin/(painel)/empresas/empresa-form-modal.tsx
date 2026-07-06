"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { PasswordInput } from "@/components/ui/password-input";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/components/ui/toast";
import { maskCnpj, maskWhatsapp, maskCep } from "@/lib/utils/masks";
import {
  buscarCidadesPorEstado,
  buscarEnderecoPorCep,
  buscarEstados,
  type Cidade,
  type Estado,
} from "@/lib/utils/endereco";
import { createEmpresa, updateEmpresa } from "@/lib/actions/empresas";
import { slugify } from "@/lib/utils/slug";

interface TipoEstabelecimento {
  id: string;
  nome: string;
}

export interface EmpresaParaEdicao {
  id: string;
  nome: string;
  email: string;
  slug: string | null;
  tipo_estabelecimento_id: string | null;
  cnpj: string | null;
  nome_responsavel: string | null;
  whatsapp: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
}

interface EmpresaFormModalProps {
  tipos: TipoEstabelecimento[];
  empresa?: EmpresaParaEdicao;
  onClose: () => void;
  onSaved: () => void;
}

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

const inputClass =
  "w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-secondary/10";

export function EmpresaFormModal({ tipos, empresa, onClose, onSaved }: EmpresaFormModalProps) {
  const { showToast } = useToast();
  const modoEdicao = Boolean(empresa);

  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [slug, setSlug] = useState(empresa?.slug ?? "");
  const [tipoId, setTipoId] = useState(empresa?.tipo_estabelecimento_id ?? "");
  const [cnpj, setCnpj] = useState(maskCnpj(empresa?.cnpj ?? ""));
  const [nomeResponsavel, setNomeResponsavel] = useState(empresa?.nome_responsavel ?? "");
  const [whatsapp, setWhatsapp] = useState(maskWhatsapp(empresa?.whatsapp ?? ""));
  const [email, setEmail] = useState(empresa?.email ?? "");
  const [senha, setSenha] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(empresa?.logo_url ?? null);

  const [semCep, setSemCep] = useState(false);
  const [cep, setCep] = useState(maskCep(empresa?.cep ?? ""));
  const [logradouro, setLogradouro] = useState(empresa?.logradouro ?? "");
  const [numero, setNumero] = useState(empresa?.numero ?? "");
  const [complemento, setComplemento] = useState(empresa?.complemento ?? "");
  const [bairro, setBairro] = useState(empresa?.bairro ?? "");
  const [cidade, setCidade] = useState(empresa?.cidade ?? "");
  const [estado, setEstado] = useState(empresa?.estado ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
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
      showToast("error", "CEP nao encontrado. Confira o numero ou preencha manualmente.");
      return;
    }

    setLogradouro(endereco.logradouro);
    setBairro(endereco.bairro);
    setCidade(endereco.localidade);
    setEstado(endereco.uf);
  }

  function handleLogoChange(file: File | null) {
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function irParaEndereco(e: FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.set("nome", nome);
    formData.set("slug", slug);
    formData.set("tipoEstabelecimentoId", tipoId);
    formData.set("cnpj", cnpj);
    formData.set("nomeResponsavel", nomeResponsavel);
    formData.set("whatsapp", whatsapp);
    formData.set("cep", cep);
    formData.set("logradouro", logradouro);
    formData.set("numero", numero);
    formData.set("complemento", complemento);
    formData.set("bairro", bairro);
    formData.set("cidade", cidade);
    formData.set("estado", estado);
    if (logo) formData.set("logo", logo);

    let result;
    if (modoEdicao && empresa) {
      result = await updateEmpresa(empresa.id, formData);
    } else {
      formData.set("email", email);
      formData.set("senha", senha);
      result = await createEmpresa(formData);
    }

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", modoEdicao ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso.");
    onSaved();
  }

  const tipoOptions = tipos.map((t) => ({ value: t.id, label: t.nome }));
  const estadoOptions = estados.map((e) => ({ value: e.sigla, label: `${e.nome} (${e.sigla})` }));
  const cidadeOptions = cidades.map((c) => ({ value: c.nome, label: c.nome }));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="shrink-0 p-6 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {modoEdicao ? "Editar Empresa" : "Nova Empresa"}
            </h2>
            <IconAction icon={X} label="Fechar" onClick={onClose} />
          </div>

          <div className="mb-6 flex border-b border-secondary/40 text-sm">
            <div
              className={`px-3 pb-2 font-medium ${
                step === 1 ? "border-b-2 border-primary text-primary" : "text-secondary"
              }`}
            >
              Dados da empresa
            </div>
            <div
              className={`px-3 pb-2 font-medium ${
                step === 2 ? "border-b-2 border-primary text-primary" : "text-secondary"
              }`}
            >
              Dados de endereço
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6">
          {step === 1 && (
            <form id="form-empresa-step1" onSubmit={irParaEndereco} className="grid grid-cols-2 gap-4">
              <Field label="Nome da Empresa" fullWidth>
                <input
                  required
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (!modoEdicao) setSlug(slugify(e.target.value));
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Link do cardápio público" fullWidth>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary">captardelivery.com.br/loja/</span>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </Field>

              <Field label="Tipo de Estabelecimento">
                <Combobox
                  options={tipoOptions}
                  value={tipoId}
                  onChange={setTipoId}
                  placeholder="Selecione ou digite"
                />
              </Field>

              <Field label="CNPJ">
                <input
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className={inputClass}
                />
              </Field>

              <Field label="Nome do Responsável">
                <input
                  required
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="WhatsApp">
                <input
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className={inputClass}
                />
              </Field>

              {!modoEdicao && (
                <>
                  <Field label="E-mail de acesso">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Senha inicial">
                    <PasswordInput
                      required
                      minLength={6}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </Field>
                </>
              )}

              <Field label="Logo (opcional)" fullWidth>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    className="flex-1 text-sm"
                  />
                  {logoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Preview da logo"
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                </div>
              </Field>
            </form>
          )}

          {step === 2 && (
            <form id="form-empresa-step2" onSubmit={handleSalvar} className="grid grid-cols-2 gap-4">
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
                  required
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
                  required
                  disabled={!semCep}
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Número">
                <input
                  required
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
                  required
                  disabled={!semCep}
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Estado">
                {semCep ? (
                  <Combobox
                    options={estadoOptions}
                    value={estado}
                    onChange={(value) => {
                      setEstado(value);
                      setCidade("");
                    }}
                    placeholder="Selecione o estado"
                  />
                ) : (
                  <input required disabled value={estado} className={inputClass} />
                )}
              </Field>

              <Field label="Cidade">
                {semCep ? (
                  <Combobox
                    options={cidadeOptions}
                    value={cidade}
                    onChange={setCidade}
                    placeholder={estado ? "Selecione a cidade" : "Selecione o estado antes"}
                    disabled={!estado}
                  />
                ) : (
                  <input required disabled value={cidade} className={inputClass} />
                )}
              </Field>
            </form>
          )}
        </div>

        <div className="mt-2 flex shrink-0 justify-between border-t border-secondary/40 p-6 pt-4">
          {step === 2 ? (
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Voltar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {step === 2 && (
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            )}
            {step === 1 ? (
              <Button type="submit" form="form-empresa-step1" disabled={!tipoId}>
                Próximo
              </Button>
            ) : (
              <Button type="submit" form="form-empresa-step2" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
