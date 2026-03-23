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
