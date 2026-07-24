// fallback de impressao quando o QZ Tray nao esta conectado ou falhou: abre
// a mesma pagina de comprovante usada na reimpressao manual (que ja monta o
// cupom de 58mm e chama window.print() sozinha), soh que com autoFechar
// ligado pra aba se fechar depois de imprimir, sem exigir clique.
export type ViaImpressao = "ambas" | "cliente" | "cozinha";

export function printReceipt(pedidoId: string, via: ViaImpressao = "ambas") {
  window.open(`/empresa/pedidos/${pedidoId}/imprimir?via=${via}&auto=1`, "_blank");
}
