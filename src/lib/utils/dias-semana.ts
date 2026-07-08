// mesma convencao do Date.getDay(): 0 = domingo ... 6 = sabado
export const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

// array vazio (ou ausente) significa "todos os dias" - convencao usada pra
// nao quebrar produtos cadastrados antes desse campo existir
export function disponivelHoje(diasSemana: number[] | null | undefined): boolean {
  if (!diasSemana || diasSemana.length === 0) return true;
  return diasSemana.includes(new Date().getDay());
}
