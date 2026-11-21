import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveDepotProfile } from "@/lib/server-auth";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    login: z.string().trim().min(2).max(64),
    displayName: z.string().trim().min(2).max(100),
    role: z.enum(["shop", "depot"]),
    shopId: z.string().uuid().nullable(),
    password: z.string().min(12).max(128),
  }),
  z.object({
    action: z.literal("reset_password"),
    profileId: z.string().uuid(),
    password: z.string().min(12).max(128),
  }),
  z.object({
    action: z.literal("set_active"),
    profileId: z.string().uuid(),
    active: z.boolean(),
  }),
]);

export async function GET() {
  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });

    const { data, error } = await auth.supabase
      .from("profiles")
      .select("id,login,display_name,role,active,shop_id,shops(name),created_at")
      .order("role")
      .order("display_name");
    if (error) {
      console.error("Chargement des comptes impossible :", error.message);
      return NextResponse.json({ erreur: "Impossible de charger les comptes." }, { status: 503 });
    }
    const { data: shops, error: shopsError } = await auth.supabase
      .from("shops")
      .select("id,name,active")
      .order("name");
    if (shopsError) {
      console.error("Chargement des boutiques impossible :", shopsError.message);
      return NextResponse.json({ erreur: "Impossible de charger les boutiques." }, { status: 503 });
    }

    const accounts = (data ?? []).map((account) => ({
      id: account.id,
      login: account.login,
      displayName: account.display_name,
      role: account.role,
      active: account.active,
      shopId: account.shop_id,
      shopName: (account.shops as unknown as { name: string } | null)?.name ?? null,
    }));
    return NextResponse.json({ accounts, shops });
  } catch (error) {
    console.error("Erreur du service des comptes :", error);
    return NextResponse.json({ erreur: "Le service des comptes est temporairement indisponible." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande est invalide." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erreur: "Vérifiez les informations saisies." }, { status: 400 });

  try {
    const auth = await getActiveDepotProfile();
    if (!auth) return NextResponse.json({ erreur: "Accès réservé au dépôt." }, { status: 403 });
    const { supabase } = auth;
    const action = parsed.data;

    if (action.action === "create") {
      if ((action.role === "shop") !== Boolean(action.shopId)) {
        return NextResponse.json({ erreur: "Une boutique doit être associée à un compte boutique uniquement." }, { status: 400 });
      }
      if (action.shopId) {
        const { data: shop, error } = await supabase.from("shops").select("id,active").eq("id", action.shopId).maybeSingle();
        if (error) throw error;
        if (!shop || !shop.active) return NextResponse.json({ erreur: "Cette boutique n’est pas disponible." }, { status: 400 });
      }
      const { error } = await supabase.from("profiles").insert({
        login: action.login,
        display_name: action.displayName,
        role: action.role,
        shop_id: action.shopId,
        password_hash: await bcrypt.hash(action.password, 12),
      });
      if (error) {
        if (error.code === "23505") return NextResponse.json({ erreur: "Cet identifiant existe déjà." }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    if (action.profileId === auth.profileId && action.action === "set_active" && !action.active) {
      return NextResponse.json({ erreur: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    }

    if (action.action === "reset_password") {
      const { error } = await supabase
        .from("profiles")
        .update({ password_hash: await bcrypt.hash(action.password, 12) })
        .eq("id", action.profileId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ active: action.active })
        .eq("id", action.profileId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Modification de compte impossible :", error);
    return NextResponse.json({ erreur: "Impossible de modifier ce compte." }, { status: 503 });
  }
}
