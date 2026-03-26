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
    .from("prep_steps")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .order("target_time", { ascending: true });

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
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "System Design").trim();
  const targetTime = String(body.target_time ?? "").trim();
  const estimatedHours =
    body.estimated_hours !== undefined && body.estimated_hours !== null
      ? Number(body.estimated_hours)
      : null;

  if (!title || !targetTime) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    owner_id: userId,
    opportunity_id: opportunityId,
    title,
    category,
    target_time: targetTime,
    estimated_hours: estimatedHours,
    progress: 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("prep_steps")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
