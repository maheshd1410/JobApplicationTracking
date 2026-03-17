import { NextResponse } from "next/server";
import { getOAuthClient, gmailScopes } from "@/lib/google";

export async function GET() {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: gmailScopes,
  });

  return NextResponse.redirect(url);
}
