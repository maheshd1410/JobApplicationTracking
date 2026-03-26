import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const stepId = params?.stepId ?? fallbackId ?? "";

  if (!stepId) {
    return NextResponse.json({ error: "Missing step id." }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.progress !== undefined) {
    updates.progress = Math.min(Math.max(Number(body.progress), 0), 100);
  }
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.category !== undefined)
    updates.category = String(body.category).trim();
  if (body.target_time !== undefined)
    updates.target_time = String(body.target_time);
  if (body.estimated_hours !== undefined) {
    updates.estimated_hours =
      body.estimated_hours === null ? null : Number(body.estimated_hours);
  }

  const { data, error } = await supabase
    .from("prep_steps")
    .update(updates)
    .eq("id", stepId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Prep step not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const stepId = params?.stepId ?? fallbackId ?? "";

  if (!stepId) {
    return NextResponse.json({ error: "Missing step id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("prep_steps")
    .delete()
    .eq("id", stepId)
    .eq("owner_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
