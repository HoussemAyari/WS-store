import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveShopProfile } from "@/lib/server-auth";

const schema = z.object({
  type: z.enum(["note", "recommandation", "produit_client", "produit_stock"]),
  description: z.string().trim().min(2).max(2000),
  customerName: z.string().trim().max(120).optional().default(""),
});

export async function GET() {
  await connection();
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const { data, error } = await auth.supabase.from("submissions").select("id,type,description,customer_name,status,created_at").eq("shop_id", auth.shopId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ submissions: data ?? [] });
  } catch (error) {
    console.error("Chargement des envois impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger les envois." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Ajoutez une description pour continuer." }, { status: 400 });
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const { data, error } = await auth.supabase.from("submissions").insert({
      shop_id: auth.shopId,
      submitted_by: auth.profileId,
      type: parsed.data.type,
      description: parsed.data.description,
      customer_name: parsed.data.customerName || null,
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Envoi au dépôt impossible :", error);
    return NextResponse.json({ erreur: "L’envoi n’a pas pu être enregistré." }, { status: 503 });
  }
}
