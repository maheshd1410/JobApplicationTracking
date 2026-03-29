import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";

const bucketName = "study-screenshots";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  const { userId, error: authError } = await requireUserId(request);
  if (authError || !userId) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const assetId = params?.assetId ?? fallbackId ?? "";

  if (!assetId) {
    return NextResponse.json({ error: "Missing asset id." }, { status: 400 });
  }

  const { data: asset, error: fetchError } = await supabase
    .from("study_assets")
    .select("image_path")
    .eq("id", assetId)
    .eq("owner_id", userId)
    .single();

  if (fetchError || !asset) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Asset not found." },
      { status: 404 }
    );
  }

  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([asset.image_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("study_assets")
    .delete()
    .eq("id", assetId)
    .eq("owner_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
