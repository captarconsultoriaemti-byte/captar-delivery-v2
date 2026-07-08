function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// opcionais_selecionados guarda o nome do item repetido conforme a
// quantidade escolhida (ex: ["Carne", "Carne", "Frango"]); aqui agrupamos
// pra saber quantas vezes cada um foi escolhido.
export function agruparOpcionais(nomes: string[]): { nome: string; quantidade: number }[] {
  const contagem = new Map<string, number>();
  for (const nome of nomes) {
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return Array.from(contagem.entries()).map(([nome, quantidade]) => ({ nome, quantidade }));
}

// exibe "2x Carne, Frango" em vez do nome repetido. Quando um mapa de precos
// e informado (nome do opcional -> valor adicional), mostra o preco junto
// (ex: "2x Bacon (+R$ 6,00)") pra aparecer no comprovante impresso.
export function formatarOpcionaisComQuantidade(
  nomes: string[],
  precos?: Record<string, number>,
): string {
  return agruparOpcionais(nomes)
    .map(({ nome, quantidade }) => {
      const preco = precos?.[nome];
      const precoTexto = preco ? ` (+${formatarMoeda(preco * quantidade)})` : "";
      return `${quantidade > 1 ? `${quantidade}x ` : ""}${nome}${precoTexto}`;
    })
    .join(", ");
}
