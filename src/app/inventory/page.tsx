"use client";

import { useEffect, useMemo, useState } from "react";

const decisionOptions = ["Pending", "Approved", "Rejected"] as const;

type InventoryItem = {
  id: string;
  decision: string;
  notes: string | null;
  opportunity: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    url: string | null;
    source: string | null;
    status: string | null;
  };
};

function toDateInput(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function InventoryPage() {
  const today = useMemo(() => toDateInput(new Date()), []);
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryId, setInventoryId] = useState<string | null>(null);

  const loadInventory = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory?date=${targetDate}`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load inventory.");
      }
      if (!payload.data) {
        setItems([]);
        setInventoryId(null);
        return;
      }
      setInventoryId(payload.data.inventory.id);
      setItems(payload.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const generateInventory = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory?date=${date}&limit=20`, {
        method: "POST",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to generate inventory.");
      }
      await loadInventory(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const updateDecision = async (itemId: string, decision: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update decision.");
      }
      const updated = payload.data as InventoryItem;
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
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            Daily Inventory
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Today&apos;s Plan</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Review the queue, approve what you want to apply for, and track
            decisions.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <input
              type="date"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white"
              onClick={generateInventory}
              disabled={saving}
            >
              {saving ? "Working..." : "Generate Inventory"}
            </button>
            {inventoryId && (
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Inventory ID: {inventoryId.slice(0, 8)}
              </span>
            )}
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Queue</h2>
              <p className="text-sm text-[var(--muted)]">
                {items.length} opportunities loaded
              </p>
            </div>
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
                  <th className="px-3">Decision</th>
                  <th className="px-3">Source</th>
                  <th className="px-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--card)]"
                  >
                    <td className="px-3 py-3 font-medium">
                      {item.opportunity.company}
                    </td>
                    <td className="px-3 py-3">{item.opportunity.title}</td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-full border border-[var(--line)] bg-transparent px-3 py-1 text-xs"
                        value={item.decision}
                        onChange={(e) =>
                          updateDecision(item.id, e.target.value)
                        }
                      >
                        {decisionOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">{item.opportunity.source ?? "—"}</td>
                    <td className="px-3 py-3">
                      {item.opportunity.url ? (
                        <a
                          className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                          href={item.opportunity.url}
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
            {!loading && !items.length && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No inventory yet for this date. Click Generate Inventory.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
