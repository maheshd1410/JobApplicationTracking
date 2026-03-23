import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const bucketName = "opportunity-documents";

function toPublicUrl(path: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucketName}/${path}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-2)[0];
  const opportunityId = params?.id ?? fallbackId ?? "";

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("opportunity_documents")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .order("tag", { ascending: true })
    .order("is_latest", { ascending: false })
    .order("version", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-2)[0];
  const opportunityId = params?.id ?? fallbackId ?? "";

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const name = String(formData.get("name") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Missing file." },
      { status: 400 }
    );
  }
  if (!tag) {
    return NextResponse.json({ error: "Missing tag." }, { status: 400 });
  }

  const blob = file as Blob;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalName = name || "document";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${opportunityId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, { contentType: blob.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data: versionRow } = await supabase
    .from("opportunity_documents")
    .select("version")
    .eq("opportunity_id", opportunityId)
    .eq("tag", tag)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (versionRow?.version ?? 0) + 1;

  await supabase
    .from("opportunity_documents")
    .update({ is_latest: false })
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .eq("tag", tag);

  const fileUrl = toPublicUrl(path);
  const now = new Date().toISOString();
  const payload = {
    owner_id: userId,
    opportunity_id: opportunityId,
    name: originalName,
    tag,
    note: note || null,
    version: nextVersion,
    is_latest: true,
    file_path: path,
    file_url: fileUrl,
    mime_type: blob.type ?? null,
    size_bytes: buffer.length,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("opportunity_documents")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
