"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";

const dailyTarget = 20;

type Filters = {
  status: string;
  source: string;
  q: string;
};

type WeeklyPoint = {
  weekStart: string;
  count: number;
  applied: number;
  inQueue: number;
};
type StatusPoint = { status: string; count: number };
type OpportunityEvent = {
  id: string;
  opportunity_id: string;
  status: OpportunityStatus;
  event_type: string;
  created_at: string;
};

type OpportunityStatus = "New" | "Shortlisted" | "Applied" | "Rejected";

type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  source: string | null;
  status: OpportunityStatus;
  match_score_actual: number | null;
  match_score_resume: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const opportunityStatusOptions: OpportunityStatus[] = [
  "New",
  "Shortlisted",
  "Applied",
  "Rejected",
];

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

function formatWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function toDateKey(date: Date) {
  return toDateInput(date);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return start;
}

function statusColor(status: string) {
  switch (status) {
    case "Applied":
      return "bg-[var(--accent)]";
    case "New":
      return "bg-[var(--accent-2)]";
    case "Shortlisted":
      return "bg-emerald-500";
    case "Rejected":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function statusAbbrev(status: string) {
  switch (status) {
    case "Applied":
      return "A";
    case "New":
      return "N";
    case "Shortlisted":
      return "S";
    case "Rejected":
      return "R";
    default:
      return status.slice(0, 1).toUpperCase();
  }
}

export default function Home() {
  const today = useMemo(() => toDateInput(new Date()), []);

  const [filters, setFilters] = useState<Filters>({
    status: "",
    source: "",
    q: "",
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [newOpportunities, setNewOpportunities] = useState<Opportunity[]>([]);
  const [appliedOpportunities, setAppliedOpportunities] = useState<Opportunity[]>(
    []
  );
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusPoint[]>([]);
  const [metrics, setMetrics] = useState({ appliedToday: 0, total: 0 });
  const [events, setEvents] = useState<OpportunityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const sourceOptions = useMemo(() => {
    const values = new Set<string>();
    opportunities.forEach((item) => {
      if (item.source) values.add(item.source);
    });
    return Array.from(values).sort();
  }, [opportunities]);

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
        const [listRes, analyticsRes, metricsRes] = await Promise.all([
          authFetch(`/api/opportunities?${params.toString()}`, {
            cache: "no-store",
          }),
          authFetch(`/api/analytics/weekly`, { cache: "no-store" }),
          authFetch(`/api/metrics?date=${today}`, { cache: "no-store" }),
        ]);

        if (!listRes.ok || !analyticsRes.ok || !metricsRes.ok) {
          throw new Error("Failed to load data.");
        }

        const listJson = await listRes.json();
        const analyticsJson = await analyticsRes.json();
        const metricsJson = await metricsRes.json();

        if (ignore) return;

        const list = (listJson.data ?? []).filter(Boolean) as Opportunity[];
        setOpportunities(list);
        setNewOpportunities(list.filter((item) => item.status === "New"));
        setAppliedOpportunities(list.filter((item) => item.status === "Applied"));
        setWeekly((analyticsJson.weeks ?? []).filter(Boolean));
        setStatusBreakdown((analyticsJson.status ?? []).filter(Boolean));
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

  useEffect(() => {
    let ignore = false;
    const loadEvents = async () => {
      try {
        const start = startOfWeek(startOfMonth(calendarMonth));
        const end = endOfMonth(calendarMonth);
        const from = toDateKey(start);
        const to = toDateKey(end);
        const res = await authFetch(
          `/api/opportunities/events?from=${from}&to=${to}`,
          { cache: "no-store" }
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load events.");
        }
        if (!ignore) {
          setEvents((payload.data ?? []) as OpportunityEvent[]);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      }
    };

    loadEvents();

    return () => {
      ignore = true;
    };
  }, [calendarMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.status,
    filters.source,
    filters.q,
  ]);

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(opportunities.length / pageSize), 1);
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [opportunities.length, currentPage]);

  const handleInlineStatusChange = async (id: string, status: OpportunityStatus) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update status.");
      }
      const updated = payload?.data as Opportunity | undefined;
      if (!updated?.id) {
        throw new Error("Update failed to return a record.");
      }
      setOpportunities((prev) =>
        prev
          .filter(Boolean)
          .map((item) => (item.id === updated.id ? updated : item))
      );
      setNewOpportunities((prev) => {
        const remaining = prev
          .filter(Boolean)
          .filter((item) => item.id !== updated.id);
        return updated.status === "New" ? [updated, ...remaining] : remaining;
      });
      setAppliedOpportunities((prev) => {
        const remaining = prev
          .filter(Boolean)
          .filter((item) => item.id !== updated.id);
        return updated.status === "Applied"
          ? [updated, ...remaining]
          : remaining;
      });
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
    });
  };

  const totalPages = Math.max(Math.ceil(opportunities.length / pageSize), 1);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedOpportunities = opportunities.slice(pageStart, pageEnd);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfMonth(calendarMonth);
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end || cursor.getDay() !== 0) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [calendarMonth]);

  const calendarCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    events.forEach((event) => {
      const status = event.status ?? "Unknown";
      const key = event.created_at.slice(0, 10);
      if (!counts[key]) counts[key] = {};
      counts[key][status] = (counts[key][status] ?? 0) + 1;
    });
    return counts;
  }, [events]);

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
                Track every opportunity, keep your pipeline tight, and hit your
                daily goal without the spreadsheet pain.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--line)] bg-white/70 p-4 backdrop-blur">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Opportunities Added Today
              </span>
              <div className="text-3xl font-semibold">
                {metrics.appliedToday} / {dailyTarget}
              </div>
              <div className="text-xs text-[var(--muted)]">
                Total opportunities: {metrics.total}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-6 py-4 text-sm text-[var(--muted)]">
            <span>
              Data entry now lives in the Opportunities page to keep this dashboard focused.
            </span>
            <a
              className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
              href="/opportunities"
            >
              Go to Opportunities
            </a>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Pipeline</h2>
                <p className="text-sm text-[var(--muted)]">
                  {opportunities.length} opportunities in view
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
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
                {opportunityStatusOptions.map((status) => (
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
                    <th className="px-3">Status</th>
                    <th className="px-3">Source</th>
                    <th className="px-3">Actual</th>
                    <th className="px-3">Resume</th>
                    <th className="px-3">Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOpportunities.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm hover:shadow-md"
                    >
                      <td className="px-3 py-3 font-medium">{item.company}</td>
                      <td className="px-3 py-3">{item.title}</td>
                      <td className="px-3 py-3">
                        <select
                          className="rounded-full border border-[var(--line)] bg-transparent px-3 py-1 text-xs"
                          value={item.status}
                          onChange={(event) => {
                            handleInlineStatusChange(
                              item.id,
                              event.target.value as OpportunityStatus
                            );
                          }}
                        >
                          {opportunityStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">{item.source ?? "—"}</td>
                      <td className="px-3 py-3">
                        {item.match_score_actual ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {item.match_score_resume ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <a
                          className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                          href={`/opportunities/${item.id}`}
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                <span>
                  Showing {opportunities.length ? pageStart + 1 : 0}-
                  {Math.min(pageEnd, opportunities.length)} of {opportunities.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              {loading && (
                <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
              )}
            </div>

            <div className="mt-8 rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">Application Calendar</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Status activity is grouped by the opportunity created date.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  <button
                    className="rounded-full border border-[var(--line)] px-3 py-1"
                    onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
                  >
                    Prev
                  </button>
                  <span>
                    {calendarMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    className="rounded-full border border-[var(--line)] px-3 py-1"
                    onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {["New", "Shortlisted", "Applied", "Rejected"].map((status) => (
                  <span key={status} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColor(status)}`} />
                    {statusAbbrev(status)} = {status}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="px-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const key = toDateKey(day);
                  const counts = calendarCounts[key] ?? {};
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
                  const topStatuses = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                  return (
                    <div
                      key={key}
                      className={`min-h-[88px] rounded-2xl border border-[var(--line)] p-2 text-xs overflow-hidden ${
                        isCurrentMonth ? "bg-white" : "bg-white/50 text-[var(--muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">{day.getDate()}</span>
                        {total > 0 && (
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                            {total}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {topStatuses.map(([status, count]) => (
                          <div
                            key={status}
                            className="flex min-w-0 items-center gap-2"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${statusColor(status)}`}
                            />
                            <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">
                              {statusAbbrev(status)}
                            </span>
                            <span className="ml-auto text-[9px] text-[var(--muted)]">
                              {count}
                            </span>
                          </div>
                        ))}
                        {!topStatuses.length && (
                          <span className="text-[10px] text-[var(--muted)]">
                            No activity
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
              <h3 className="text-xl font-semibold">Weekly Activity</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Last 8 weeks of activity
              </p>
              <div className="mt-5 flex items-end gap-3">
                {weekly.map((point) => {
                  const max = Math.max(...weekly.map((p) => p.count), 1);
                  const appliedHeight = Math.max(
                    (point.applied / max) * 140,
                    0
                  );
                  const queueHeight = Math.max(
                    (point.inQueue / max) * 140,
                    0
                  );
                  return (
                    <div key={point.weekStart} className="flex flex-col items-center gap-2">
                      <div className="flex h-[140px] w-6 flex-col justify-end rounded-full border border-[var(--line)] overflow-hidden">
                        <div
                          className="w-full bg-[var(--accent-2)]"
                          style={{ height: queueHeight }}
                          title={`${point.inQueue} in queue`}
                        />
                        <div
                          className="w-full bg-[var(--accent)]"
                          style={{ height: appliedHeight }}
                          title={`${point.applied} applied`}
                        />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        {formatWeekLabel(point.weekStart)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  Applied
                </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-2)]" />
                    New
                  </span>
              </div>
              <div className="mt-6 grid gap-2 text-xs text-[var(--muted)]">
                {statusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="uppercase tracking-[0.2em]">{item.status}</span>
                    <span className="font-semibold text-[var(--ink)]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">New Opportunities</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {newOpportunities.length} items to review
                  </p>
                </div>
                <button
                  className="rounded-full border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)] hover:border-[var(--accent-2)]"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      status: "New",
                    }))
                  }
                >
                  View All
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {newOpportunities.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <div className="text-sm font-semibold">{item.company}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {item.title}
                    </div>
                  </div>
                ))}
                {!newOpportunities.length && (
                  <div className="text-sm text-[var(--muted)]">
                    No new opportunities yet.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
              <h3 className="text-xl font-semibold">Applied Opportunities</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {appliedOpportunities.length} items submitted
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {appliedOpportunities.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <div className="text-sm font-semibold">{item.company}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {item.title}
                    </div>
                  </div>
                ))}
                {!appliedOpportunities.length && (
                  <div className="text-sm text-[var(--muted)]">
                    No applied opportunities yet.
                  </div>
                )}
              </div>
            </div>

          </aside>
        </section>
      </div>
    </div>
  );
}

