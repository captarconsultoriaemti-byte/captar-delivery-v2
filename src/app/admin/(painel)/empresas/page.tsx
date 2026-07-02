import { createClient } from "@/lib/supabase/server";
import { EmpresasClient } from "./empresas-client";

export default async function EmpresasPage() {
  const supabase = await createClient();

  const [{ data: empresas }, { data: tipos }] = await Promise.all([
    supabase.from("empresas").select("*, tipos_estabelecimento(nome)").order("created_at", {
      ascending: false,
    }),
    supabase.from("tipos_estabelecimento").select("id, nome").order("nome"),
  ]);

  const empresasComTipo = (empresas ?? []).map((empresa) => ({
    ...empresa,
    tipo_estabelecimento_nome:
      (empresa.tipos_estabelecimento as { nome: string } | null)?.nome ?? undefined,
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Empresas</h1>
      <EmpresasClient empresas={empresasComTipo} tipos={tipos ?? []} />
    </div>
  );
}
