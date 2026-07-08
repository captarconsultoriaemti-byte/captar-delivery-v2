"use client";

import { useState, type FormEvent } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { MoneyInput, reaisParaFormatado, centavosParaReais } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { createProduto, updateProduto } from "@/lib/actions/produtos";

interface Categoria {
  id: string;
  nome: string;
}

interface GrupoOpcionalDisponivel {
  id: string;
  nome: string;
}

export interface ProdutoParaEdicao {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria_ids: string[];
  ativo: boolean;
  destaque: boolean;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  foto_url: string | null;
  grupo_ids: string[];
  itens_opcionais: string[];
}

interface ProdutoFormModalProps {
  categorias: Categoria[];
  gruposDisponiveis: GrupoOpcionalDisponivel[];
  produto?: ProdutoParaEdicao;
  onClose: () => void;
  onSaved: () => void;
}

export function ProdutoFormModal({
  categorias,
  gruposDisponiveis,
  produto,
  onClose,
  onSaved,
}: ProdutoFormModalProps) {
  const { showToast } = useToast();
  const modoEdicao = Boolean(produto);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState(produto?.nome ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [preco, setPreco] = useState(produto ? reaisParaFormatado(produto.preco) : "");
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(
    new Set(produto?.categoria_ids ?? []),
  );
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [temDesconto, setTemDesconto] = useState(produto?.tem_desconto ?? false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">(
    produto?.desconto_tipo ?? "percentual",
  );
  const [descontoPercentual, setDescontoPercentual] = useState(
    produto?.desconto_tipo === "percentual" ? String(produto.desconto_valor ?? "") : "",
  );
  const [descontoValorReais, setDescontoValorReais] = useState(
    produto?.desconto_tipo === "valor" ? reaisParaFormatado(produto.desconto_valor ?? 0) : "0,00",
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(produto?.foto_url ?? null);

  const [temItensOpcionais, setTemItensOpcionais] = useState(
    (produto?.itens_opcionais?.length ?? 0) > 0,
  );
  const [itensOpcionais, setItensOpcionais] = useState<string[]>(
    produto?.itens_opcionais?.length ? produto.itens_opcionais : [""],
  );

  const [gruposSelecionados, setGruposSelecionados] = useState<Set<string>>(
    new Set(produto?.grupo_ids ?? []),
  );

  function handleFotoChange(file: File | null) {
    setFoto(file);
    setFotoPreview(file ? URL.createObjectURL(file) : produto?.foto_url ?? null);
  }

  function adicionarItemOpcional() {
    setItensOpcionais((prev) => [...prev, ""]);
  }

  function atualizarItemOpcional(index: number, valor: string) {
    setItensOpcionais((prev) => prev.map((item, i) => (i === index ? valor : item)));
  }

  function removerItemOpcional(index: number) {
    setItensOpcionais((prev) => prev.filter((_, i) => i !== index));
  }

  function alternarCategoria(id: string, marcado: boolean) {
    setCategoriasSelecionadas((prev) => {
      const novo = new Set(prev);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarGrupo(id: string, marcado: boolean) {
    setGruposSelecionados((prev) => {
      const novo = new Set(prev);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function irParaStep2(e: FormEvent) {
    e.preventDefault();

    if (temDesconto) {
      if (descontoTipo === "percentual") {
        const percentual = Number(descontoPercentual);
        if (!percentual || percentual <= 0 || percentual >= 100) {
          showToast("error", "Informe um percentual de desconto entre 1 e 99.");
          return;
        }
      } else {
        const valorDesconto = centavosParaReais(descontoValorReais);
        const precoAtual = centavosParaReais(preco);
        if (!valorDesconto || valorDesconto <= 0) {
          showToast("error", "Informe um valor de desconto maior que zero.");
          return;
        }
        if (valorDesconto >= precoAtual) {
          showToast("error", "O valor do desconto não pode ser igual ou maior que o preço do produto.");
          return;
        }
      }
    }

    setStep(2);
  }

  function irParaStep3(e: FormEvent) {
    e.preventDefault();

    if (temItensOpcionais) {
      if (itensOpcionais.length === 0 || itensOpcionais.every((item) => !item.trim())) {
        showToast("error", "Adicione pelo menos um item opcional ou desmarque a opção.");
        return;
      }
      if (itensOpcionais.some((item) => !item.trim())) {
        showToast("error", "Preencha o nome de todos os itens opcionais ou remova os em branco.");
        return;
      }
    }

    setStep(3);
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.set("nome", nome);
    formData.set("descricao", descricao);
    formData.set("preco", String(centavosParaReais(preco)));
    formData.set("categoriaIds", JSON.stringify(Array.from(categoriasSelecionadas)));
    formData.set("ativo", String(modoEdicao ? ativo : true));
    formData.set("destaque", String(destaque));
    formData.set("temDesconto", String(temDesconto));
    formData.set("descontoTipo", descontoTipo);
    formData.set(
      "descontoValor",
      String(
        descontoTipo === "percentual"
          ? Number(descontoPercentual) || 0
          : centavosParaReais(descontoValorReais),
      ),
    );
    formData.set("grupoIds", JSON.stringify(Array.from(gruposSelecionados)));
    formData.set(
      "itensOpcionais",
      JSON.stringify(temItensOpcionais ? itensOpcionais.filter((item) => item.trim()) : []),
    );
    if (foto) formData.set("foto", foto);

    const result = modoEdicao
      ? await updateProduto(produto!.id, formData)
      : await createProduto(formData);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", modoEdicao ? "Produto atualizado." : "Produto criado.");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
        <div className="shrink-0 p-6 pb-0">
          <h2 className="mb-4 text-lg font-semibold">
            {modoEdicao ? "Editar Produto" : "Novo Produto"}
          </h2>

          <div className="mb-6 flex border-b border-secondary/40 text-sm">
            <div
              className={`px-3 pb-2 font-medium ${
                step === 1 ? "border-b-2 border-primary text-primary" : "text-secondary"
              }`}
            >
              Produto
            </div>
            <div
              className={`px-3 pb-2 font-medium ${
                step === 2 ? "border-b-2 border-primary text-primary" : "text-secondary"
              }`}
            >
              Itens Opcionais
            </div>
            <div
              className={`px-3 pb-2 font-medium ${
                step === 3 ? "border-b-2 border-primary text-primary" : "text-secondary"
              }`}
            >
              Adicionais
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6">
          {step === 1 && (
            <form id="form-produto-step1" onSubmit={irParaStep2} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Foto (opcional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)}
                    className="flex-1 text-sm"
                  />
                  {fotoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoPreview}
                      alt="Preview do produto"
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="col-span-2 rounded-md border border-secondary/40 p-3">
                <p className="mb-2 text-xs font-medium text-secondary">
                  Categorias (pode marcar mais de uma)
                </p>
                {categorias.length === 0 ? (
                  <p className="flex items-center gap-2 text-xs text-secondary">
                    <Info size={14} />
                    Nenhuma categoria cadastrada ainda.
                  </p>
                ) : (
                  categorias.map((c) => (
                    <label key={c.id} className="mb-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={categoriasSelecionadas.has(c.id)}
                        onChange={(e) => alternarCategoria(c.id, e.target.checked)}
                      />
                      {c.nome}
                    </label>
                  ))
                )}
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Preço</label>
                <MoneyInput required value={preco} onChange={setPreco} />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <textarea
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {modoEdicao && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                  />
                  Produto ativo
                </label>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={destaque}
                  onChange={(e) => setDestaque(e.target.checked)}
                />
                Produto em destaque
              </label>

              <div className="col-span-2 rounded-md border border-secondary/40 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={temDesconto}
                    onChange={(e) => setTemDesconto(e.target.checked)}
                  />
                  Este produto tem desconto?
                </label>

                {temDesconto && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Tipo de desconto</label>
                      <select
                        value={descontoTipo}
                        onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
                        className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="percentual">Porcentagem (%)</option>
                        <option value="valor">Valor em R$</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">
                        {descontoTipo === "percentual" ? "Percentual" : "Valor do desconto"}
                      </label>
                      {descontoTipo === "percentual" ? (
                        <input
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={descontoPercentual}
                          onChange={(e) => setDescontoPercentual(e.target.value)}
                          placeholder="Ex: 20"
                          className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <MoneyInput value={descontoValorReais} onChange={setDescontoValorReais} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {step === 2 && (
            <form id="form-produto-step2" onSubmit={irParaStep3} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={temItensOpcionais}
                    onChange={(e) => setTemItensOpcionais(e.target.checked)}
                  />
                  Este produto tem itens opcionais?
                </label>
                <p className="flex items-center gap-1 text-xs text-secondary">
                  <Info size={12} />
                  Os opcionais não possuem valor extra. Para valores, use os adicionais.
                </p>
              </div>

              {temItensOpcionais && (
                <div className="rounded-md border border-secondary/40 p-3">
                  {itensOpcionais.map((item, index) => (
                    <div key={index} className="mb-2 flex items-center gap-2">
                      <input
                        value={item}
                        onChange={(e) => atualizarItemOpcional(index, e.target.value)}
                        placeholder="Ex: Salada"
                        className="flex-1 rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                      />
                      <IconAction
                        icon={X}
                        label="Remover"
                        variant="danger"
                        onClick={() => removerItemOpcional(index)}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={adicionarItemOpcional}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Adicionar item
                  </button>
                </div>
              )}
            </form>
          )}

          {step === 3 && (
            <form id="form-produto-step3" onSubmit={handleSalvar}>
              <div className="rounded-md border border-secondary/40 p-3">
                <p className="mb-2 text-xs font-medium text-secondary">Grupos de adicionais</p>
                {gruposDisponiveis.length === 0 ? (
                  <p className="flex items-center gap-2 text-xs text-secondary">
                    <Info size={14} />
                    Nenhum grupo cadastrado ainda. Crie um em &quot;Grupos de Adicionais&quot; no menu.
                  </p>
                ) : (
                  gruposDisponiveis.map((grupo) => (
                    <label key={grupo.id} className="mb-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={gruposSelecionados.has(grupo.id)}
                        onChange={(e) => alternarGrupo(grupo.id, e.target.checked)}
                      />
                      {grupo.nome}
                    </label>
                  ))
                )}
              </div>
            </form>
          )}
        </div>

        <div className="mt-2 flex shrink-0 justify-between border-t border-secondary/40 p-6 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((step - 1) as 1 | 2)}
              >
                Voltar
              </Button>
            )}
            {step === 1 && (
              <Button type="submit" form="form-produto-step1">
                Próximo
              </Button>
            )}
            {step === 2 && (
              <Button type="submit" form="form-produto-step2">
                Próximo
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" form="form-produto-step3" disabled={saving}>
                {saving ? "Salvando..." : "Finalizar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
