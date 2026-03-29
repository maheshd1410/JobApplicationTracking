import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const bucketName = "study-screenshots";

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
    .from("study_assets")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
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
  const caption = String(formData.get("caption") ?? "").trim();

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const blob = file as Blob;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = blob.type === "image/png" ? "png" : "jpg";
  const filename = `study_${Date.now()}.${extension}`;
  const path = `${opportunityId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, { contentType: blob.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    owner_id: userId,
    opportunity_id: opportunityId,
    image_path: path,
    image_url: toPublicUrl(path),
    caption: caption || null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("study_assets")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
