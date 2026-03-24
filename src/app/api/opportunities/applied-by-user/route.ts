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

  const { data, error } = await supabase
    .from("opportunities")
    .select("owner_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "Applied");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const id = row.owner_id as string | null;
    if (!id) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  const results: { user_id: string; email: string | null; count: number }[] = [];
  for (const [id, count] of counts.entries()) {
    const { data: userData } = await supabase.auth.admin.getUserById(id);
    results.push({
      user_id: id,
      email: userData?.user?.email ?? null,
      count,
    });
  }

  results.sort((a, b) => b.count - a.count);

  return NextResponse.json({ data: results });
}
