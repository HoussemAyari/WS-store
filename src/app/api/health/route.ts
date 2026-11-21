import { NextResponse } from "next/server";

export async function GET() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.SESSION_SECRET);

  return NextResponse.json(
    {
      application: "WS Supply",
      configured,
    },
    { status: configured ? 200 : 503 }
  );
}
