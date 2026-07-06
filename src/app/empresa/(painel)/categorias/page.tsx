import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { CategoriasClient } from "./categorias-client";
import { OnboardingModal } from "./onboarding-modal";

export default async function CategoriasPage() {
  const status = await requireOnboardingStatus();

  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .order("ordem")
    .order("nome");

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Categorias</h1>
      <CategoriasClient categorias={categorias ?? []} />
      {!status.completo && (
        <OnboardingModal temCategoria={status.temCategoria} temProduto={status.temProduto} />
      )}
    </div>
  );
}
