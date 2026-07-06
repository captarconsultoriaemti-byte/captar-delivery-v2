"use client";

import { useState } from "react";
import { Button } from "./button";
import { PasswordInput } from "./password-input";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  requirePassword?: boolean;
  loading?: boolean;
  onConfirm: (senha?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  requirePassword = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [senha, setSenha] = useState("");

  if (!open) return null;

  function handleCancel() {
    setSenha("");
    onCancel();
  }

  function handleConfirm() {
    onConfirm(requirePassword ? senha : undefined);
    setSenha("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-secondary">{description}</p>}

        {requirePassword && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">
              Confirme sua senha para continuar
            </label>
            <PasswordInput
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? "danger" : "success"}
            onClick={handleConfirm}
            disabled={loading || (requirePassword && senha.length === 0)}
          >
            {loading ? "Verificando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
