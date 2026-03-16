"use client";

import { useEffect, useMemo, useState } from "react";
import { Application, statusOptions } from "@/lib/types";

const dailyTarget = 20;

type Filters = {
  status: string;
  source: string;
  q: string;
  dateFrom: string;
  dateTo: string;
  followUpDue: boolean;
};

type FormState = {
  company: string;
  role_title: string;
  location: string;
  job_link: string;
  source: string;
  date_applied: string;
  status: string;
  follow_up_date: string;
  notes: string;
};

function toDateInput(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatShort(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLong(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

export default function Home() {
  const today = useMemo(() => toDateInput(new Date()), []);

  const [filters, setFilters] = useState<Filters>({
    status: "",
    source: "",
    q: "",
    dateFrom: "",
    dateTo: "",
    followUpDue: false,
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [followUps, setFollowUps] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState({ appliedToday: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [duplicate, setDuplicate] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>({
    company: "",
    role_title: "",
    location: "",
    job_link: "",
    source: "",
    date_applied: today,
    status: "Applied",
    follow_up_date: "",
    notes: "",
  });

  const autoFollowUp = useMemo(() => {
    if (!form.date_applied) return "";
    return addDays(form.date_applied, 7);
  }, [form.date_applied]);

  const sourceOptions = useMemo(() => {
    const values = new Set<string>();
    applications.forEach((item) => {
      if (item.source) values.add(item.source);
    });
    return Array.from(values).sort();
  }, [applications]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.source) params.set("source", filters.source);
        if (filters.q) params.set("q", filters.q);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.followUpDue) {
          params.set("followUpDue", "1");
          params.set("followUpDate", today);
        }

        const [listRes, followRes, metricsRes] = await Promise.all([
          fetch(`/api/applications?${params.toString()}`, {
            cache: "no-store",
          }),
          fetch(`/api/applications?followUpDue=1&followUpDate=${today}`, {
            cache: "no-store",
          }),
          fetch(`/api/metrics?date=${today}`, { cache: "no-store" }),
        ]);

        if (!listRes.ok || !followRes.ok || !metricsRes.ok) {
          throw new Error("Failed to load data.");
        }

        const listJson = await listRes.json();
        const followJson = await followRes.json();
        const metricsJson = await metricsRes.json();

        if (ignore) return;

        setApplications((listJson.data ?? []).filter(Boolean));
        setFollowUps((followJson.data ?? []).filter(Boolean));
        setMetrics({
          appliedToday: metricsJson.appliedToday ?? 0,
          total: metricsJson.total ?? 0,
        });
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
  }, [filters, today]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicate(null);

    try {
      const payload = {
        ...form,
        follow_up_date: form.follow_up_date || undefined,
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const payloadResponse = await res.json();

      if (res.status === 409) {
        setDuplicate(payloadResponse.existing ?? null);
        throw new Error(payloadResponse.error ?? "Possible duplicate found.");
      }

      if (!res.ok) {
        throw new Error(payloadResponse.error ?? "Failed to create application.");
      }

      setForm({
        company: "",
        role_title: "",
        location: "",
        job_link: "",
        source: "",
        date_applied: today,
        status: "Applied",
        follow_up_date: "",
        notes: "",
      });

      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleForceCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force: true }),
      });

      const payloadResponse = await res.json();

      if (!res.ok) {
        throw new Error(payloadResponse.error ?? "Failed to create application.");
      }

      setDuplicate(null);
      setForm({
        company: "",
        role_title: "",
        location: "",
        job_link: "",
        source: "",
        date_applied: today,
        status: "Applied",
        follow_up_date: "",
        notes: "",
      });

      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (!selected.id) {
      setError("No application id found for update.");
      return;
    }
    if (typeof selected.status === "string" && !selected.status.trim()) {
      setError("Status is required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });

      const payload = await res.json();

      if (!res.ok) {
        const message =
          payload?.error || "Failed to update application.";
        throw new Error(message);
      }

      const updated = payload?.data as Application | undefined;

      if (!updated?.id) {
        throw new Error("Update failed to return a record.");
      }

      setApplications((prev) =>
        prev
          .filter(Boolean)
          .map((item) => (item.id === updated.id ? updated : item))
      );
      setFollowUps((prev) => {
        const remaining = prev
          .filter(Boolean)
          .filter((item) => item.id !== updated.id);
        const isDue =
          updated.follow_up_date && updated.follow_up_date <= today;
        return isDue ? [updated, ...remaining] : remaining;
      });

      setSelected(null);
      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      source: "",
      q: "",
      dateFrom: "",
      dateTo: "",
      followUpDue: false,
    });
  };

  return (
    <div className="min-h-screen px-6 py-12 text-[15px] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-2)]">
                Daily Application Command Center
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                Job Application Tracker
              </h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">
                Track every application, keep your follow-ups tight, and hit your
                daily goal without the spreadsheet pain.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--line)] bg-white/70 p-4 backdrop-blur">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Today
              </span>
              <div className="text-3xl font-semibold">
                {metrics.appliedToday} / {dailyTarget}
              </div>
              <div className="text-xs text-[var(--muted)]">
                Total tracked: {metrics.total}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-6 md:grid-cols-2"
          >
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Company
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.company}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company: e.target.value }))
                }
                placeholder="Amazon, Atlassian"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Role Title
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.role_title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role_title: e.target.value }))
                }
                placeholder="Associate Director, Engineering"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Location
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Remote, Hyderabad"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Job Link
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.job_link}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, job_link: e.target.value }))
                }
                placeholder="https://company.com/jobs"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Source
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.source}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, source: e.target.value }))
                }
                placeholder="LinkedIn, Referral"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Date Applied
              </label>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.date_applied}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date_applied: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
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
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Follow-up Date
              </label>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.follow_up_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, follow_up_date: e.target.value }))
                }
                placeholder={autoFollowUp}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Auto suggestion: {autoFollowUp}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Notes
              </label>
              <textarea
                className="mt-2 min-h-[90px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Hiring manager, referral contact, interview details"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-[var(--muted)]">
                Required: Company, Role Title, Date Applied, Status
              </div>
              <button
                className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Application"}
              </button>
            </div>
          </form>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Pipeline</h2>
                <p className="text-sm text-[var(--muted)]">
                  {applications.length} applications in view
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)] hover:border-[var(--accent-2)]"
                  onClick={() =>
                    (window.location.href = "/api/applications/export")
                  }
                >
                  Export CSV
                </button>
                <button
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)] hover:border-[var(--accent-2)]"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                value={filters.source}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, source: e.target.value }))
                }
              >
                <option value="">All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
              />
              <input
                type="date"
                className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
              />
              <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={filters.followUpDue}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      followUpDue: e.target.checked,
                    }))
                  }
                />
                Follow-up due only
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {duplicate && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                A similar application already exists: {duplicate.company} —{" "}
                {duplicate.role_title}. You can still save this one if you want.
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-[var(--accent-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    onClick={handleForceCreate}
                    disabled={saving}
                  >
                    Save Anyway
                  </button>
                  <button
                    className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                    onClick={() => setDuplicate(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3 text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  <tr>
                    <th className="px-3">Company</th>
                    <th className="px-3">Role</th>
                    <th className="px-3">Applied</th>
                    <th className="px-3">Status</th>
                    <th className="px-3">Follow-up</th>
                    <th className="px-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm hover:shadow-md"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-3 py-3 font-medium">{item.company}</td>
                      <td className="px-3 py-3">{item.role_title}</td>
                      <td className="px-3 py-3">{formatShort(item.date_applied)}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {formatShort(item.follow_up_date)}
                      </td>
                      <td className="px-3 py-3">
                        {item.source ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {loading && (
                <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
              <h3 className="text-xl font-semibold">Follow-up Due</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {followUps.length} items need a check-in
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {followUps.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <div className="text-sm font-semibold">{item.company}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {item.role_title}
                    </div>
                    <div className="mt-2 text-xs text-[var(--accent-2)]">
                      Follow up by {formatLong(item.follow_up_date)}
                    </div>
                  </div>
                ))}
                {!followUps.length && (
                  <div className="text-sm text-[var(--muted)]">
                    Nothing due yet. Keep applying.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
              <h3 className="text-xl font-semibold">Quick Edit</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Click a row to update status or notes.
              </p>

              {selected ? (
                <div className="mt-4 flex flex-col gap-3 text-sm">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Company
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={selected.company}
                      onChange={(e) =>
                        setSelected({ ...selected, company: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Role Title
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={selected.role_title}
                      onChange={(e) =>
                        setSelected({ ...selected, role_title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Status
                    </label>
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          status: e.target.value as Application["status"],
                        })
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
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={selected.follow_up_date ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          follow_up_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Notes
                    </label>
                    <textarea
                      className="mt-2 min-h-[90px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={selected.notes ?? ""}
                      onChange={(e) =>
                        setSelected({ ...selected, notes: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-full bg-[var(--accent-2)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      onClick={handleUpdate}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                      onClick={() => setSelected(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-[var(--muted)]">
                  Select an application to edit status, follow-ups, and notes.
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
