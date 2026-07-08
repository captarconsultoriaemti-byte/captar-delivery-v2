"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { useToast } from "@/components/ui/toast";
import { createCombo, updateCombo } from "@/lib/actions/combos";
import { calcularPrecoFinal } from "@/lib/utils/desconto";

interface Produto {
  id: string;
  nome: string;
  preco: number;
}

interface ComboItem {
  produto_id: string;
  quantidade: number;
}

export interface ComboParaEdicao {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  foto_url: string | null;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  combo_itens: { id: string; produto_id: string; quantidade: number }[];
}

interface ComboFormProps {
  produtos: Produto[];
  combo?: ComboParaEdicao;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ComboForm({ produtos, combo }: ComboFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const modoEdicao = Boolean(combo);

  const [nome, setNome] = useState(combo?.nome ?? "");
  const [descricao, setDescricao] = useState(combo?.descricao ?? "");
  const [ativo, setAtivo] = useState(combo?.ativo ?? true);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(combo?.foto_url ?? null);
  const [itens, setItens] = useState<ComboItem[]>(
    combo?.combo_itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })) ?? [
      { produto_id: "", quantidade: 1 },
      { produto_id: "", quantidade: 1 },
    ],
  );
  const [temDesconto, setTemDesconto] = useState(combo?.tem_desconto ?? false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">(
    combo?.desconto_tipo ?? "percentual",
  );
  const [descontoValor, setDescontoValor] = useState(
    combo?.desconto_valor ? String(combo.desconto_valor) : "",
  );
  const [saving, setSaving] = useState(false);

  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));

  const somaProdutos = useMemo(
    () =>
      itens.reduce((soma, item) => {
        const produto = produtoPorId.get(item.produto_id);
        return soma + (produto ? produto.preco * item.quantidade : 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, produtos],
  );

  const precoFinal = calcularPrecoFinal(somaProdutos, {
    tem_desconto: temDesconto,
    desconto_tipo: descontoTipo,
    desconto_valor: Number(descontoValor) || 0,
  });

  function adicionarItem() {
    setItens((prev) => [...prev, { produto_id: "", quantidade: 1 }]);
  }

  function atualizarItem(index: number, campo: keyof ComboItem, valor: string | number) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFotoChange(file: File | null) {
    setFoto(file);
    setFotoPreview(file ? URL.createObjectURL(file) : combo?.foto_url ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const itensValidos = itens.filter((i) => i.produto_id);
    if (itensValidos.length < 2) {
      showToast("error", "Um combo precisa de no mínimo 2 produtos.");
      return;
    }

    if (temDesconto && descontoTipo === "percentual") {
      const percentual = Number(descontoValor);
      if (!percentual || percentual <= 0 || percentual > 100) {
        showToast("error", "Informe um percentual de desconto entre 1 e 100.");
        return;
      }
    }

    setSaving(true);

    const input = {
      nome,
      descricao,
      ativo,
      itens: itensValidos,
      temDesconto,
      descontoTipo,
      descontoValor: Number(descontoValor) || 0,
      foto,
    };
    const result = modoEdicao ? await updateCombo(combo!.id, input) : await createCombo(input);

    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", modoEdicao ? "Combo atualizado." : "Combo criado.");
    router.push("/empresa/combos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nome do Combo</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Combo ativo
          </label>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
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
                  alt="Preview do combo"
                  className="h-16 w-16 rounded object-cover"
                />
              )}
            </div>
          </div>

          <div className="sm:col-span-2 rounded-md border border-secondary/40 p-4">
            <p className="mb-2 text-xs font-medium text-secondary">
              Produtos do combo (mínimo 2)
            </p>
            {itens.map((item, index) => (
              <div key={index} className="mb-2 flex items-center gap-2">
                <select
                  required
                  value={item.produto_id}
                  onChange={(e) => atualizarItem(index, "produto_id", e.target.value)}
                  className="flex-1 rounded-md border border-secondary/55 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value))}
                  className="w-16 rounded-md border border-secondary/55 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <IconAction
                  icon={X}
                  label="Remover"
                  variant="danger"
                  disabled={itens.length <= 2}
                  onClick={() => removerItem(index)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={adicionarItem}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Adicionar produto
            </button>
          </div>

          <div className="sm:col-span-2 rounded-md border border-secondary/40 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-secondary">Soma dos produtos</span>
              <span className="font-semibold">{formatarMoeda(somaProdutos)}</span>
            </div>

            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={temDesconto}
                onChange={(e) => setTemDesconto(e.target.checked)}
              />
              Este combo tem desconto?
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
                    {descontoTipo === "percentual" ? "Percentual" : "Valor do desconto (R$)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={descontoTipo === "percentual" ? "1" : "0.01"}
                    max={descontoTipo === "percentual" ? 100 : undefined}
                    value={descontoValor}
                    onChange={(e) => setDescontoValor(e.target.value)}
                    placeholder={descontoTipo === "percentual" ? "Ex: 15" : "Ex: 5,00"}
                    className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-secondary/40 pt-3 text-sm">
              <span className="font-medium">Valor final do combo</span>
              <span className="text-lg font-bold text-primary">{formatarMoeda(precoFinal)}</span>
            </div>
            <p className="mt-1 text-xs text-secondary">
              Esse valor é calculado automaticamente pela soma dos produtos. Pra mudar o preço,
              ajuste o preço dos produtos no Cardápio ou o desconto acima.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/empresa/combos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
