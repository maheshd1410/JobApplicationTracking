import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing date." },
      { status: 400 }
    );
  }

  const { count: appliedTodayCount, error: appliedError } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("date_applied", date);

  if (appliedError) {
    return NextResponse.json({ error: appliedError.message }, { status: 500 });
  }

  const { count: totalCount, error: totalError } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true });

  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 500 });
  }

  return NextResponse.json({
    appliedToday: appliedTodayCount ?? 0,
    total: totalCount ?? 0,
  });
}
