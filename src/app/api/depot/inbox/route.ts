import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

export async function GET() {
  await connection();
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const [{ data: submissions, error: submissionsError }, { data: threads, error: threadsError }, { data: shops, error: shopsError }] = await Promise.all([
      auth.supabase.from("submissions").select("id,type,description,customer_name,status,created_at,shops(name)").order("created_at", { ascending: false }),
      auth.supabase.from("message_threads").select("id,subject,unread_depot,updated_at,shops(name),messages(id,sender_role,body,created_at)").order("updated_at", { ascending: false }),
      auth.supabase.from("shops").select("id,name").eq("active", true).order("name"),
    ]);
    if (submissionsError) throw submissionsError;
    if (threadsError) throw threadsError;
    if (shopsError) throw shopsError;
    return NextResponse.json({
      shops: shops ?? [],
      submissions: (submissions ?? []).map((submission) => ({
        ...submission,
        shopName: (submission.shops as unknown as { name: string } | null)?.name ?? "Boutique",
      })),
      threads: (threads ?? []).map((thread) => ({
        ...thread,
        shopName: (thread.shops as unknown as { name: string } | null)?.name ?? "Boutique",
      })),
    });
  } catch (error) {
    console.error("Chargement de la boîte de réception impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger la boîte de réception." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 }); }
  const parsed = z.union([
    z.object({
      submissionId: z.string().uuid(),
      status: z.enum(["en_cours", "traite"]),
    }),
    z.object({ threadId: z.string().uuid() }),
  ]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    if ("submissionId" in parsed.data) {
      const { error } = await auth.supabase.from("submissions").update({ status: parsed.data.status }).eq("id", parsed.data.submissionId);
      if (error) throw error;
    } else {
      const { error } = await auth.supabase.from("message_threads").update({ unread_depot: false }).eq("id", parsed.data.threadId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mise à jour de la réception impossible :", error);
    return NextResponse.json({ erreur: "Impossible de mettre à jour cet envoi." }, { status: 503 });
  }
}
