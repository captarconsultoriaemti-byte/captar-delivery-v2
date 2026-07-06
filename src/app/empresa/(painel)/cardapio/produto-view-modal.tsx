import { DetailField, DetailModal } from "@/components/ui/detail-modal";
import { ProdutoThumbnail } from "@/components/ui/produto-thumbnail";
import { calcularPrecoFinal, formatarTarjaDesconto } from "@/lib/utils/desconto";

interface ProdutoDetalhado {
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  destaque: boolean;
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
  foto_url: string | null;
  categoriasNomes: string[];
  gruposNomes: string[];
  itens_opcionais: string[];
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProdutoViewModal({
  produto,
  onClose,
}: {
  produto: ProdutoDetalhado;
  onClose: () => void;
}) {
  const tarja = formatarTarjaDesconto(produto);
  const precoFinal = calcularPrecoFinal(produto.preco, produto);

  return (
    <DetailModal title={produto.nome} onClose={onClose}>
      <div className="col-span-2">
        <ProdutoThumbnail
          fotoUrl={produto.foto_url}
          nome={produto.nome}
          className="h-32 w-32"
          iconSize={28}
        />
      </div>

      <DetailField
        label="Categorias"
        value={produto.categoriasNomes.length > 0 ? produto.categoriasNomes.join(", ") : "-"}
      />
      <DetailField label="Status" value={produto.ativo ? "Ativo" : "Inativo"} />

      <DetailField
        label="Preço"
        value={
          tarja ? (
            <span>
              <span className="mr-1 text-secondary line-through">{formatarMoeda(produto.preco)}</span>
              <span className="text-danger">{formatarMoeda(precoFinal)}</span>
              <span className="ml-1 rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">
                {tarja}
              </span>
            </span>
          ) : (
            formatarMoeda(produto.preco)
          )
        }
      />
      <DetailField label="Destaque" value={produto.destaque ? "Sim" : "Não"} />

      <DetailField label="Descrição" value={produto.descricao} fullWidth />
      <DetailField
        label="Itens opcionais"
        value={produto.itens_opcionais.length > 0 ? produto.itens_opcionais.join(", ") : "Nenhum"}
        fullWidth
      />
      <DetailField
        label="Grupos de adicionais"
        value={produto.gruposNomes.length > 0 ? produto.gruposNomes.join(", ") : "Nenhum"}
        fullWidth
      />
    </DetailModal>
  );
}
