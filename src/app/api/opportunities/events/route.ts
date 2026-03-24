import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPrimaryWorkspaceId, requireUserId } from "@/lib/auth";

function toIsoStart(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function toIsoEnd(dateStr: string) {
  const end = new Date(`${dateStr}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to dates." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("opportunity_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("created_at", toIsoStart(from))
    .lt("created_at", toIsoEnd(to))
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
