"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

// sidebar fixa em telas md+ (como já era), e um menu gaveta com hamburguer
// em telas menores - usado tanto no painel admin quanto no painel da empresa
export function ResponsiveSidebar({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-secondary/40 bg-background-soft p-4 print:hidden md:hidden">
        <div className="flex flex-1 justify-center">{title}</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-secondary hover:bg-secondary/10"
        >
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-background-soft p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex flex-1 justify-center">{title}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-1.5 text-secondary hover:bg-secondary/10"
              >
                <X size={20} />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>{children}</div>
          </aside>
        </div>
      )}

      <aside className="hidden w-56 shrink-0 border-r border-secondary/40 bg-background-soft p-4 print:hidden md:block">
        <div className="flex justify-center">{title}</div>
        {children}
      </aside>
    </>
  );
}
