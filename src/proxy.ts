import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("ws_session")?.value;
  const session = await readSession(token);
  const path = request.nextUrl.pathname;

  const requiredRole = path.startsWith("/boutique") ? "shop" : "depot";
  if (!session || session.role !== requiredRole || !session.profileId) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("ws_session");
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("ws_session");
    return response;
  }

  try {
    const profileUrl = new URL("/rest/v1/profiles", url);
    profileUrl.searchParams.set("id", `eq.${session.profileId}`);
    profileUrl.searchParams.set("select", "id,role,active,shops(name)");
    const profileResponse = await fetch(profileUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) throw new Error(`Supabase a répondu ${profileResponse.status}.`);
    const [profile] = (await profileResponse.json()) as Array<{
      id: string;
      role: string;
      active: boolean;
      shops: { name: string } | null;
    }>;
    const currentShop = profile?.role === "depot" ? "Dépôt central" : profile?.shops?.name;
    if (!profile?.active || profile.role !== session.role || currentShop !== session.shop) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("ws_session");
      return response;
    }
  } catch (error) {
    console.error("Vérification de la session impossible :", error);
    return NextResponse.json({ erreur: "Le service de connexion est temporairement indisponible." }, { status: 503 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/boutique/:path*", "/depot/:path*"],
};
