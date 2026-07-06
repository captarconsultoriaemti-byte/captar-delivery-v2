"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setConfirmando(true)}
        className="flex w-full items-center justify-center gap-2"
      >
        <LogOut size={16} />
        Sair
      </Button>

      <ConfirmDialog
        open={confirmando}
        title="Sair do sistema?"
        confirmLabel="Sair"
        onConfirm={handleLogout}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
