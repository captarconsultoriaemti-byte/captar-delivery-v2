"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateOwnPassword } from "@/lib/actions/perfil";

export function PerfilClient() {
  const { showToast } = useToast();
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await updateOwnPassword(senha);
    setSaving(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Senha atualizada com sucesso.");
    setSenha("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="mb-1 block text-sm font-medium">Nova senha</label>
      <PasswordInput
        required
        minLength={6}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className="mb-4"
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
