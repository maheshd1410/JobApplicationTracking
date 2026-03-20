import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; contentId: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const fallbackContentId = url.pathname.split("/").pop();
  const contentId = params?.contentId ?? fallbackContentId ?? "";

  if (!contentId) {
    return NextResponse.json(
      { error: "Missing content id." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updates.title = String(body.title).trim();
  }
  if (body.content !== undefined) {
    updates.content = String(body.content).trim();
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { error: "No updates provided." },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("opportunity_content")
    .update(updates)
    .eq("id", contentId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Content not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; contentId: string }> }
) {
  const params = await context.params;
  const url = new URL(_request.url);
  const fallbackContentId = url.pathname.split("/").pop();
  const contentId = params?.contentId ?? fallbackContentId ?? "";

  if (!contentId) {
    return NextResponse.json(
      { error: "Missing content id." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("opportunity_content")
    .delete()
    .eq("id", contentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
