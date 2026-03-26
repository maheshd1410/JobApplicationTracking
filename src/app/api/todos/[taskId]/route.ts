import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPrimaryWorkspaceId, requireUserId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
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

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.taskId ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.category !== undefined)
    updates.category = String(body.category).trim();
  if (body.status !== undefined)
    updates.status = String(body.status).trim();
  if (body.notes !== undefined)
    updates.notes = body.notes ? String(body.notes) : null;

  const { data, error } = await supabase
    .from("daily_tasks")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Task not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
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

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.taskId ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
