"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!ignore) {
        setEmail(session?.user?.email ?? null);
      }
    };
    load();

    const { data: sub } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!ignore) {
          setEmail(session?.user?.email ?? null);
        }
      }
    );

    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  if (!email) return null;

  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
      <span>{email}</span>
      <button
        className="rounded-full border border-[var(--line)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}
