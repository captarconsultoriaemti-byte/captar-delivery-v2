import { createClient } from "@/lib/supabase/server";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-secondary/40 bg-white p-6">
      <p className="mb-1 text-sm text-secondary">{label}</p>
      <p className="text-2xl font-bold text-primary">{valor}</p>
      {sub && <p className="mt-1 text-xs text-secondary">{sub}</p>}
    </div>
  );
}

export default async function InicioPage() {
  const supabase = await createClient();

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);

  const [
    { data: categorias },
    { data: produtos },
    { data: vinculosCategorias },
    { count: totalCombos },
    { count: totalGrupos },
    { count: totalClientes },
    { data: pedidosDoDia },
    { data: pedidosDoMes },
  ] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("ordem").order("nome"),
    supabase.from("produtos").select("id"),
    supabase.from("produto_categorias").select("produto_id, categoria_id"),
    supabase.from("combos").select("id", { count: "exact", head: true }),
    supabase.from("grupos_opcionais").select("id", { count: "exact", head: true }),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("pedidos")
      .select("total")
      .eq("status", "fechado")
      .gte("closed_at", inicioDoDia.toISOString()),
    supabase
      .from("pedidos")
      .select("total")
      .eq("status", "fechado")
      .gte("closed_at", inicioDoMes.toISOString()),
  ]);

  const totalDoDia = (pedidosDoDia ?? []).reduce((soma, p) => soma + p.total, 0);
  const totalDoMes = (pedidosDoMes ?? []).reduce((soma, p) => soma + p.total, 0);

  const contagemPorCategoria = new Map<string, number>();
  for (const vinculo of vinculosCategorias ?? []) {
    contagemPorCategoria.set(
      vinculo.categoria_id,
      (contagemPorCategoria.get(vinculo.categoria_id) ?? 0) + 1,
    );
  }

  const produtosPorCategoria = (categorias ?? []).map((categoria) => ({
    nome: categoria.nome,
    total: contagemPorCategoria.get(categoria.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Início</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Categorias" valor={String((categorias ?? []).length)} />
        <Card label="Produtos no cardápio" valor={String((produtos ?? []).length)} />
        <Card label="Combos" valor={String(totalCombos ?? 0)} />
        <Card label="Grupos de adicionais" valor={String(totalGrupos ?? 0)} />
      </div>

      <div className="mb-6 rounded-lg border border-secondary/40 bg-white p-6">
        <p className="mb-3 text-sm font-semibold">Produtos por categoria</p>
        {produtosPorCategoria.length === 0 ? (
          <p className="text-sm text-secondary">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {produtosPorCategoria.map((c) => (
              <li key={c.nome} className="flex justify-between border-b border-secondary/30 py-1.5">
                <span>{c.nome}</span>
                <span className="text-secondary">{c.total} produto(s)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold">Financeiro</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Total do dia" valor={formatarMoeda(totalDoDia)} />
        <Card label="Total do mês" valor={formatarMoeda(totalDoMes)} />
        <Card label="Clientes cadastrados" valor={String(totalClientes ?? 0)} />
      </div>
    </div>
  );
}
