import { createClient } from "@/lib/supabase/server";
import { ClientesClient } from "./clientes-client";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clientes } = await supabase.from("clientes").select("*").order("nome");

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Clientes</h1>
      <ClientesClient clientes={clientes ?? []} />
    </div>
  );
}
