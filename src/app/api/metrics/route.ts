import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing date." },
      { status: 400 }
    );
  }

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { count: appliedTodayCount, error: appliedError } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (appliedError) {
    return NextResponse.json({ error: appliedError.message }, { status: 500 });
  }

  const { count: totalCount, error: totalError } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 500 });
  }

  return NextResponse.json({
    appliedToday: appliedTodayCount ?? 0,
    total: totalCount ?? 0,
  });
}
