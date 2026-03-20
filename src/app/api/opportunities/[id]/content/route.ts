import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const allowedTypes = [
  "JD",
  "EMAIL",
  "LINKEDIN",
  "STUDY",
  "NOTES",
] as const;

type ContentType = (typeof allowedTypes)[number];

function isValidType(type: string | null) {
  if (!type) return false;
  return allowedTypes.includes(type as ContentType);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-2)[0];
  const opportunityId = params?.id ?? fallbackId ?? "";
  const type = url.searchParams.get("type");

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  let query = supabase
    .from("opportunity_content")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (isValidType(type)) {
    query = query.eq("type", type as string);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-2)[0];
  const opportunityId = params?.id ?? fallbackId ?? "";

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const type = String(body.type ?? "").trim();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!isValidType(type) || !title || !content) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    opportunity_id: opportunityId,
    type,
    title,
    content,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("opportunity_content")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
