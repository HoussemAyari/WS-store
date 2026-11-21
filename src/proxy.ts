import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("ws_session")?.value;
  const session = await readSession(token);
  const path = request.nextUrl.pathname;

  if (path.startsWith("/boutique") && session?.role !== "shop") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (path.startsWith("/depot") && session?.role !== "depot") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/boutique/:path*", "/depot/:path*"],
};
