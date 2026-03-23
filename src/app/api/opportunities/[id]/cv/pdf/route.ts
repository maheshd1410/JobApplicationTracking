import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";
import { CvData, renderCvPdfBuffer } from "@/lib/cvTemplate";

const bucketName = "cv-pdfs";

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

  const { data: cvRow, error } = await supabase
    .from("opportunity_cvs")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !cvRow) {
    return NextResponse.json(
      { error: error?.message ?? "CV data not found." },
      { status: 404 }
    );
  }

  const cvData = (cvRow.data ?? {}) as CvData;

  const pdfBuffer = await renderCvPdfBuffer(cvData, cvRow.photo_url ?? null);
  const filePath = `${opportunityId}/${Date.now()}_cv.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const pdfUrl = toPublicUrl(filePath);
  const now = new Date().toISOString();

  const { data, error: updateError } = await supabase
    .from("opportunity_cvs")
    .update({ pdf_path: filePath, pdf_url: pdfUrl, updated_at: now })
    .eq("opportunity_id", opportunityId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (updateError || !data) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update CV row." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
