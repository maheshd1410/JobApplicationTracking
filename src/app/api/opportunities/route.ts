import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPrimaryWorkspaceId, requireUserId } from "@/lib/auth";

const allowedStatuses = ["New", "Shortlisted", "Applied", "Rejected"] as const;

type OpportunityStatus = (typeof allowedStatuses)[number];

function isValidStatus(status: string | null) {
  if (!status) return false;
  return allowedStatuses.includes(status as OpportunityStatus);
}

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }
  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(
    userId
  );
  if (workspaceError || !workspaceId) {
    return NextResponse.json({ error: workspaceError }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");

  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (isValidStatus(status)) {
    query = query.eq("status", status as string);
  }

  if (source) {
    query = query.eq("source", source);
  }

  if (q) {
    query = query.or(`company.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const owner = url.searchParams.get("owner");
  if (owner) {
    query = query.eq("owner_id", owner);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }
  const { workspaceId, error: workspaceError } = await getPrimaryWorkspaceId(
    userId
  );
  if (workspaceError || !workspaceId) {
    return NextResponse.json({ error: workspaceError }, { status: 401 });
  }

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
    owner_id: userId,
    workspace_id: workspaceId,
    title,
    company,
    location: body.location ?? null,
    url: body.url ?? null,
    source: body.source ?? null,
    status,
    match_score_actual: body.match_score_actual ?? null,
    match_score_resume: body.match_score_resume ?? null,
    rejection_reason: body.rejection_reason ?? null,
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

  await supabase.from("opportunity_events").insert({
    owner_id: userId,
    workspace_id: workspaceId,
    opportunity_id: data.id,
    status: data.status,
    event_type: "status",
    created_at: now,
  });

  return NextResponse.json({ data }, { status: 201 });
}
