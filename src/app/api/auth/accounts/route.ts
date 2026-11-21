import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ erreur: "La liste des comptes est temporairement indisponible." }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("profiles")
    .select("login,display_name,role,shops(name)")
    .eq("active", true)
    .order("role")
    .order("display_name");

  if (error) {
    console.error("Chargement de la liste des comptes impossible :", error.message);
    return NextResponse.json({ erreur: "La liste des comptes est temporairement indisponible." }, { status: 503 });
  }

  const accounts = (data ?? []).map((profile) => ({
    identifiant: profile.login,
    nom: profile.role === "depot"
      ? "Dépôt central"
      : (profile.shops as unknown as { name: string } | null)?.name ?? profile.display_name,
  }));
  return NextResponse.json({ accounts });
}
