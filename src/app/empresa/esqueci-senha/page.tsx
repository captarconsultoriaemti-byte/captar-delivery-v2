"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function EsqueciSenhaPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/empresa/redefinir-senha`,
    });

    setLoading(false);

    if (error) {
      showToast("error", "Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }

    setEnviado(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <div className="mb-2 flex justify-center">
          <Image
            src="/images/LogoCAPTAR_Delivery3.png"
            alt="CAPTAR Delivery"
            width={280}
            height={84}
            className="h-14 w-auto"
          />
        </div>
        <p className="mb-6 text-center text-sm text-secondary">Recuperar senha</p>

        {enviado ? (
          <p className="mb-6 text-sm text-secondary">
            Se o e-mail informado estiver cadastrado, você vai receber um link para redefinir sua
            senha em instantes.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-6 w-full rounded-md border border-secondary/55 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        )}

        <Link
          href="/empresa/login"
          className="mt-4 block text-center text-sm font-medium text-secondary hover:text-foreground"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
