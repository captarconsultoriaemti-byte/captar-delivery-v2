import { Copy, X } from "lucide-react";
import { IconAction } from "@/components/ui/icon-action";
import { useToast } from "@/components/ui/toast";

interface EmpresaCompleta {
  nome: string;
  email: string;
  slug: string | null;
  tipo_estabelecimento_nome?: string;
  cnpj: string | null;
  nome_responsavel: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  status: "trial" | "active" | "suspended" | "cancelled";
  trial_ends_at: string;
}

const statusLabel: Record<EmpresaCompleta["status"], string> = {
  trial: "Teste",
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs text-secondary">{label}</p>
      <p className="text-sm font-medium">{valor && valor.trim() !== "" ? valor : "-"}</p>
    </div>
  );
}

export function EmpresaViewModal({
  empresa,
  onClose,
}: {
  empresa: EmpresaCompleta;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const linkCardapio = empresa.slug ? `https://captardelivery.com.br/loja/${empresa.slug}` : null;

  function copiarLink() {
    if (!linkCardapio) return;
    navigator.clipboard.writeText(linkCardapio);
    showToast("success", "Link copiado.");
  }

  const endereco = [
    empresa.logradouro,
    empresa.numero,
    empresa.complemento,
    empresa.bairro,
    empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : empresa.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between p-6 pb-2">
          <div className="flex items-center gap-3">
            {empresa.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={empresa.logo_url}
                alt={empresa.nome}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <h2 className="text-lg font-semibold">{empresa.nome}</h2>
          </div>
          <IconAction icon={X} label="Fechar" onClick={onClose} />
        </div>

        <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 pb-6">
          <Campo label="Tipo de Estabelecimento" valor={empresa.tipo_estabelecimento_nome} />
          <Campo label="Status" valor={statusLabel[empresa.status]} />
          <Campo label="E-mail de acesso" valor={empresa.email} />
          <Campo label="CNPJ" valor={empresa.cnpj} />
          <Campo label="Nome do Responsável" valor={empresa.nome_responsavel} />
          <Campo label="WhatsApp" valor={empresa.whatsapp} />
          <Campo
            label="Teste expira em"
            valor={new Date(empresa.trial_ends_at).toLocaleDateString("pt-BR")}
          />
          <Campo label="CEP" valor={empresa.cep} />
          <div className="col-span-2">
            <p className="mb-1 text-xs text-secondary">Link do cardápio</p>
            {linkCardapio ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={linkCardapio}
                  className="w-full flex-1 truncate rounded-md border border-secondary/55 bg-secondary/5 px-3 py-2 text-sm text-secondary"
                />
                <IconAction icon={Copy} label="Copiar link" variant="secondary" onClick={copiarLink} />
              </div>
            ) : (
              <p className="text-sm font-medium">-</p>
            )}
          </div>
          <div className="col-span-2">
            <Campo label="Endereço" valor={endereco} />
          </div>
        </div>
      </div>
    </div>
  );
}
