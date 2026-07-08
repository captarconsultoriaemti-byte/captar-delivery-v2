"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, ShoppingBag } from "lucide-react";

export interface NotificacaoItem {
  id: string;
  tipo: "novo_pedido" | "cancelamento";
  titulo: string;
  horario: string;
  href: string;
}

export function NotificationBellClient({ itens }: { itens: NotificacaoItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className="relative inline-flex rounded-md p-2 text-secondary hover:bg-secondary/10"
      >
        <Bell size={20} />
        {itens.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {itens.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-secondary/40 bg-white shadow-lg">
          <p className="border-b border-secondary/30 px-4 py-2 text-sm font-semibold">
            Notificações
          </p>
          {itens.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-secondary">
              Nenhuma notificação no momento.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {itens.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2 border-b border-secondary/20 px-4 py-2.5 text-sm hover:bg-secondary/5"
                  >
                    {item.tipo === "cancelamento" ? (
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                    ) : (
                      <ShoppingBag size={15} className="mt-0.5 shrink-0 text-primary" />
                    )}
                    <span className="flex-1">
                      <span className="block">{item.titulo}</span>
                      <span className="text-xs text-secondary">{item.horario}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
