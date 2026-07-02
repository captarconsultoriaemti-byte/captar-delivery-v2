import { createClient } from "@/lib/supabase/server";
import { TiposEstabelecimentoClient } from "./tipos-estabelecimento-client";

export default async function TiposEstabelecimentoPage() {
  const supabase = await createClient();

  const [{ data: tipos }, { data: empresas }] = await Promise.all([
    supabase.from("tipos_estabelecimento").select("*").order("nome"),
    supabase.from("empresas").select("tipo_estabelecimento_id"),
  ]);

  const contagemPorTipo = new Map<string, number>();
  for (const empresa of empresas ?? []) {
    if (!empresa.tipo_estabelecimento_id) continue;
    contagemPorTipo.set(
      empresa.tipo_estabelecimento_id,
      (contagemPorTipo.get(empresa.tipo_estabelecimento_id) ?? 0) + 1,
    );
  }

  const tiposComUso = (tipos ?? []).map((tipo) => ({
    ...tipo,
    emUsoPor: contagemPorTipo.get(tipo.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Tipos de Estabelecimento</h1>
      <TiposEstabelecimentoClient tipos={tiposComUso} />
    </div>
  );
}
