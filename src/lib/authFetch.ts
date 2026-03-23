import { supabaseClient } from "@/lib/supabaseClient";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  const headers = new Headers(init.headers ?? {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
