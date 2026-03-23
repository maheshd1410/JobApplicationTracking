import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";
import { statusOptions } from "@/lib/types";

function isValidStatus(status: string | null) {
  if (!status) return false;
  return statusOptions.includes(status as (typeof statusOptions)[number]);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.id ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json(
      { error: "Missing application id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.company !== undefined) {
    updates.company = String(body.company).trim();
  }
  if (body.role_title !== undefined) {
    updates.role_title = String(body.role_title).trim();
  }
  if (body.location !== undefined) {
    updates.location = body.location ? String(body.location).trim() : null;
  }
  if (body.job_link !== undefined) {
    updates.job_link = body.job_link ? String(body.job_link).trim() : null;
  }
  if (body.source !== undefined) {
    updates.source = body.source ? String(body.source).trim() : null;
  }
  if (body.date_applied !== undefined) {
    updates.date_applied = String(body.date_applied).trim();
  }
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }
    updates.status = status;
  }
  if (body.follow_up_date !== undefined) {
    updates.follow_up_date = body.follow_up_date
      ? String(body.follow_up_date)
      : null;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes) : null;
  }
  if (body.tags !== undefined) {
    const tagsInput = Array.isArray(body.tags) ? body.tags : [];
    const tags = tagsInput
      .map((tag: string) => String(tag).trim())
      .filter(Boolean);
    updates.tags = tags.length ? tags : null;
  }

  if (!Object.keys(updates).length) {
    const { data: existing, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .eq("owner_id", userId)
      .single();

    if (error || !existing) {
      return NextResponse.json(
        { error: `Application not found for id: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: existing });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? `Application not found for id: ${id}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
