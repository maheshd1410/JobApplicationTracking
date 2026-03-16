import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

  let query = supabase.from("applications").select("*");

  if (isValidStatus(status)) {
    query = query.eq("status", status as string);
  }

  if (source) {
    query = query.eq("source", source);
  }

  if (q) {
    query = query.or(`company.ilike.%${q}%,role_title.ilike.%${q}%`);
  }

  if (dateFrom) {
    query = query.gte("date_applied", dateFrom);
  }

  if (dateTo) {
    query = query.lte("date_applied", dateTo);
  }

  if (followUpDue === "1" && followUpDate) {
    query = query
      .not("follow_up_date", "is", null)
      .lte("follow_up_date", followUpDate);
  }

  const { data, error } = await query
    .order("date_applied", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
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
  const force = Boolean(body.force);

  if (!company || !roleTitle || !dateApplied || !isValidStatus(status)) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  if (!force) {
    const { data: existing, error: existingError } = await supabase
      .from("applications")
      .select("*")
      .eq("company", company)
      .eq("role_title", roleTitle)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: "Possible duplicate found for this company and role.",
          existing: existing[0],
        },
        { status: 409 }
      );
    }
  }

  const now = new Date().toISOString();
  const followUpDate = body.follow_up_date
    ? String(body.follow_up_date)
    : addDays(dateApplied, 7);

  const payload = {
    company,
    role_title: roleTitle,
    location: body.location ?? null,
    job_link: body.job_link ?? null,
    source: body.source ?? null,
    date_applied: dateApplied,
    status,
    follow_up_date: followUpDate,
    notes: body.notes ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("applications")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
