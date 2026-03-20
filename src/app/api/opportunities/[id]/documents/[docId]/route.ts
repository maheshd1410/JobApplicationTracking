import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const bucketName = "opportunity-documents";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const docId = params?.docId ?? fallbackId ?? "";

  if (!docId) {
    return NextResponse.json({ error: "Missing document id." }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const note = String(body.note ?? "").trim();
  const tag = body.tag ? String(body.tag).trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("opportunity_documents")
    .select("id, opportunity_id, tag, version")
    .eq("id", docId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Document not found." },
      { status: 404 }
    );
  }

  const newTag = tag || existing.tag;
  let nextVersion = existing.version;
  let nextIsLatest = true;

  if (newTag !== existing.tag) {
    const { data: versionRow } = await supabase
      .from("opportunity_documents")
      .select("version")
      .eq("opportunity_id", existing.opportunity_id)
      .eq("tag", newTag)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    nextVersion = (versionRow?.version ?? 0) + 1;

    await supabase
      .from("opportunity_documents")
      .update({ is_latest: false })
      .eq("opportunity_id", existing.opportunity_id)
      .eq("tag", newTag);

    await supabase
      .from("opportunity_documents")
      .update({ is_latest: false })
      .eq("opportunity_id", existing.opportunity_id)
      .eq("tag", existing.tag);

    const { data: previousLatest } = await supabase
      .from("opportunity_documents")
      .select("id")
      .eq("opportunity_id", existing.opportunity_id)
      .eq("tag", existing.tag)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousLatest?.id) {
      await supabase
        .from("opportunity_documents")
        .update({ is_latest: true })
        .eq("id", previousLatest.id);
    }

    nextIsLatest = true;
  }

  const { data, error } = await supabase
    .from("opportunity_documents")
    .update({
      name,
      note: note || null,
      tag: newTag,
      version: nextVersion,
      is_latest: nextIsLatest,
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Document not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackId = url.pathname.split("/").pop();
  const docId = params?.docId ?? fallbackId ?? "";

  if (!docId) {
    return NextResponse.json({ error: "Missing document id." }, { status: 400 });
  }

  const { data: doc, error: fetchError } = await supabase
    .from("opportunity_documents")
    .select("file_path")
    .eq("id", docId)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Document not found." },
      { status: 404 }
    );
  }

  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([doc.file_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("opportunity_documents")
    .delete()
    .eq("id", docId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
