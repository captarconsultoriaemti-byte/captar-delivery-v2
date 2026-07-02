import { createAdminClient } from "@/lib/supabase/admin";
import { NumberedTable } from "@/components/ui/numbered-table";

async function listAllUsers() {
  const admin = createAdminClient();
  const perPage = 200;
  const usuarios = [];

  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    if (!data?.users?.length) break;

    usuarios.push(...data.users);
    if (data.users.length < perPage) break;
  }

  return usuarios;
}

export default async function LogsPage() {
  const usuarios = await listAllUsers();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Log de acessos</h1>
      <div className="rounded-lg border border-secondary/15 bg-white p-4">
        <NumberedTable
          rows={usuarios}
          rowKey={(u) => u.id}
          columns={[
            { header: "E-mail", render: (u) => u.email ?? "-" },
            {
              header: "Ultimo acesso",
              render: (u) =>
                u.last_sign_in_at
                  ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                  : "Nunca acessou",
            },
            {
              header: "Cadastrado em",
              render: (u) => new Date(u.created_at).toLocaleDateString("pt-BR"),
            },
          ]}
        />
      </div>
    </div>
  );
}
