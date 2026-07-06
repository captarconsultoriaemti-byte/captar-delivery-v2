import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { calcularPrecoOriginal } from "@/lib/utils/desconto";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VisualizarComboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: combo } = await supabase
    .from("combos")
    .select("*, combo_itens(id, produto_id, quantidade, produtos(nome))")
    .eq("id", id)
    .single();

  if (!combo) notFound();

  const tarja =
    combo.tem_desconto && combo.desconto_tipo
      ? combo.desconto_tipo === "percentual"
        ? `-${combo.desconto_valor}%`
        : `-${formatarMoeda(combo.desconto_valor ?? 0)}`
      : null;

  return (
    <div className="max-w-2xl">
      <BackLink href="/empresa/combos" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">{combo.nome}</h1>
        <Link href={`/empresa/combos/${combo.id}/editar`}>
          <Button className="flex items-center gap-2">
            <Pencil size={16} />
            Editar
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-6">
        <div className="mb-4 flex items-center gap-4">
          <ProdutoThumbnail fotoUrl={combo.foto_url} nome={combo.nome} />
          <div>
            {combo.tem_desconto && (
              <p className="text-sm text-secondary line-through">
                {formatarMoeda(
                  calcularPrecoOriginal(combo.preco, {
                    tem_desconto: combo.tem_desconto,
                    desconto_tipo: combo.desconto_tipo,
                    desconto_valor: combo.desconto_valor,
                  }),
                )}
              </p>
            )}
            <p className="text-2xl font-bold text-primary">
              {formatarMoeda(combo.preco)}
              {tarja && (
                <span className="ml-2 rounded bg-danger/15 px-2 py-0.5 text-sm font-semibold text-danger">
                  {tarja}
                </span>
              )}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                combo.ativo ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"
              }`}
            >
              {combo.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>

        <p className="mb-1 text-xs text-secondary">Descrição</p>
        <p className="mb-4 text-sm">{combo.descricao || "-"}</p>

        <p className="mb-1 text-xs text-secondary">Produtos do combo</p>
        <ul className="text-sm">
          {(combo.combo_itens as { quantidade: number; produtos: { nome: string } | null }[]).map(
            (item, index) => (
              <li key={index} className="border-b border-secondary/30 py-1.5">
                {item.quantidade}x {item.produtos?.nome ?? "?"}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
