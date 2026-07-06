"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingModalProps {
  temCategoria: boolean;
  temProduto: boolean;
}

export function OnboardingModal({ temCategoria, temProduto }: OnboardingModalProps) {
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-primary">Primeiros passos</h2>
        <p className="mb-4 text-sm text-secondary">
          Siga o passo a passo para gerir seu ambiente de trabalho:
        </p>

        <ol className="mb-6 flex flex-col gap-3">
          <li className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                temCategoria ? "bg-success text-white" : "bg-secondary/15 text-secondary"
              }`}
            >
              {temCategoria ? <Check size={14} /> : "1"}
            </span>
            <span className={temCategoria ? "text-secondary line-through" : ""}>
              Cadastre uma categoria
            </span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                temProduto ? "bg-success text-white" : "bg-secondary/15 text-secondary"
              }`}
            >
              {temProduto ? <Check size={14} /> : "2"}
            </span>
            <span className={temProduto ? "text-secondary line-through" : ""}>
              Cadastre itens no cardápio
            </span>
          </li>
        </ol>

        <p className="mb-4 text-xs text-secondary">
          O menu ao lado libera conforme você completa cada etapa.
        </p>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setFechado(true)}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
