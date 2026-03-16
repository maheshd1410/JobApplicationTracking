import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("date_applied", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const columns = [
    "id",
    "company",
    "role_title",
    "location",
    "job_link",
    "source",
    "date_applied",
    "status",
    "follow_up_date",
    "notes",
    "created_at",
    "updated_at",
  ];

  const csv = toCsv(data ?? [], columns);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=applications.csv",
    },
  });
}
