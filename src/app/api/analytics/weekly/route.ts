import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const opportunityStatuses = ["New", "Shortlisted", "Applied", "Rejected"] as const;

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDateString(date);
}

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const today = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 56);

  const { data, error } = await supabase
    .from("opportunities")
    .select("created_at,status")
    .eq("owner_id", userId)
    .gte("created_at", toDateString(start));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const weekMap = new Map<string, number>();
  const appliedMap = new Map<string, number>();
  const queueMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  opportunityStatuses.forEach((status) => statusMap.set(status, 0));

  (data ?? []).forEach((row) => {
    if (!row.created_at) return;
    const weekStart = getWeekStart(row.created_at.slice(0, 10));
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + 1);

    if (row.status) {
      statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1);
      if (row.status === "Applied") {
        appliedMap.set(weekStart, (appliedMap.get(weekStart) ?? 0) + 1);
      }
      if (row.status === "New") {
        queueMap.set(weekStart, (queueMap.get(weekStart) ?? 0) + 1);
      }
    }
  });

  const weeks: {
    weekStart: string;
    count: number;
    applied: number;
    inQueue: number;
  }[] = [];
  for (let i = 8; i >= 0; i -= 1) {
    const week = new Date();
    week.setUTCDate(week.getUTCDate() - i * 7);
    const weekStart = getWeekStart(toDateString(week));
    weeks.push({
      weekStart,
      count: weekMap.get(weekStart) ?? 0,
      applied: appliedMap.get(weekStart) ?? 0,
      inQueue: queueMap.get(weekStart) ?? 0,
    });
  }

  const status = Array.from(statusMap.entries()).map(([key, count]) => ({
    status: key,
    count,
  }));

  return NextResponse.json({
    weeks,
    status,
  });
}
