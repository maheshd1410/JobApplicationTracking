import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM applications ORDER BY date_applied DESC")
    .all();

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

  const csv = toCsv(rows, columns);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=applications.csv",
    },
  });
}
