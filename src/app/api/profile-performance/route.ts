import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const bucketName = "naukri-screenshots";

function toPublicUrl(path: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucketName}/${path}`;
}

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profile_performance")
    .select("*")
    .eq("owner_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const formData = await request.formData();

  const entryDate = String(formData.get("entry_date") ?? "").trim();
  const impressionsRaw = String(formData.get("impressions") ?? "").trim();
  const searchesRaw = String(formData.get("searches") ?? "").trim();
  const recruiterRaw = String(formData.get("recruiter_actions") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const file = formData.get("screenshot");

  if (!entryDate) {
    return NextResponse.json(
      { error: "Entry date is required." },
      { status: 400 }
    );
  }

  let screenshotPath: string | null = null;
  let screenshotUrl: string | null = null;

  if (file && typeof file !== "string") {
    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = blob.type === "image/png" ? "png" : "jpg";
    const filename = `naukri_${entryDate}_${Date.now()}.${extension}`;
    const path = `${userId}/${entryDate}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, buffer, { contentType: blob.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    screenshotPath = path;
    screenshotUrl = toPublicUrl(path);
  }

  const payload = {
    owner_id: userId,
    entry_date: entryDate,
    impressions: impressionsRaw ? Number(impressionsRaw) : null,
    searches: searchesRaw ? Number(searchesRaw) : null,
    recruiter_actions: recruiterRaw ? Number(recruiterRaw) : null,
    notes: notes || null,
    screenshot_path: screenshotPath,
    screenshot_url: screenshotUrl,
  };

  const { data, error } = await supabase
    .from("profile_performance")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
