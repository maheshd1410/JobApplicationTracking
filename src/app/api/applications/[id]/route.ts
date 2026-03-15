import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { statusOptions } from "@/lib/types";

function isValidStatus(status: string | null) {
  if (!status) return false;
  return statusOptions.includes(status as (typeof statusOptions)[number]);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const id = params?.id ?? fallbackId ?? "";

  if (!id) {
    return NextResponse.json(
      { error: "Missing application id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.company !== undefined) {
    fields.push("company = ?");
    values.push(String(body.company).trim());
  }
  if (body.role_title !== undefined) {
    fields.push("role_title = ?");
    values.push(String(body.role_title).trim());
  }
  if (body.location !== undefined) {
    fields.push("location = ?");
    values.push(body.location ? String(body.location).trim() : null);
  }
  if (body.job_link !== undefined) {
    fields.push("job_link = ?");
    values.push(body.job_link ? String(body.job_link).trim() : null);
  }
  if (body.source !== undefined) {
    fields.push("source = ?");
    values.push(body.source ? String(body.source).trim() : null);
  }
  if (body.date_applied !== undefined) {
    fields.push("date_applied = ?");
    values.push(String(body.date_applied).trim());
  }
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }
    fields.push("status = ?");
    values.push(status);
  }
  if (body.follow_up_date !== undefined) {
    fields.push("follow_up_date = ?");
    values.push(body.follow_up_date ? String(body.follow_up_date) : null);
  }
  if (body.notes !== undefined) {
    fields.push("notes = ?");
    values.push(body.notes ? String(body.notes) : null);
  }

  if (!fields.length) {
    const existing = db
      .prepare("SELECT * FROM applications WHERE id = ?")
      .get(params.id);

    if (!existing) {
      return NextResponse.json(
        { error: `Application not found for id: ${params.id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: existing });
  }

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE applications SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );

  const updated = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(id);

  if (!updated) {
    return NextResponse.json(
      { error: `Application not found for id: ${id}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: updated });
}
