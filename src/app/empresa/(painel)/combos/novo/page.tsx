import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { ComboForm } from "../combo-form";

export default async function NovoComboPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, preco")
    .eq("ativo", true)
    .order("nome");

  return (
    <div>
      <BackLink href="/empresa/combos" />
      <h1 className="mb-6 text-xl font-bold">Novo Combo</h1>
      <ComboForm produtos={produtos ?? []} />
    </div>
  );
}
