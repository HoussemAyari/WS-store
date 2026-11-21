import { connection, NextResponse } from "next/server";
import { getActiveShopProfile, getActiveDepotProfile } from "@/lib/server-auth";

export async function GET() {
  await connection();
  try {
    const shop = await getActiveShopProfile();
    const depot = shop ? null : await getActiveDepotProfile();
    if (!shop && !depot) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

    const supabase = shop?.supabase ?? depot!.supabase;
    const { data, error } = await supabase
      .from("catalog_items")
      .select("id,name,unit,active,position,catalog_categories(id,name,position)")
      .eq("active", true)
      .order("position")
      .order("name");
    if (error) {
      console.error("Chargement du catalogue impossible :", error.message);
      return NextResponse.json({ erreur: "Impossible de charger le catalogue." }, { status: 503 });
    }

    return NextResponse.json({
      articles: (data ?? []).map((item) => ({
        id: item.id,
        nom: item.name,
        categorie: (item.catalog_categories as unknown as { name: string } | null)?.name ?? "Autres",
        avecQuantite: item.unit === "unités",
      })),
    });
  } catch (error) {
    console.error("Erreur du service catalogue :", error);
    return NextResponse.json({ erreur: "Le catalogue est temporairement indisponible." }, { status: 503 });
  }
}
