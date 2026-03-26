import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; prepId: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const prepId = params?.prepId ?? fallbackId ?? "";

  if (!prepId) {
    return NextResponse.json({ error: "Missing prep id." }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.topic !== undefined) updates.topic = String(body.topic).trim();
  if (body.category !== undefined)
    updates.category = String(body.category).trim();
  if (body.start_time !== undefined)
    updates.start_time = String(body.start_time);
  if (body.end_time !== undefined) updates.end_time = String(body.end_time);
  if (body.notes !== undefined)
    updates.notes = body.notes ? String(body.notes).trim() : null;

  const { data, error } = await supabase
    .from("prep_sessions")
    .update(updates)
    .eq("id", prepId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Prep entry not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; prepId: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const prepId = params?.prepId ?? fallbackId ?? "";

  if (!prepId) {
    return NextResponse.json({ error: "Missing prep id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("prep_sessions")
    .delete()
    .eq("id", prepId)
    .eq("owner_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
