"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabaseClient.auth.signInWithPassword(
          { email, password }
        );
        if (signInError) throw signInError;
      }

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12 text-[15px] md:px-10">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            Job Application Tracker
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {mode === "signup" ? "Create account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use your email and password to access your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : mode === "signup" ? "Sign up" : "Sign in"}
          </button>
        </form>

        <button
          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
          onClick={() =>
            setMode((prev) => (prev === "signup" ? "signin" : "signup"))
          }
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
