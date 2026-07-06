import { redirect } from "next/navigation";
import { getCurrentEmpresa, getCurrentProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui/logout-button";

const mensagemPorStatus: Record<string, string> = {
  suspended: "Sua conta esta suspensa. Fale com o suporte da CAPTAR para regularizar o acesso.",
  cancelled: "Sua conta foi cancelada. Fale com o suporte da CAPTAR para mais informacoes.",
};

export default async function EmpresaBloqueadaPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "empresa" || !profile.empresa_id) {
    redirect("/empresa/login");
  }

  const empresa = await getCurrentEmpresa(profile.empresa_id);

  if (!empresa || empresa.status === "active" || empresa.status === "trial") {
    redirect("/empresa/categorias");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-md">
        <h1 className="mb-2 text-lg font-bold text-danger">Acesso bloqueado</h1>
        <p className="mb-6 text-sm text-secondary">
          {mensagemPorStatus[empresa.status] ?? "Seu acesso esta indisponivel no momento."}
        </p>
        <LogoutButton redirectTo="/empresa/login" />
      </div>
    </div>
  );
}
