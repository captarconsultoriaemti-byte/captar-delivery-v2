"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function AdminLoginPage() {
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
    router.push("/admin/empresas");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <div className="mb-6 flex justify-center">
          <Image
            src="/images/LogoCAPTAR_Delivery3.png"
            alt="CAPTAR Delivery"
            width={280}
            height={84}
            className="h-14 w-auto"
          />
        </div>

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
      </form>
    </div>
  );
}
