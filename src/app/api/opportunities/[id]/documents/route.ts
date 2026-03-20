import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Missing file." },
      { status: 400 }
    );
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

  const fileUrl = toPublicUrl(path);
  const now = new Date().toISOString();
  const payload = {
    opportunity_id: opportunityId,
    name: originalName,
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
