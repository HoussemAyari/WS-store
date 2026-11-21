import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 }); }
  const parsed = z.object({
    threadId: z.string().uuid().optional(),
    shopId: z.string().uuid().optional(),
    body: z.string().trim().min(1).max(2000),
  }).refine((value) => Boolean(value.threadId) !== Boolean(value.shopId)).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Écrivez une réponse avant de l’envoyer." }, { status: 400 });
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    let threadId = parsed.data.threadId ?? "";
    if (parsed.data.shopId) {
      const { data: shop, error: shopError } = await auth.supabase.from("shops").select("id,active").eq("id", parsed.data.shopId).maybeSingle();
      if (shopError) throw shopError;
      if (!shop?.active) return NextResponse.json({ erreur: "Cette boutique n’est pas disponible." }, { status: 404 });
      const { data: existing, error: lookupError } = await auth.supabase
        .from("message_threads")
        .select("id")
        .eq("shop_id", shop.id)
        .is("order_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        threadId = existing.id;
      } else {
        const { data: created, error: createError } = await auth.supabase
          .from("message_threads")
          .insert({ shop_id: shop.id, subject: "Conversation générale" })
          .select("id")
          .single();
        if (createError) throw createError;
        threadId = created.id;
      }
    } else {
      const { data: thread, error: threadLookupError } = await auth.supabase.from("message_threads").select("id").eq("id", threadId).maybeSingle();
      if (threadLookupError) throw threadLookupError;
      if (!thread) return NextResponse.json({ erreur: "Conversation introuvable." }, { status: 404 });
    }
    const { data, error } = await auth.supabase.from("messages").insert({
      thread_id: threadId,
      sender_profile_id: auth.profileId,
      sender_role: "depot",
      body: parsed.data.body,
    }).select("id,sender_role,body,created_at").single();
    if (error) throw error;
    const { error: updateError } = await auth.supabase.from("message_threads").update({ unread_shop: true, unread_depot: false, updated_at: new Date().toISOString() }).eq("id", threadId);
    if (updateError) throw updateError;
    return NextResponse.json({ threadId, message: data }, { status: 201 });
  } catch (error) {
    console.error("Réponse du dépôt impossible :", error);
    return NextResponse.json({ erreur: "La réponse n’a pas pu être envoyée." }, { status: 503 });
  }
}
