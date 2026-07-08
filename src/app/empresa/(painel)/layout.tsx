import { redirect } from "next/navigation";
import Image from "next/image";
import {
  Home,
  ShoppingCart,
  Users,
  Tag,
  UtensilsCrossed,
  ListPlus,
  Package,
  Settings,
  DollarSign,
  UserCircle,
  Kanban,
  History,
  MapPin,
} from "lucide-react";
import { getCurrentEmpresa, getCurrentProfile } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/onboarding";
import { LogoutButton } from "@/components/ui/logout-button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ResponsiveSidebar } from "@/components/ui/responsive-sidebar";
import { NavLink } from "./nav-link";

export default async function EmpresaPainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "empresa" || !profile.empresa_id) {
    redirect("/empresa/login");
  }

  const empresa = await getCurrentEmpresa(profile.empresa_id);

  if (!empresa) {
    redirect("/empresa/login");
  }

  if (empresa.status === "suspended" || empresa.status === "cancelled") {
    redirect("/empresa/bloqueado");
  }

  const status = await getOnboardingStatus(profile.empresa_id);

  return (
    <div className="flex min-h-screen flex-col print:block md:flex-row">
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
          <NavLink href="/empresa/inicio" label="Início" icon={Home} bloqueado={false} />

          <hr className="my-2 border-t-2 border-secondary/65" />

          <NavLink
            href="/empresa/pedidos"
            label="Venda / Pedidos"
            icon={ShoppingCart}
            bloqueado={!status.temProduto}
            motivo="Cadastre pelo menos 1 produto no cardápio primeiro"
          />
          <NavLink
            href="/empresa/pedidos-online"
            label="Pedidos Online"
            icon={Kanban}
            bloqueado={!status.temProduto}
            motivo="Cadastre pelo menos 1 produto no cardápio primeiro"
          />
          <NavLink
            href="/empresa/pedidos-online/historico"
            label="Histórico"
            icon={History}
            bloqueado={!status.temProduto}
            motivo="Cadastre pelo menos 1 produto no cardápio primeiro"
          />
          <NavLink href="/empresa/clientes" label="Clientes" icon={Users} bloqueado={false} />

          <hr className="my-2 border-t-2 border-secondary/65" />

          <NavLink href="/empresa/categorias" label="Categorias" icon={Tag} bloqueado={false} />
          <NavLink
            href="/empresa/cardapio"
            label="Cardápio"
            icon={UtensilsCrossed}
            bloqueado={!status.temCategoria}
            motivo="Cadastre pelo menos 1 categoria primeiro"
          />
          <NavLink
            href="/empresa/grupos-opcionais"
            label="Grupos de Adicionais"
            icon={ListPlus}
            bloqueado={!status.temCategoria}
            motivo="Cadastre pelo menos 1 categoria primeiro"
          />
          <NavLink
            href="/empresa/combos"
            label="Combos"
            icon={Package}
            bloqueado={!status.temDoisProdutos}
            motivo="Cadastre pelo menos 2 produtos no cardápio primeiro"
          />

          <hr className="my-2 border-t-2 border-secondary/65" />

          <NavLink
            href="/empresa/configuracoes"
            label="Configurações"
            icon={Settings}
            bloqueado={false}
          />
          <NavLink
            href="/empresa/bairros-entrega"
            label="Bairros de Entrega"
            icon={MapPin}
            bloqueado={false}
          />
          <NavLink
            href="/empresa/financeiro"
            label="Financeiro"
            icon={DollarSign}
            bloqueado={!status.temProduto}
            motivo="Cadastre pelo menos 1 produto no cardápio primeiro"
          />
          <NavLink
            href="/empresa/perfil"
            label="Perfil"
            icon={UserCircle}
            bloqueado={!status.temProduto}
            motivo="Cadastre pelo menos 1 produto no cardápio primeiro"
          />
        </nav>
        <div className="mt-8">
          <LogoutButton redirectTo="/empresa/login" />
        </div>
      </ResponsiveSidebar>
      <main className="flex-1">
        <div className="flex items-center justify-between border-b border-secondary/40 bg-white px-4 py-3 print:hidden md:px-6">
          <p className="truncate text-sm font-medium text-secondary">{empresa.nome}</p>
          <NotificationBell />
        </div>
        <div className="p-4 print:p-0 md:p-6">{children}</div>
      </main>
    </div>
  );
}
