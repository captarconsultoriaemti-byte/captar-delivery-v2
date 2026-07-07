"use client";

import { useEffect, useRef, useState } from "react";
import { buscarSugestoesBairro, buscarDetalhesBairro, type SugestaoBairro } from "@/lib/utils/google-places";

interface BairroAutocompleteProps {
  cidade: string;
  estado: string;
  value: string;
  onChange: (bairro: string) => void;
  placeholder?: string;
  required?: boolean;
}

// campo de bairro com autocomplete via Google Places, restrito a cidade/estado
// informados. se o usuario so digitar e nao selecionar nenhuma sugestao, o
// texto digitado e mantido normalmente (nao trava o campo)
export function BairroAutocomplete({
  cidade,
  estado,
  value,
  onChange,
  placeholder,
  required,
}: BairroAutocompleteProps) {
  const [sugestoes, setSugestoes] = useState<SugestaoBairro[]>([]);
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChangeTexto(texto: string) {
    onChange(texto);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.trim().length < 3) {
      setSugestoes([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const resultado = await buscarSugestoesBairro(texto, cidade, estado);
      setBuscando(false);
      setSugestoes(resultado);
    }, 350);
  }

  async function handleSelecionar(sugestao: SugestaoBairro) {
    setOpen(false);
    setSugestoes([]);
    const detalhes = await buscarDetalhesBairro(sugestao.placeId);
    onChange(detalhes.bairro ?? sugestao.descricao);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        required={required}
        value={value}
        onChange={(e) => handleChangeTexto(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {open && (buscando || sugestoes.length > 0) && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-secondary/45 bg-white shadow-lg">
          {buscando && <li className="px-3 py-2 text-sm text-secondary">Buscando...</li>}
          {!buscando &&
            sugestoes.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                  onClick={() => handleSelecionar(s)}
                >
                  {s.descricao}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
