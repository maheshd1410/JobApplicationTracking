import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email ?? null;

  if (!email) {
    return NextResponse.json({ error: "Unable to read email." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : null;

  const { data: existing } = await supabase
    .from("integrations")
    .select("refresh_token")
    .eq("provider", "gmail")
    .eq("email", email)
    .single();

  const refreshToken = tokens.refresh_token ?? existing?.refresh_token ?? null;

  const { error } = await supabase.from("integrations").upsert(
    {
      provider: "gmail",
      email,
      access_token: tokens.access_token ?? null,
      refresh_token: refreshToken,
      expiry,
      updated_at: now,
      created_at: now,
    },
    { onConflict: "provider,email" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/opportunities", url.origin));
}
