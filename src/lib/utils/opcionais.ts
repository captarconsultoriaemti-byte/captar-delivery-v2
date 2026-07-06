// opcionais_selecionados guarda o nome do item repetido conforme a
// quantidade escolhida (ex: ["Carne", "Carne", "Frango"]); aqui agrupamos
// para exibir "2x Carne, Frango" em vez do nome repetido
export function formatarOpcionaisComQuantidade(nomes: string[]): string {
  const contagem = new Map<string, number>();
  for (const nome of nomes) {
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([nome, quantidade]) => (quantidade > 1 ? `${quantidade}x ${nome}` : nome))
    .join(", ");
}
