"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // o link de recuperacao do Supabase estabelece a sessao automaticamente
    // ao carregar a pagina (via #access_token na URL); so liberamos o
    // formulario depois de confirmar que a sessao existe
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPronto(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (senha !== confirmarSenha) {
      showToast("error", "As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      showToast("error", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      showToast("error", "Não foi possível redefinir a senha. Peça um novo link.");
      return;
    }

    showToast("success", "Senha redefinida com sucesso.");
    router.push("/empresa/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-1 text-xl font-bold text-primary">CAPTAR Delivery</h1>
        <p className="mb-6 text-sm text-secondary">Redefinir senha</p>

        {!pronto ? (
          <p className="text-sm text-secondary">
            Verificando o link de recuperação... Se essa mensagem não sumir, peça um novo link em
            &quot;Esqueci minha senha&quot;.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium">Nova senha</label>
            <PasswordInput
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mb-4"
            />

            <label className="mb-1 block text-sm font-medium">Confirmar nova senha</label>
            <PasswordInput
              required
              minLength={6}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="mb-6"
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
