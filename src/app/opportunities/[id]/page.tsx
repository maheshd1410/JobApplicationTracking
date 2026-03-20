"use client";

import { useEffect, useState } from "react";

const tabs = [
  { key: "JD", label: "Job Description" },
  { key: "EMAIL", label: "Email" },
  { key: "LINKEDIN", label: "LinkedIn" },
  { key: "STUDY", label: "Study" },
  { key: "NOTES", label: "Notes" },
  { key: "DOCS", label: "Shared Documents" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  source: string | null;
  status: string;
};

type ContentItem = {
  id: string;
  type: TabKey;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type DocumentItem = {
  id: string;
  name: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

export default function OpportunityDetailPage() {
  const opportunityId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop() ?? ""
      : "";
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("JD");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docEditing, setDocEditing] = useState<DocumentItem | null>(null);

  const loadOpportunity = async () => {
    if (!opportunityId) return;
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load opportunity.");
      }
      setOpportunity(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  const loadContent = async (type: TabKey) => {
    if (!opportunityId) return;
    setLoading(true);
    setError(null);
    try {
      if (type === "DOCS") {
        const res = await fetch(`/api/opportunities/${opportunityId}/documents`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load documents.");
        }
        setDocuments(payload.data ?? []);
        return;
      }

      const res = await fetch(
        `/api/opportunities/${opportunityId}/content?type=${type}`,
        { cache: "no-store" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load content.");
      }
      setItems(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  useEffect(() => {
    loadContent(activeTab);
    setEditing(null);
    setForm({ title: "", content: "" });
    setDocEditing(null);
    setDocName("");
    setDocFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSave = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (activeTab === "DOCS") {
      setError("Use the document upload controls to add files.");
      return;
    }
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await fetch(
          `/api/opportunities/${opportunityId}/content/${editing.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.title,
              content: form.content,
            }),
          }
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to update content.");
        }
        setItems((prev) =>
          prev.map((item) => (item.id === editing.id ? payload.data : item))
        );
        setEditing(null);
        setForm({ title: "", content: "" });
      } else {
        const res = await fetch(`/api/opportunities/${opportunityId}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: activeTab,
            title: form.title,
            content: form.content,
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to create content.");
        }
        setItems((prev) => [payload.data, ...prev]);
        setForm({ title: "", content: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content });
  };

  const handleDelete = async (item: ContentItem) => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/content/${item.id}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete content.");
      }
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) {
        setEditing(null);
        setForm({ title: "", content: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (!docFile) {
      setError("Select a file to upload.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", docFile);
      data.append("name", docName.trim() ? docName.trim() : docFile.name);
      const res = await fetch(`/api/opportunities/${opportunityId}/documents`, {
        method: "POST",
        body: data,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to upload document.");
      }
      setDocuments((prev) => [payload.data, ...prev]);
      setDocFile(null);
      setDocName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentRename = async () => {
    if (!docEditing) return;
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/documents/${docEditing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: docName }),
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to rename document.");
      }
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docEditing.id ? payload.data : doc))
      );
      setDocEditing(null);
      setDocName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentDelete = async (doc: DocumentItem) => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/documents/${doc.id}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete document.");
      }
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
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
            Opportunity Workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {opportunity
              ? `${opportunity.company} - ${opportunity.title}`
              : "Loading..."}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span>Status: {opportunity?.status ?? "-"}</span>
            <span>Source: {opportunity?.source ?? "-"}</span>
            <span>Location: {opportunity?.location ?? "-"}</span>
            {opportunity?.url && (
              <a
                className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                href={opportunity.url}
                target="_blank"
                rel="noreferrer"
              >
                Open Link
              </a>
            )}
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] ${
                  activeTab === tab.key
                    ? "border-[var(--accent-2)] text-[var(--accent-2)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {activeTab === "DOCS" ? (
              <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">
                    {docEditing ? "Rename Document" : "Upload Document"}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Document name"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                    />
                    {!docEditing && (
                      <input
                        type="file"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={
                          docEditing ? handleDocumentRename : handleDocumentUpload
                        }
                        disabled={saving}
                      >
                        {saving ? "Saving..." : docEditing ? "Rename" : "Upload"}
                      </button>
                      {docEditing && (
                        <button
                          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                          onClick={() => {
                            setDocEditing(null);
                            setDocName("");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Shared Files</h2>
                  {loading && (
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                  )}
                  {!loading && !documents.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No documents uploaded yet.
                    </p>
                  )}
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">{doc.name}</h3>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            Updated {formatDate(doc.updated_at)}
                          </p>
                          {doc.file_url && (
                            <a
                              className="mt-2 inline-block text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={() => {
                              setDocEditing(doc);
                              setDocName(doc.name);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-red-500"
                            onClick={() => handleDocumentDelete(doc)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">
                    {editing ? "Edit Entry" : "New Entry"}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Title"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea
                      className="min-h-[180px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Write your notes, drafts, or study material here..."
                      value={form.content}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, content: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      {editing && (
                        <button
                          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                          onClick={() => {
                            setEditing(null);
                            setForm({ title: "", content: "" });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Saved Entries</h2>
                  {loading && (
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                  )}
                  {!loading && !items.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No entries yet for this section.
                    </p>
                  )}
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                            {item.content}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            Updated {formatDate(item.updated_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-red-500"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
