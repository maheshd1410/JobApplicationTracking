import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const allowedStatuses = ["New", "Shortlisted", "Applied", "Rejected"] as const;

type OpportunityStatus = (typeof allowedStatuses)[number];

function isValidStatus(status: string | null) {
  if (!status) return false;
  return allowedStatuses.includes(status as OpportunityStatus);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.id ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updates.title = String(body.title).trim();
  }
  if (body.company !== undefined) {
    updates.company = String(body.company).trim();
  }
  if (body.location !== undefined) {
    updates.location = body.location ? String(body.location).trim() : null;
  }
  if (body.url !== undefined) {
    updates.url = body.url ? String(body.url).trim() : null;
  }
  if (body.source !== undefined) {
    updates.source = body.source ? String(body.source).trim() : null;
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
  if (body.match_score !== undefined) {
    updates.match_score = body.match_score;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes) : null;
  }

  if (!Object.keys(updates).length) {
    const { data: existing, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !existing) {
      return NextResponse.json(
        { error: `Opportunity not found for id: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: existing });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("opportunities")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? `Opportunity not found for id: ${id}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.id ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Opportunity not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
