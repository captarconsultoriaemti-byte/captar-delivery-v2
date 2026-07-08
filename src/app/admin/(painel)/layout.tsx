import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui/logout-button";
import { ResponsiveSidebar } from "@/components/ui/responsive-sidebar";

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <ResponsiveSidebar
        title={
          <Image
            src="/images/LogoCAPTAR_Delivery3.png"
            alt="CAPTAR Delivery"
            width={280}
            height={84}
            className="h-14 w-auto"
          />
        }
      >
        <nav className="mb-6 flex flex-col gap-1 text-sm md:mt-6">
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
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </ResponsiveSidebar>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
