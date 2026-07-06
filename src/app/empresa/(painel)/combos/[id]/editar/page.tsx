import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { ComboForm } from "../../combo-form";

export default async function EditarComboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: combo }, { data: produtos }] = await Promise.all([
    supabase
      .from("combos")
      .select("*, combo_itens(id, produto_id, quantidade)")
      .eq("id", id)
      .single(),
    supabase.from("produtos").select("id, nome, preco").eq("ativo", true).order("nome"),
  ]);

  if (!combo) notFound();

  return (
    <div>
      <BackLink href="/empresa/combos" />
      <h1 className="mb-6 text-xl font-bold">Editar Combo</h1>
      <ComboForm produtos={produtos ?? []} combo={combo} />
    </div>
  );
}
