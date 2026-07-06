import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { CombosClient } from "./combos-client";

export default async function CombosPage() {
  const status = await requireOnboardingStatus();
  if (!status.temDoisProdutos) redirect("/empresa/cardapio");

  const supabase = await createClient();

  const { data: combos } = await supabase
    .from("combos")
    .select("*, combo_itens(id, produto_id, quantidade)")
    .order("nome");

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Combos</h1>
      <CombosClient combos={combos ?? []} />
    </div>
  );
}
