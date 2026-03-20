"use client";

import { useEffect, useMemo, useState } from "react";

type OpportunityStatus = "New" | "Shortlisted" | "Applied" | "Rejected";

type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  source: string | null;
  status: OpportunityStatus;
  match_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const statusOptions: OpportunityStatus[] = [
  "New",
  "Shortlisted",
  "Applied",
  "Rejected",
];

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", q: "" });
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    url: "",
    source: "",
    status: "New",
    match_score: "",
    notes: "",
  });

  const sourceOptions = useMemo(() => {
    const values = new Set<string>();
    items.forEach((item) => {
      if (item.source) values.add(item.source);
    });
    return Array.from(values).sort();
  }, [items]);

  const [sourceFilter, setSourceFilter] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const loadGmailStatus = async () => {
      try {
        const res = await fetch("/api/gmail/status", { cache: "no-store" });
        const payload = await res.json();
        if (res.ok) {
          setGmailConnected(Boolean(payload.connected));
          setGmailEmail(payload.email ?? null);
        }
      } catch {
        setGmailConnected(false);
      }
    };

    loadGmailStatus();
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.q) params.set("q", filters.q);
        if (sourceFilter) params.set("source", sourceFilter);

        const res = await fetch(`/api/opportunities?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load opportunities.");
        const payload = await res.json();
        if (!ignore) setItems(payload.data ?? []);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [filters, sourceFilter]);

  const handleGmailSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to sync Gmail.");
      }
      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        match_score: form.match_score ? Number(form.match_score) : null,
      };
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create opportunity.");
      }
      setForm({
        title: "",
        company: "",
        location: "",
        url: "",
        source: "",
        status: "New",
        match_score: "",
        notes: "",
      });
      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: OpportunityStatus) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update status.");
      }
      const updated = payload?.data as Opportunity;
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
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
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Opportunity Inbox
            </p>
            <h1 className="text-3xl font-semibold">Opportunities</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Capture roles from Naukri, LinkedIn, or Gmail alerts and review
              them before applying.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!gmailConnected && (
              <a
                className="rounded-full bg-[var(--accent-2)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                href="/api/google/connect"
              >
                Connect Gmail
              </a>
            )}
            {gmailConnected && (
              <button
                className="rounded-full border border-[var(--line)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
                onClick={handleGmailSync}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync Gmail"}
              </button>
            )}
            {gmailEmail && (
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Connected: {gmailEmail}
              </span>
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-6 md:grid-cols-2"
          >
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Role Title
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Company
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.company}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Location
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Source
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.source}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, source: e.target.value }))
                }
                placeholder="LinkedIn, Naukri"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Opportunity URL
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, url: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Status
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Match Score
              </label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.match_score}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, match_score: e.target.value }))
                }
                min="0"
                max="100"
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
                placeholder="Hiring manager, job description snippets"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                Required: Role Title, Company
              </p>
              <button
                className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Opportunity"}
              </button>
            </div>
          </form>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Inbox</h2>
              <p className="text-sm text-[var(--muted)]">
                {items.length} opportunities in view
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                onClick={() => setFilters({ status: "", q: "" })}
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="Search company or role"
              value={filters.q}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, q: e.target.value }))
              }
            />
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                <tr>
                  <th className="px-3">Company</th>
                  <th className="px-3">Role</th>
                  <th className="px-3">Workspace</th>
                  <th className="px-3">Status</th>
                  <th className="px-3">Source</th>
                  <th className="px-3">Score</th>
                  <th className="px-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--card)]"
                  >
                    <td className="px-3 py-3 font-medium">{item.company}</td>
                    <td className="px-3 py-3">{item.title}</td>
                    <td className="px-3 py-3">
                      <a
                        className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                        href={`/opportunities/${item.id}`}
                      >
                        Open
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-full border border-[var(--line)] bg-transparent px-3 py-1 text-xs"
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(
                            item.id,
                            e.target.value as OpportunityStatus
                          )
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">{item.source ?? "—"}</td>
                    <td className="px-3 py-3">{item.match_score ?? "—"}</td>
                    <td className="px-3 py-3">
                      {item.url ? (
                        <a
                          className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

