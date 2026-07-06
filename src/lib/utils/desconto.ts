export interface InfoDesconto {
  tem_desconto: boolean;
  desconto_tipo: "percentual" | "valor" | null;
  desconto_valor: number | null;
}

export function calcularPrecoFinal(preco: number, info: InfoDesconto): number {
  if (!info.tem_desconto || !info.desconto_tipo || !info.desconto_valor) return preco;

  const precoFinal =
    info.desconto_tipo === "percentual"
      ? preco - (preco * info.desconto_valor) / 100
      : preco - info.desconto_valor;

  return Math.max(0, precoFinal);
}

export function calcularPrecoOriginal(precoFinal: number, info: InfoDesconto): number {
  if (!info.tem_desconto || !info.desconto_tipo || !info.desconto_valor) return precoFinal;

  return info.desconto_tipo === "percentual"
    ? precoFinal / (1 - info.desconto_valor / 100)
    : precoFinal + info.desconto_valor;
}

export function formatarTarjaDesconto(info: InfoDesconto): string | null {
  if (!info.tem_desconto || !info.desconto_tipo || !info.desconto_valor) return null;

  return info.desconto_tipo === "percentual"
    ? `-${info.desconto_valor}%`
    : `-${info.desconto_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}
