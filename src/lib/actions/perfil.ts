"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateOwnPassword(novaSenha: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) return { error: error.message };
  return { data: true };
}
