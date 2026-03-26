import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPrimaryWorkspaceId, requireUserId } from "@/lib/auth";

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
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date." }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("plan_date", date)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  if (!plan) {
    return NextResponse.json({ data: { plan: null, tasks: [] } });
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("plan_id", plan.id)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { plan, tasks: tasks ?? [] } });
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const date = String(body.plan_date ?? "").trim();
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "Execution").trim();

  if (!date || !title) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("plan_date", date)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  let planId = plan?.id ?? null;
  if (!planId) {
    const { data: created, error: createError } = await supabase
      .from("daily_plans")
      .insert({
        plan_date: date,
        owner_id: userId,
        workspace_id: workspaceId,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create plan." },
        { status: 500 }
      );
    }
    planId = created.id;
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      plan_id: planId,
      owner_id: userId,
      workspace_id: workspaceId,
      title,
      category,
      status: "Pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
