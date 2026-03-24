import { supabase } from "@/lib/supabase";

export async function requireUserId(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { userId: null, error: "Missing auth token." };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { userId: null, error: error?.message ?? "Unauthorized." };
  }

  return { userId: data.user.id, error: null };
}

export async function getPrimaryWorkspaceId(userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.workspace_id) {
    return { workspaceId: null, error: error?.message ?? "No workspace found." };
  }

  return { workspaceId: data.workspace_id as string, error: null };
}
