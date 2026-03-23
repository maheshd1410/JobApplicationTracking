import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

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
      { error: "Missing inventory item id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.decision !== undefined) {
    updates.decision = String(body.decision).trim();
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes) : null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { error: "No updates provided." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", userId)
    .select(
      "id, decision, notes, opportunity:opportunity_id (id, title, company, location, url, source, status)"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Inventory item not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
