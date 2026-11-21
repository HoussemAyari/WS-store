import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 }); }
  const parsed = z.object({
    threadId: z.string().uuid(),
    body: z.string().trim().min(1).max(2000),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Écrivez une réponse avant de l’envoyer." }, { status: 400 });
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const { data: thread, error: threadLookupError } = await auth.supabase.from("message_threads").select("id").eq("id", parsed.data.threadId).maybeSingle();
    if (threadLookupError) throw threadLookupError;
    if (!thread) return NextResponse.json({ erreur: "Conversation introuvable." }, { status: 404 });
    const { data, error } = await auth.supabase.from("messages").insert({
      thread_id: thread.id,
      sender_profile_id: auth.profileId,
      sender_role: "depot",
      body: parsed.data.body,
    }).select("id,sender_role,body,created_at").single();
    if (error) throw error;
    const { error: updateError } = await auth.supabase.from("message_threads").update({ unread_shop: true, unread_depot: false, updated_at: new Date().toISOString() }).eq("id", thread.id);
    if (updateError) throw updateError;
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    console.error("Réponse du dépôt impossible :", error);
    return NextResponse.json({ erreur: "La réponse n’a pas pu être envoyée." }, { status: 503 });
  }
}
