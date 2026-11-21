import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { readSession, type SessionPayload } from "@/lib/auth";

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return readSession(cookieStore.get("ws_session")?.value);
}

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("La connexion à la base de données n’est pas configurée.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getActiveDepotProfile() {
  const session = await getServerSession();
  if (!session || session.role !== "depot" || !session.profileId) return null;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,role,active")
    .eq("id", session.profileId)
    .maybeSingle();

  if (error) {
    console.error("Vérification du compte dépôt impossible :", error.message);
    throw new Error("La vérification du compte est temporairement indisponible.");
  }
  if (!data || !data.active || data.role !== "depot") return null;
  return { session, profileId: data.id, supabase };
}

export async function getActiveShopProfile() {
  const session = await getServerSession();
  if (!session || session.role !== "shop" || !session.profileId) return null;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,role,active,shop_id,shops(name,active)")
    .eq("id", session.profileId)
    .maybeSingle();

  if (error) {
    console.error("Vérification du compte boutique impossible :", error.message);
    throw new Error("La vérification du compte est temporairement indisponible.");
  }
  const shop = data?.shops as unknown as { name: string; active: boolean } | null;
  if (!data || !data.active || data.role !== "shop" || !data.shop_id || !shop?.active || shop.name !== session.shop) return null;
  return { session, profileId: data.id, shopId: data.shop_id, supabase };
}
