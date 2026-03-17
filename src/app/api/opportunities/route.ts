import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const allowedStatuses = ["New", "Shortlisted", "Applied", "Rejected"] as const;

type OpportunityStatus = (typeof allowedStatuses)[number];

function isValidStatus(status: string | null) {
  if (!status) return false;
  return allowedStatuses.includes(status as OpportunityStatus);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");

  let query = supabase.from("opportunities").select("*");

  if (isValidStatus(status)) {
    query = query.eq("status", status as string);
  }

  if (source) {
    query = query.eq("source", source);
  }

  if (q) {
    query = query.or(`company.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  const title = String(body.title ?? "").trim();
  const company = String(body.company ?? "").trim();
  const status = String(body.status ?? "New").trim();

  if (!title || !company || !isValidStatus(status)) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    title,
    company,
    location: body.location ?? null,
    url: body.url ?? null,
    source: body.source ?? null,
    status,
    match_score: body.match_score ?? null,
    notes: body.notes ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("opportunities")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
