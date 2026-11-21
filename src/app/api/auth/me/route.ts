import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSession } from "@/lib/server-auth";

export async function GET() {
  const session = await getServerSession();
  if (!session?.profileId) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

  try {
    const supabase = getAdminSupabase();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,role,active,display_name,shops(name)")
      .eq("id", session.profileId)
      .maybeSingle();

    if (error) {
      console.error("Chargement de la session impossible :", error.message);
      return NextResponse.json({ erreur: "Impossible de charger votre compte." }, { status: 503 });
    }
    if (!profile || !profile.active || profile.role !== session.role) {
      return NextResponse.json({ erreur: "Ce compte est désactivé." }, { status: 403 });
    }
    const shopName = profile.role === "depot"
      ? "Dépôt central"
      : (profile.shops as unknown as { name: string } | null)?.name;
    return NextResponse.json({ role: profile.role, displayName: profile.display_name, shopName });
  } catch (error) {
    console.error("Erreur du service de session :", error);
    return NextResponse.json({ erreur: "Le service de compte est temporairement indisponible." }, { status: 503 });
  }
}
