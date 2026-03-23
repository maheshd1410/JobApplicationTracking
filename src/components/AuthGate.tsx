"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!ignore) {
        setAuthed(Boolean(session));
        setReady(true);
      }
    };

    load();

    const { data: sub } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!ignore) setAuthed(Boolean(session));
      }
    );

    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen px-6 py-12 text-sm text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  if (!authed) {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/login") {
        return <>{children}</>;
      }
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}
