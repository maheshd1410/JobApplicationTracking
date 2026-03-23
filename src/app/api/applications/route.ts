import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";
import { statusOptions } from "@/lib/types";

function isValidStatus(status: string | null) {
  if (!status) return false;
  return statusOptions.includes(status as (typeof statusOptions)[number]);
}

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const followUpDue = url.searchParams.get("followUpDue");
  const followUpDate = url.searchParams.get("followUpDate");
  const tagsParam = url.searchParams.get("tags");

  let query = supabase.from("applications").select("*").eq("owner_id", userId);

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
      .lte("follow_up_date", followUpDate)
      .not("status", "in", "(Rejected,Withdrawn,Offer)");
  }

  if (tagsParam) {
    const tags = tagsParam
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length) {
      query = query.contains("tags", tags);
    }
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
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json();

  const company = String(body.company ?? "").trim();
  const roleTitle = String(body.role_title ?? "").trim();
  const dateApplied = String(body.date_applied ?? "").trim();
  const status = String(body.status ?? "Applied").trim();
  const force = Boolean(body.force);
  const tagsInput = Array.isArray(body.tags) ? body.tags : [];
  const tags = tagsInput
    .map((tag: string) => String(tag).trim())
    .filter(Boolean);

  if (!company || !roleTitle || !dateApplied || !isValidStatus(status)) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 }
    );
  }

  if (!force) {
    const { data: exactMatch, error: exactError } = await supabase
      .from("applications")
      .select("*")
      .ilike("company", company)
      .ilike("role_title", roleTitle)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exactError) {
      return NextResponse.json(
        { error: exactError.message },
        { status: 500 }
      );
    }

    if (exactMatch && exactMatch.length > 0) {
      return NextResponse.json(
        {
          error:
            "Possible duplicate found (case-insensitive exact match for company and role).",
          existing: exactMatch[0],
          matchType: "exact",
        },
        { status: 409 }
      );
    }

    const { data: partialMatch, error: partialError } = await supabase
      .from("applications")
      .select("*")
      .ilike("company", `%${company}%`)
      .ilike("role_title", `%${roleTitle}%`)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (partialError) {
      return NextResponse.json(
        { error: partialError.message },
        { status: 500 }
      );
    }

    if (partialMatch && partialMatch.length > 0) {
      return NextResponse.json(
        {
          error:
            "Possible duplicate found (partial match for company and role).",
          existing: partialMatch[0],
          matchType: "partial",
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
    owner_id: userId,
    company,
    role_title: roleTitle,
    location: body.location ?? null,
    job_link: body.job_link ?? null,
    source: body.source ?? null,
    date_applied: dateApplied,
    status,
    follow_up_date: followUpDate,
    notes: body.notes ?? null,
    tags: tags.length ? tags : null,
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
