import { getCurrentProfile } from "@/lib/auth";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Meu perfil</h1>
      <div className="max-w-sm rounded-lg border border-secondary/15 bg-white p-6">
        <p className="mb-4 text-sm text-secondary">
          E-mail: <span className="font-medium text-foreground">{profile?.email}</span>
        </p>
        <PerfilClient />
      </div>
    </div>
  );
}
