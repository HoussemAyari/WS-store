import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveShopProfile } from "@/lib/server-auth";

const itemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  urgent: z.boolean().default(false),
  note: z.string().trim().max(300).optional().default(""),
});
const createSchema = z.object({
  generalNote: z.string().trim().max(1000).optional().default(""),
  sourceOrderId: z.string().uuid().optional(),
  items: z.array(itemSchema).max(500).default([]),
}).refine((value) => Boolean(value.sourceOrderId) || value.items.length > 0, "La commande doit contenir au moins un article.");

export async function GET() {
  await connection();
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const { data, error } = await auth.supabase
      .from("orders")
      .select("id,order_date,status,general_note,created_at,order_items(id,item_id,quantity,urgent,item_note,unavailable,unavailable_note,catalog_items(name,unit))")
      .eq("shop_id", auth.shopId)
      .order("order_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data ?? [], today: new Date().toISOString().slice(0, 10) });
  } catch (error) {
    console.error("Chargement des commandes boutique impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger les commandes." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande de commande est invalide." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Choisissez au moins un article et vérifiez les quantités." }, { status: 400 });

  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });

    let orderItems = parsed.data.items;
    if (parsed.data.sourceOrderId) {
      const { data: sourceOrder, error: sourceError } = await auth.supabase
        .from("orders")
        .select("id,order_items(item_id,quantity,urgent,item_note)")
        .eq("id", parsed.data.sourceOrderId)
        .eq("shop_id", auth.shopId)
        .maybeSingle();
      if (sourceError) throw sourceError;
      if (!sourceOrder) return NextResponse.json({ erreur: "Commande à recommander introuvable." }, { status: 404 });
      orderItems = (sourceOrder.order_items ?? []).map((item) => ({
        itemId: item.item_id,
        quantity: item.quantity,
        urgent: item.urgent,
        note: item.item_note ?? "",
      }));
      if (orderItems.length === 0) return NextResponse.json({ erreur: "Cette commande ne contient aucun article à recommander." }, { status: 400 });
    }

    const itemIds = [...new Set(orderItems.map((item) => item.itemId))];
    if (itemIds.length !== orderItems.length) return NextResponse.json({ erreur: "Un article ne peut apparaître qu’une fois dans la commande." }, { status: 400 });
    const { data: catalogItems, error: catalogError } = await auth.supabase
      .from("catalog_items")
      .select("id,unit,active")
      .in("id", itemIds);
    if (catalogError) throw catalogError;
    if (!catalogItems || catalogItems.length !== itemIds.length || catalogItems.some((item) => !item.active)) {
      return NextResponse.json({ erreur: "Un ou plusieurs articles ne sont plus disponibles dans le catalogue." }, { status: 400 });
    }
    const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
    const { data: order, error: orderError } = await auth.supabase
      .from("orders")
      .insert({
        shop_id: auth.shopId,
        created_by: auth.profileId,
        general_note: parsed.data.generalNote || null,
      })
      .select("id,order_date,status")
      .single();
    if (orderError?.code === "23505") {
      return NextResponse.json({ erreur: "Une commande existe déjà pour votre boutique aujourd’hui." }, { status: 409 });
    }
    if (orderError) throw orderError;

    const { error: itemsError } = await auth.supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: order.id,
        item_id: item.itemId,
        quantity: catalogById.get(item.itemId)?.unit === "unités" ? item.quantity : 1,
        urgent: item.urgent,
        item_note: item.note || null,
      }))
    );
    if (itemsError) {
      const { error: cleanupError } = await auth.supabase.from("orders").delete().eq("id", order.id);
      if (cleanupError) console.error("Nettoyage de commande incomplète impossible :", cleanupError.message);
      throw itemsError;
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Création de commande impossible :", error);
    return NextResponse.json({ erreur: "La commande n’a pas pu être enregistrée. Réessayez." }, { status: 503 });
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
    z.object({ orderId: z.string().uuid(), action: z.literal("confirm_received") }),
    z.object({
      orderId: z.string().uuid(),
      action: z.literal("update"),
      generalNote: z.string().trim().max(1000).optional().default(""),
      items: z.array(itemSchema).min(1).max(500),
    }),
  ]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });

  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    if (parsed.data.action === "confirm_received") {
      const { data, error } = await auth.supabase
        .from("orders")
        .update({ status: "recue", updated_at: new Date().toISOString() })
        .eq("id", parsed.data.orderId)
        .eq("shop_id", auth.shopId)
        .eq("status", "expediee")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ erreur: "Seule une commande expédiée peut être confirmée." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    const { data: order, error: orderError } = await auth.supabase
      .from("orders")
      .select("id,status")
      .eq("id", parsed.data.orderId)
      .eq("shop_id", auth.shopId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ erreur: "Commande introuvable." }, { status: 404 });
    if (order.status !== "nouvelle") return NextResponse.json({ erreur: "La commande ne peut plus être modifiée : sa préparation a commencé." }, { status: 409 });

    const itemIds = [...new Set(parsed.data.items.map((item) => item.itemId))];
    if (itemIds.length !== parsed.data.items.length) return NextResponse.json({ erreur: "Un article ne peut apparaître qu’une fois dans la commande." }, { status: 400 });
    const [{ data: catalogItems, error: catalogError }, { data: previousItems, error: previousError }] = await Promise.all([
      auth.supabase.from("catalog_items").select("id,unit,active").in("id", itemIds),
      auth.supabase.from("order_items").select("id,item_id,quantity,urgent,item_note,unavailable,unavailable_note").eq("order_id", order.id),
    ]);
    if (catalogError) throw catalogError;
    if (previousError) throw previousError;
    if (!catalogItems || catalogItems.length !== itemIds.length || catalogItems.some((item) => !item.active)) {
      return NextResponse.json({ erreur: "Un ou plusieurs articles ne sont plus disponibles dans le catalogue." }, { status: 400 });
    }
    const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
    const { error: deleteError } = await auth.supabase.from("order_items").delete().eq("order_id", order.id);
    if (deleteError) throw deleteError;
    const newItems = parsed.data.items.map((item) => ({
      order_id: order.id,
      item_id: item.itemId,
      quantity: catalogById.get(item.itemId)?.unit === "unités" ? item.quantity : 1,
      urgent: item.urgent,
      item_note: item.note || null,
    }));
    const { error: insertError } = await auth.supabase.from("order_items").insert(newItems);
    if (insertError) {
      const { error: restoreError } = await auth.supabase.from("order_items").insert(previousItems ?? []);
      if (restoreError) console.error("Restauration de la commande impossible :", restoreError.message);
      throw insertError;
    }
    const { data: updated, error: updateError } = await auth.supabase
      .from("orders")
      .update({ general_note: parsed.data.generalNote || null, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "nouvelle")
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      const { error: deleteNewError } = await auth.supabase.from("order_items").delete().eq("order_id", order.id);
      if (deleteNewError) console.error("Nettoyage de la commande modifiée impossible :", deleteNewError.message);
      const { error: restoreError } = await auth.supabase.from("order_items").insert(previousItems ?? []);
      if (restoreError) console.error("Restauration de la commande impossible :", restoreError.message);
      if (updateError) throw updateError;
      return NextResponse.json({ erreur: "La préparation a commencé. Cette commande ne peut plus être modifiée." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Confirmation de réception impossible :", error);
    return NextResponse.json({ erreur: "La réception n’a pas pu être confirmée." }, { status: 503 });
  }
}
