import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing date." },
      { status: 400 }
    );
  }

  const appliedToday = db
    .prepare("SELECT COUNT(*) as count FROM applications WHERE date_applied = ?")
    .get(date) as { count: number };

  const total = db
    .prepare("SELECT COUNT(*) as count FROM applications")
    .get() as { count: number };

  return NextResponse.json({
    appliedToday: appliedToday.count,
    total: total.count,
  });
}
