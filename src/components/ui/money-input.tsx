"use client";

import type { ChangeEvent } from "react";

interface MoneyInputProps {
  value: string;
  onChange: (valorFormatado: string) => void;
  required?: boolean;
  className?: string;
}

export function centavosParaReais(valorFormatado: string): number {
  const digits = valorFormatado.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10) / 100;
}

export function reaisParaFormatado(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MoneyInput({ value, onChange, required, className = "" }: MoneyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const numero = digits === "" ? 0 : parseInt(digits, 10) / 100;
    onChange(reaisParaFormatado(numero));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">
        R$
      </span>
      <input
        inputMode="numeric"
        required={required}
        value={value}
        onChange={handleChange}
        placeholder="0,00"
        className={`w-full rounded-md border border-secondary/55 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none ${className}`}
      />
    </div>
  );
}
