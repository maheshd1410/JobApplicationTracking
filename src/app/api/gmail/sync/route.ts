import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google";
import { supabase } from "@/lib/supabase";

function getHeader(
  headers: { name?: string | null; value?: string | null }[],
  key: string
) {
  return headers.find((h) => h.name?.toLowerCase() === key.toLowerCase())?.value;
}

function parseSenderCompany(fromHeader: string | undefined) {
  if (!fromHeader) return "Unknown";
  const match = fromHeader.match(/"?([^"<]+)"?\s*</);
  if (match && match[1]) return match[1].trim();
  return fromHeader.split("@")[0]?.trim() || "Unknown";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const query =
    url.searchParams.get("q") ||
    "(job OR opportunity OR opening OR hiring OR position) newer_than:7d";

  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("id, email, access_token, refresh_token, expiry")
    .eq("provider", "gmail")
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integration = integrations?.[0];
  if (!integration) {
    return NextResponse.json(
      { error: "Gmail not connected." },
      { status: 400 }
    );
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: integration.access_token ?? undefined,
    refresh_token: integration.refresh_token ?? undefined,
    expiry_date: integration.expiry
      ? new Date(integration.expiry).getTime()
      : undefined,
  });

  if (
    integration.expiry &&
    new Date(integration.expiry).getTime() < Date.now() - 60_000 &&
    integration.refresh_token
  ) {
    const refreshed = await client.refreshAccessToken();
    const credentials = refreshed.credentials;
    const expiry = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : null;

    await supabase
      .from("integrations")
      .update({
        access_token: credentials.access_token ?? integration.access_token,
        refresh_token: credentials.refresh_token ?? integration.refresh_token,
        expiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    client.setCredentials(credentials);
  }

  const gmail = google.gmail({ version: "v1", auth: client });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 20,
  });

  const messages = list.data.messages ?? [];
  let created = 0;

  for (const message of messages) {
    const id = message.id;
    if (!id) continue;

    const url = `https://mail.google.com/mail/u/0/#inbox/${id}`;
    const { data: existing } = await supabase
      .from("opportunities")
      .select("id")
      .eq("url", url)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["Subject", "From"],
    });

    const headers = full.data.payload?.headers ?? [];
    const subject = getHeader(headers, "Subject") ?? "Opportunity from Gmail";
    const from = getHeader(headers, "From");
    const company = parseSenderCompany(from);

    const { error: insertError } = await supabase.from("opportunities").insert({
      title: subject,
      company,
      source: "Gmail",
      url,
      status: "New",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (!insertError) created += 1;
  }

  return NextResponse.json({
    found: messages.length,
    created,
  });
}
