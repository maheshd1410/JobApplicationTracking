"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";

type PerformanceEntry = {
  id: string;
  entry_date: string;
  impressions: number | null;
  searches: number | null;
  recruiter_actions: number | null;
  notes: string | null;
  screenshot_url: string | null;
  created_at: string;
};

function toDateInput(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function PerformancePage() {
  const today = useMemo(() => toDateInput(new Date()), []);
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    entry_date: today,
    impressions: "",
    searches: "",
    recruiter_actions: "",
    notes: "",
    screenshot: null as File | null,
  });

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/profile-performance", {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load entries.");
      }
      setEntries(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("entry_date", form.entry_date);
      data.append("impressions", form.impressions);
      data.append("searches", form.searches);
      data.append("recruiter_actions", form.recruiter_actions);
      data.append("notes", form.notes);
      if (form.screenshot) {
        data.append("screenshot", form.screenshot);
      }

      const res = await authFetch("/api/profile-performance", {
        method: "POST",
        body: data,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to save entry.");
      }

      setForm({
        entry_date: today,
        impressions: "",
        searches: "",
        recruiter_actions: "",
        notes: "",
        screenshot: null,
      });

      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 text-[15px] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            Naukri Profile Performance
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Daily Snapshot</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Paste your daily metrics and upload the screenshot for comparison.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-6 md:grid-cols-2"
          >
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Date
              </label>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.entry_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, entry_date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Search Appearances
              </label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.searches}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, searches: e.target.value }))
                }
                min="0"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Recruiter Actions
              </label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.recruiter_actions}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    recruiter_actions: e.target.value,
                  }))
                }
                min="0"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Profile Impressions
              </label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.impressions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, impressions: e.target.value }))
                }
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Notes
              </label>
              <textarea
                className="mt-2 min-h-[90px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Observations, changes, recruiter feedback"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    screenshot: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                Screenshot is optional, but recommended for comparison.
              </p>
              <button
                className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Snapshot"}
              </button>
            </div>
          </form>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">History</h2>
              <p className="text-sm text-[var(--muted)]">
                {entries.length} snapshots recorded
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:flex md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                    {entry.entry_date}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>Search Appearances: {entry.searches ?? "—"}</span>
                    <span>Recruiter Actions: {entry.recruiter_actions ?? "—"}</span>
                    <span>Impressions: {entry.impressions ?? "—"}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-[var(--muted)]">{entry.notes}</p>
                  )}
                </div>
                {entry.screenshot_url && (
                  <div className="mt-4 md:mt-0 md:ml-4">
                    <img
                      src={entry.screenshot_url}
                      alt="Naukri screenshot"
                      className="h-28 w-44 rounded-xl object-cover border border-[var(--line)]"
                    />
                  </div>
                )}
              </div>
            ))}
            {!loading && !entries.length && (
              <p className="text-sm text-[var(--muted)]">
                No snapshots yet. Add your first one above.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
