import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function getOpportunityId(request: Request, paramsId?: string) {
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-2)[0];
  return paramsId ?? fallbackId ?? "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const opportunityId = getOpportunityId(request, params?.id);

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("opportunity_cvs")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const opportunityId = getOpportunityId(request, params?.id);

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const now = new Date().toISOString();

  const payload = {
    opportunity_id: opportunityId,
    data: body.data ?? {},
    updated_at: now,
    created_at: now,
  };

  const { data, error } = await supabase
    .from("opportunity_cvs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const opportunityId = getOpportunityId(request, params?.id);

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.data !== undefined) {
    updates.data = body.data ?? {};
  }

  const { data, error } = await supabase
    .from("opportunity_cvs")
    .update(updates)
    .eq("opportunity_id", opportunityId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "CV not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
