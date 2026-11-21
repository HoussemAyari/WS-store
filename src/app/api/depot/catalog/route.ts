import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

const itemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  categoryId: z.string().uuid(),
  unit: z.enum(["selection", "unités"]),
});

export async function GET() {
  await connection();
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const [{ data: items, error }, { data: categories, error: categoryError }] = await Promise.all([
      auth.supabase.from("catalog_items").select("id,name,unit,active,position,category_id,catalog_categories(name)").order("position").order("name"),
      auth.supabase.from("catalog_categories").select("id,name,active,position").order("position"),
    ]);
    if (error) throw error;
    if (categoryError) throw categoryError;
    return NextResponse.json({ items: items ?? [], categories: categories ?? [] });
  } catch (error) {
    console.error("Chargement du catalogue dépôt impossible :", error);
    return NextResponse.json({ erreur: "Impossible de charger le catalogue." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  }
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Vérifiez le nom, la catégorie et l’unité." }, { status: 400 });
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const { data, error } = await auth.supabase.from("catalog_items").insert({
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      unit: parsed.data.unit,
    }).select("id").single();
    if (error?.code === "23505") return NextResponse.json({ erreur: "Cet article existe déjà." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Création d’article impossible :", error);
    return NextResponse.json({ erreur: "Impossible d’ajouter cet article." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  }
  const parsed = z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(160).optional(),
    categoryId: z.string().uuid().optional(),
    unit: z.enum(["selection", "unités"]).optional(),
    active: z.boolean().optional(),
  }).refine((value) => Object.keys(value).some((key) => key !== "id"), "Aucune modification demandée").safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Vérifiez les modifications." }, { status: 400 });
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const { id, categoryId, ...rest } = parsed.data;
    const { error } = await auth.supabase.from("catalog_items").update({
      ...rest,
      ...(categoryId ? { category_id: categoryId } : {}),
    }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Modification d’article impossible :", error);
    return NextResponse.json({ erreur: "Impossible de modifier cet article." }, { status: 503 });
  }
}
