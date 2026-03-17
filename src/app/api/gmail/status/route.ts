import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("integrations")
    .select("email, expiry")
    .eq("provider", "gmail")
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integration = data?.[0] ?? null;

  return NextResponse.json({
    connected: Boolean(integration),
    email: integration?.email ?? null,
    expiry: integration?.expiry ?? null,
  });
}
