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

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("opportunity_documents")
    .update({ name, updated_at: new Date().toISOString() })
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
