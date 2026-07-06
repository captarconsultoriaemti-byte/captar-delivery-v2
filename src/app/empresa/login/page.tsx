"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function EmpresaLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast("error", "E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    showToast("success", "Login realizado com sucesso.");
    router.push("/empresa/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-xl font-bold text-primary">CAPTAR Delivery</h1>

        <label className="mb-1 block text-sm font-medium">Login</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium">Senha</label>
        <PasswordInput
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6"
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <Link
          href="/empresa/esqueci-senha"
          className="mt-4 block text-center text-sm font-medium text-secondary hover:text-foreground"
        >
          Esqueci minha senha
        </Link>
      </form>
    </div>
  );
}
