import { DetailField, DetailModal } from "@/components/ui/detail-modal";
import type { ClienteParaEdicao } from "./cliente-form-modal";

export function ClienteViewModal({
  cliente,
  onClose,
}: {
  cliente: ClienteParaEdicao;
  onClose: () => void;
}) {
  const endereco = [
    cliente.logradouro,
    cliente.numero,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : cliente.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DetailModal title={cliente.nome} onClose={onClose}>
      <DetailField label="WhatsApp" value={cliente.whatsapp} />
      <DetailField label="CPF/CNPJ" value={cliente.cpf} />
      <DetailField label="Status" value={cliente.ativo ? "Ativo" : "Inativo"} />
      <DetailField label="CEP" value={cliente.cep} />
      <DetailField label="Endereço" value={endereco} fullWidth />
      <DetailField label="Observações" value={cliente.observacoes} fullWidth />
    </DetailModal>
  );
}
