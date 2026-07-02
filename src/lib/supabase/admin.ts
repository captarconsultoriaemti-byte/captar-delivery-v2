import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// usa a service_role key - so pode ser importado em Server Actions/Route Handlers,
// nunca em codigo que roda no browser
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
