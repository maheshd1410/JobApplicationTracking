"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";

const categories = ["Execution", "Preparation", "Technical Hands On", "Admin"] as const;

type Task = {
  id: string;
  title: string;
  category: string;
  status: string;
  notes: string | null;
};

function toDateInput(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function TodosPage() {
  const today = useMemo(() => toDateInput(new Date()), []);
  const [date, setDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", category: "Execution" });

  const load = async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/todos?date=${target}`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load todos.");
      setTasks(payload.data?.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_date: date,
          title: form.title,
          category: form.category,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to add task.");
      setTasks((prev) => [...prev, payload.data]);
      setForm({ title: "", category: form.category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: Task) => {
    const nextStatus = task.status === "Done" ? "Pending" : "Done";
    setSaving(true);
    try {
      const res = await authFetch(`/api/todos/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to update task.");
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? payload.data : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/todos/${taskId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to delete task.");
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Done").length;
  const score = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen px-6 py-10 text-[15px] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            Daily To-Do
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Plan & Review</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <input
              type="date"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Completion: {done}/{total} ({score}%)
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleAdd}>
            <input
              className="flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              placeholder="Add a task"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
              >
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => handleToggle(task)}
                >
                  <span
                    className={`h-3 w-3 rounded-full border ${
                      task.status === "Done"
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "border-[var(--line)]"
                    }`}
                  />
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {task.category}
                  </span>
                </button>
                <button
                  className="text-xs uppercase tracking-[0.2em] text-red-500"
                  onClick={() => handleDelete(task.id)}
                >
                  Delete
                </button>
              </div>
            ))}
            {!loading && !tasks.length && (
              <div className="text-sm text-[var(--muted)]">
                No tasks yet for this day.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
