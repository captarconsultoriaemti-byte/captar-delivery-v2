import { redirect } from "next/navigation";
import { getCurrentEmpresa, getCurrentProfile } from "@/lib/auth";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { AlterarSenhaForm } from "@/components/shared/alterar-senha-form";

export default async function EmpresaPerfilPage() {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const profile = await getCurrentProfile();
  const empresa = profile?.empresa_id ? await getCurrentEmpresa(profile.empresa_id) : null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Meu perfil</h1>
      <div className="max-w-sm rounded-lg border border-secondary/40 bg-white p-6">
        <p className="mb-1 text-sm text-secondary">
          Empresa: <span className="font-medium text-foreground">{empresa?.nome}</span>
        </p>
        <p className="mb-4 text-sm text-secondary">
          E-mail: <span className="font-medium text-foreground">{profile?.email}</span>
        </p>
        <AlterarSenhaForm />
      </div>
    </div>
  );
}
