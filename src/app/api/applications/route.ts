import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { statusOptions } from "@/lib/types";

function isValidStatus(status: string | null) {
  if (!status) return false;
  return statusOptions.includes(status as (typeof statusOptions)[number]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const followUpDue = url.searchParams.get("followUpDue");
  const followUpDate = url.searchParams.get("followUpDate");

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (isValidStatus(status)) {
    conditions.push("status = ?");
    params.push(status as string);
  }

  if (source) {
    conditions.push("source = ?");
    params.push(source);
  }

  if (q) {
    conditions.push("(company LIKE ? OR role_title LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  if (dateFrom) {
    conditions.push("date_applied >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("date_applied <= ?");
    params.push(dateTo);
  }

  if (followUpDue === "1" && followUpDate) {
    conditions.push("follow_up_date IS NOT NULL AND follow_up_date <= ?");
    params.push(followUpDate);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const stmt = db.prepare(
    `SELECT * FROM applications ${where} ORDER BY date_applied DESC, created_at DESC`
  );
  const rows = stmt.all(...params);

  return NextResponse.json({ data: rows });
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const body = await request.json();

  const company = String(body.company ?? "").trim();
  const roleTitle = String(body.role_title ?? "").trim();
  const dateApplied = String(body.date_applied ?? "").trim();
  const status = String(body.status ?? "Applied").trim();

  if (!company || !roleTitle || !dateApplied || !isValidStatus(status)) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const followUpDate = body.follow_up_date
    ? String(body.follow_up_date)
    : addDays(dateApplied, 7);

  const id = crypto.randomUUID();

  db.prepare(
    `
    INSERT INTO applications (
      id, company, role_title, location, job_link, source,
      date_applied, status, follow_up_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    company,
    roleTitle,
    body.location ?? null,
    body.job_link ?? null,
    body.source ?? null,
    dateApplied,
    status,
    followUpDate,
    body.notes ?? null,
    now,
    now
  );

  const created = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(id);

  return NextResponse.json({ data: created }, { status: 201 });
}
