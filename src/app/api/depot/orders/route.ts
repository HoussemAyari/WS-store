import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

export async function GET() {
  await connection();
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const { data, error } = await auth.supabase
      .from("orders")
      .select("id,order_date,status,general_note,created_at,shops(id,name),order_items(id,item_id,quantity,urgent,item_note,unavailable,unavailable_note,catalog_items(name,unit))")
      .order("order_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data ?? [], today: new Date().toISOString().slice(0, 10) });
  } catch (error) {
    console.error("Chargement des commandes dépôt impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger les commandes." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  }

  const parsed = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("status"),
      orderId: z.string().uuid(),
      status: z.enum(["en_preparation", "expediee"]),
    }),
    z.object({
      action: z.literal("unavailable"),
      orderItemId: z.string().uuid(),
      unavailable: z.boolean(),
      note: z.string().trim().max(300).optional().default(""),
    }),
  ]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Vérifiez les informations saisies." }, { status: 400 });

  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    if (parsed.data.action === "status") {
      const expected = parsed.data.status === "en_preparation" ? "nouvelle" : "en_preparation";
      const { data, error } = await auth.supabase
        .from("orders")
        .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
        .eq("id", parsed.data.orderId)
        .eq("status", expected)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ erreur: "Cette commande a déjà changé d’état." }, { status: 409 });
    } else {
      const { data, error } = await auth.supabase
        .from("order_items")
        .update({
          unavailable: parsed.data.unavailable,
          unavailable_note: parsed.data.unavailable ? parsed.data.note || "Indisponible" : null,
        })
        .eq("id", parsed.data.orderItemId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ erreur: "Article de commande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mise à jour de commande impossible :", error);
    return NextResponse.json({ erreur: "La commande n’a pas pu être mise à jour." }, { status: 503 });
  }
}
