import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveShopProfile } from "@/lib/server-auth";

async function getOrCreateThread(auth: NonNullable<Awaited<ReturnType<typeof getActiveShopProfile>>>) {
  const { data: existing, error } = await auth.supabase
    .from("message_threads")
    .select("id")
    .eq("shop_id", auth.shopId)
    .is("order_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.id;
  const { data, error: createError } = await auth.supabase
    .from("message_threads")
    .insert({ shop_id: auth.shopId, subject: "Conversation générale" })
    .select("id")
    .single();
  if (createError) throw createError;
  return data.id;
}

export async function GET() {
  await connection();
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const threadId = await getOrCreateThread(auth);
    const { data, error } = await auth.supabase
      .from("messages")
      .select("id,sender_role,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at");
    if (error) throw error;
    const { error: readError } = await auth.supabase.from("message_threads").update({ unread_shop: false }).eq("id", threadId);
    if (readError) throw readError;
    return NextResponse.json({ threadId, messages: data ?? [] });
  } catch (error) {
    console.error("Chargement des messages impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger les messages." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 }); }
  const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Écrivez un message avant de l’envoyer." }, { status: 400 });
  try {
    const auth = await getActiveShopProfile();
    if (!auth) return NextResponse.json({ erreur: "Connexion boutique requise." }, { status: 401 });
    const threadId = await getOrCreateThread(auth);
    const { data, error } = await auth.supabase.from("messages").insert({
      thread_id: threadId,
      sender_profile_id: auth.profileId,
      sender_role: "shop",
      body: parsed.data.body,
    }).select("id,sender_role,body,created_at").single();
    if (error) throw error;
    const { error: threadError } = await auth.supabase.from("message_threads").update({ unread_depot: true, unread_shop: false, updated_at: new Date().toISOString() }).eq("id", threadId);
    if (threadError) throw threadError;
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    console.error("Envoi du message impossible :", error);
    return NextResponse.json({ erreur: "Le message n’a pas pu être envoyé." }, { status: 503 });
  }
}
