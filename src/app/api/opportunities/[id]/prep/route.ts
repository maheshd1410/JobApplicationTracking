import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

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

  const { data, error } = await supabase
    .from("prep_sessions")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .order("start_time", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

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
  const topic = String(body.topic ?? "").trim();
  const category = String(body.category ?? "System Design").trim();
  const startTime = String(body.start_time ?? "").trim();
  const endTime = String(body.end_time ?? "").trim();
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!topic || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    owner_id: userId,
    opportunity_id: opportunityId,
    topic,
    category,
    start_time: startTime,
    end_time: endTime,
    notes,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("prep_sessions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
