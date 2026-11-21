import { connection, NextResponse } from "next/server";
import { getActiveShopProfile } from "@/lib/server-auth";

export async function GET() {
  await connection();
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const { count, error } = await auth.supabase
      .from("message_threads")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", auth.shopId)
      .eq("unread_shop", true);
    if (error) throw error;
    return NextResponse.json({ unread: count ?? 0 });
  } catch (error) {
    console.error("Chargement des notifications impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger les notifications." }, { status: 503 });
  }
}
