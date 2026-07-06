"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { MoneyInput, reaisParaFormatado, centavosParaReais } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { createGrupoOpcional, updateGrupoOpcional } from "@/lib/actions/grupos-opcionais";

interface ItemForm {
  nome: string;
  precoAdicional: string;
}

export interface GrupoParaEdicao {
  id: string;
  nome: string;
  obrigatorio: boolean;
  minimo_selecao: number;
  maximo_selecao: number;
  opcionais: { id: string; nome: string; preco_adicional: number }[];
}

interface GrupoFormModalProps {
  grupo?: GrupoParaEdicao;
  onClose: () => void;
  onSaved: () => void;
}

export function GrupoFormModal({ grupo, onClose, onSaved }: GrupoFormModalProps) {
  const { showToast } = useToast();
  const modoEdicao = Boolean(grupo);

  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [obrigatorio, setObrigatorio] = useState(grupo?.obrigatorio ?? false);
  const [minimoSelecao, setMinimoSelecao] = useState(String(grupo?.minimo_selecao ?? 0));
  const [maximoSelecao, setMaximoSelecao] = useState(String(grupo?.maximo_selecao ?? 1));
  const [itens, setItens] = useState<ItemForm[]>(
    grupo?.opcionais.map((o) => ({
      nome: o.nome,
      precoAdicional: reaisParaFormatado(o.preco_adicional),
    })) ?? [{ nome: "", precoAdicional: "0,00" }],
  );
  const [saving, setSaving] = useState(false);

  function adicionarItem() {
    setItens((prev) => [...prev, { nome: "", precoAdicional: "0,00" }]);
  }

  function atualizarItem(index: number, campo: keyof ItemForm, valor: string) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const itensValidos = itens
      .filter((i) => i.nome.trim() !== "")
      .map((i) => ({ nome: i.nome, preco_adicional: centavosParaReais(i.precoAdicional) }));

    if (itensValidos.length === 0) {
      showToast("error", "Adicione pelo menos um item ao grupo.");
      return;
    }

    if (obrigatorio && (Number(minimoSelecao) || 0) < 1) {
      showToast("error", "Um grupo obrigatório precisa de no mínimo 1 escolha.");
      return;
    }

    setSaving(true);

    const input = {
      nome,
      obrigatorio,
      minimoSelecao: Number(minimoSelecao) || 0,
      maximoSelecao: Number(maximoSelecao) || 0,
      itens: itensValidos,
    };

    const result = modoEdicao
      ? await updateGrupoOpcional(grupo!.id, input)
      : await createGrupoOpcional(input);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", modoEdicao ? "Grupo atualizado." : "Grupo criado.");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl"
      >
        <div className="shrink-0 p-6 pb-2">
          <h2 className="text-lg font-semibold">
            {modoEdicao ? "Editar Grupo de Adicionais" : "Novo Grupo de Adicionais"}
          </h2>
        </div>

        <div className="overflow-y-auto px-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Nome do grupo</label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Adicionais de Hambúrguer"
                className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={obrigatorio}
                onChange={(e) => {
                  const marcado = e.target.checked;
                  setObrigatorio(marcado);
                  if (marcado && (Number(minimoSelecao) || 0) < 1) {
                    setMinimoSelecao("1");
                  }
                }}
              />
              Obrigatório (o cliente precisa escolher algo desse grupo)
            </label>

            <div>
              <label className="mb-1 block text-sm font-medium">Mínimo de escolhas</label>
              <input
                type="number"
                min={obrigatorio ? "1" : "0"}
                value={minimoSelecao}
                onChange={(e) => setMinimoSelecao(e.target.value)}
                className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {obrigatorio && (
                <p className="mt-1 text-xs text-secondary">
                  Grupo obrigatório precisa de no mínimo 1 escolha.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Máximo de escolhas</label>
              <input
                type="number"
                min="0"
                value={maximoSelecao}
                onChange={(e) => setMaximoSelecao(e.target.value)}
                className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-danger">Deixe ZERO para não ter limite máximo.</p>
            </div>

            <div className="col-span-2 rounded-md border border-secondary/40 p-3">
              <p className="mb-2 text-xs font-medium text-secondary">
                Itens do grupo (deixe o preço em 0,00 para um item grátis)
              </p>
              {itens.map((item, index) => (
                <div key={index} className="mb-2 flex items-center gap-2">
                  <input
                    value={item.nome}
                    onChange={(e) => atualizarItem(index, "nome", e.target.value)}
                    placeholder="Ex: Bacon"
                    className="flex-1 rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="w-28">
                    <MoneyInput
                      value={item.precoAdicional}
                      onChange={(valor) => atualizarItem(index, "precoAdicional", valor)}
                    />
                  </div>
                  <IconAction
                    icon={X}
                    label="Remover"
                    variant="danger"
                    onClick={() => removerItem(index)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={adicionarItem}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Adicionar item
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex shrink-0 justify-end gap-2 border-t border-secondary/40 p-6 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
