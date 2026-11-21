import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createSession } from "@/lib/auth";

const schema = z.object({
  identifiant: z.string().trim().min(1),
  motDePasse: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "La demande de connexion est invalide." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erreur: "Identifiant ou mot de passe manquant." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.NODE_ENV === "production" && (!url || !key)) {
    return NextResponse.json(
      { erreur: "Le service de connexion n’est pas encore configuré." },
      { status: 503 }
    );
  }
  if (url && key) {
    const supabase = createClient(url, key);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,login,display_name,password_hash,role,active,shops(name)")
      .eq("login", parsed.data.identifiant)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("Erreur Supabase pendant la connexion :", error.message);
      return NextResponse.json(
        { erreur: "Le service de connexion est temporairement indisponible." },
        { status: 503 }
      );
    }

    if (!profile || !(await bcrypt.compare(parsed.data.motDePasse, profile.password_hash))) {
      return NextResponse.json({ erreur: "Identifiant ou mot de passe incorrect." }, { status: 401 });
    }

    const shopName = profile.role === "depot" ? "Dépôt central" : (profile.shops as unknown as { name: string } | null)?.name || profile.display_name;
    const token = await createSession({ role: profile.role, shop: shopName, profileId: profile.id });
    const response = NextResponse.json({ role: profile.role, redirect: profile.role === "depot" ? "/depot" : "/boutique" });
    response.cookies.set("ws_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 31536000, path: "/" });
    return response;
  }

  const demoShop = ["Kram", "Rue des Salines", "Djerba"].find(
    (name) => name.toLowerCase() === parsed.data.identifiant.toLowerCase()
  );
  const depot = parsed.data.identifiant.toLowerCase().includes("depot");
  if (!demoShop && !depot) {
    return NextResponse.json({ erreur: "Identifiant inconnu." }, { status: 401 });
  }

  const role = depot ? "depot" : "shop";
  const shop = depot ? "Dépôt central" : parsed.data.identifiant;
  const token = await createSession({ role, shop });
  const response = NextResponse.json({ role, redirect: role === "depot" ? "/depot" : "/boutique" });
  response.cookies.set("ws_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 31536000, path: "/" });
  return response;
}
