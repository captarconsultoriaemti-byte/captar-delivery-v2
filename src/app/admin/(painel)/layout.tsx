import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function AdminPainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin_master") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-secondary/15 bg-background-soft p-4">
        <p className="mb-6 text-lg font-bold text-primary">CAPTAR Delivery</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/admin/empresas" className="rounded-md px-3 py-2 hover:bg-secondary/10">
            Empresas
          </Link>
          <Link
            href="/admin/tipos-estabelecimento"
            className="rounded-md px-3 py-2 hover:bg-secondary/10"
          >
            Tipos de Estabelecimento
          </Link>
          <Link href="/admin/logs" className="rounded-md px-3 py-2 hover:bg-secondary/10">
            Log de acessos
          </Link>
          <Link href="/admin/perfil" className="rounded-md px-3 py-2 hover:bg-secondary/10">
            Meu perfil
          </Link>
        </nav>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
