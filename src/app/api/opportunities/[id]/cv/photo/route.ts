import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const bucketName = "cv-photos";

function getOpportunityId(request: Request, paramsId?: string) {
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").slice(-3)[0];
  return paramsId ?? fallbackId ?? "";
}

function toPublicUrl(path: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucketName}/${path}`;
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
  const opportunityId = getOpportunityId(request, params?.id);

  if (!opportunityId) {
    return NextResponse.json(
      { error: "Missing opportunity id." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const blob = file as Blob;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = "photo";
  const path = `${opportunityId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, { contentType: blob.type, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const fileUrl = toPublicUrl(path);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("opportunity_cvs")
    .upsert(
      {
        owner_id: userId,
        opportunity_id: opportunityId,
        photo_path: path,
        photo_url: fileUrl,
        updated_at: now,
      },
      { onConflict: "opportunity_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
