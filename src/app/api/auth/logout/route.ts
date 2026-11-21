import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ws_session", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
