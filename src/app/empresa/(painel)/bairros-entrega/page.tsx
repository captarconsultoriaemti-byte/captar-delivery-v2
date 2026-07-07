import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { normalizarBairro } from "@/lib/utils/endereco";
import { BairrosEntregaClient } from "./bairros-entrega-client";

export default async function BairrosEntregaPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("bairro, cidade, estado, taxa_entrega_padrao")
    .eq("id", profile!.empresa_id)
    .single();

  // se a empresa ja tem bairro cadastrado (via CEP) e ele ainda nao esta na
  // lista de bairros de entrega, cadastra ele automaticamente (usando a taxa
  // padrao como ponto de partida) pra empresa nao precisar digitar o proprio bairro
  if (empresa?.bairro) {
    const bairroNormalizado = normalizarBairro(empresa.bairro);
    const { data: jaExiste } = await supabase
      .from("bairros_entrega")
      .select("id")
      .eq("empresa_id", profile!.empresa_id)
      .eq("bairro_normalizado", bairroNormalizado)
      .maybeSingle();

    if (!jaExiste) {
      await supabase.from("bairros_entrega").insert({
        empresa_id: profile!.empresa_id,
        bairro: empresa.bairro,
        bairro_normalizado: bairroNormalizado,
        valor: empresa.taxa_entrega_padrao,
      });
    }
  }

  const { data: bairros } = await supabase
    .from("bairros_entrega")
    .select("id, bairro, valor")
    .order("bairro");

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Bairros de Entrega</h1>
      <p className="mb-6 text-sm text-secondary">
        Cadastre o valor da entrega por bairro. Se o bairro do cliente não estiver aqui, a taxa
        padrão configurada em Configurações é usada no lugar.
      </p>
      <BairrosEntregaClient
        bairros={bairros ?? []}
        cidade={empresa?.cidade ?? ""}
        estado={empresa?.estado ?? ""}
      />
    </div>
  );
}
